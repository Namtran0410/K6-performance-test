import http from "k6/http"
import { Options } from "k6/options"
import exec, {test} from "k6/execution"
import encoding from "k6/encoding"
import {check, sleep} from "k6"
import {Trend} from "k6/metrics"

type Account = {
    username: string,
    password: string
}

type deletedItemInfor = {
    token: string,
    idLine: string
}
const base_url='https://api.demoblaze.com'
const maxVus = 10

// setup function
function createTokenLogin(){
    return crypto.randomUUID()
}


function addToCart(cookie: string){
    const prod_id = 1
    
    const payload = JSON.stringify({
        id: crypto.randomUUID(),
        cookie,
        prod_id,
        flag: true
    })
    const res= http.post(`${base_url}/addtocart`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "add-to-cart"}
    })

}

function viewCart(cookie: string){
    const payload = JSON.stringify({cookie, flag: true})
    const res = http.post(`${base_url}/viewcart`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "view-cart"}
    })
    const idLine = res.json("Items.0.id") as string
    return idLine
}

function deleteItem(idLine: string){
    const res = http.post(`${base_url}/deleteitem`, JSON.stringify({id: idLine}), {
        headers: {"Content-type": "application/json"},
        tags: {name: "deleteItems"}
    })
    return res
}


// Execution function
export function setup(){
    let tokenList: string[]= []

    for(let i = 0; i < maxVus; i++) {
        let token = createTokenLogin()
        tokenList.push(token)
    }
    return tokenList
}

export const options: Options = {
    scenarios: {
        "delete-item": {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                {duration: "1m", target: 10},
                {duration: "3m", target: 10},
                {duration: "1m", target: 0},
            ]
        }
    },
    thresholds: {
        "http_req_duration{name:deleteItems}": ["p(95)<1200"],
        "http_req_failed{name:deleteItems}":["rate<0.01"],
        "checks": ["rate>0.99"]
    }
}

export default function(tokenList: string[]){
    // mỗi VU lấy đúng 1 token của mình (idInTest bắt đầu từ 1)
    const token = tokenList[(exec.vu.idInTest - 1) % tokenList.length]

    // 1. add 1 item (bước chuẩn bị, tag add-to-cart nên không tính vào threshold deleteItems)
    addToCart(token)

    // 2. lấy id dòng vừa add - giỏ chỉ có đúng 1 dòng
    const idLine = viewCart(token)

    // 3. delete dòng đó - đây là request được đo
    const res = deleteItem(idLine)
    check(res, {
        "status-ok": (r) => r.status == 200,
    }, {name: "deleteItems"})

    sleep(1)
}
