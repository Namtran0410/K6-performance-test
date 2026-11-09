import http from "k6/http"
import { Options } from "k6/options"
import {check, sleep}from "k6"
import exec, {test} from "k6/execution"

const base_url="https://api.demoblaze.com"
const prod_id = 1
export const options: Options={
    scenarios: {
        "CT-008": {
            executor: "shared-iterations",
            vus: 10,
            iterations: 50
        }
    },
    thresholds: {
        "http_req_duration{name:add-to-cart}": ["p(95)<1200"],
        "http_req_failed": ["rate<0.01"],
        "checks": ["rate>0.99"],

    }
}
type Data = {
    cookie: string,
    idCart: string
}
export function setup(){
    const cookie = crypto.randomUUID()
    const idCart = crypto.randomUUID()
    const data= {
        cookie, 
        idCart
    }
    return data
}



export default function(data: Data){
    const payload = JSON.stringify({
        id: crypto.randomUUID(),
        cookie: data.cookie,
        prod_id,
        flag: false
    })
    const res = http.post(`${base_url}/addtocart`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "add-to-cart"}
    })

    check(res, {
        "status-ok": (r)=> r.status == 200
    })


}

function viewCart(cookie: string){
    const payload = JSON.stringify({
        cookie,
        flag: false
    })
    const res= http.post(`${base_url}/viewcart`,payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "view-cart"}
    })    
    if(res.status !== 200 || String(res.body).includes("errorMessage")){
        test.abort(`Add Failed: ${res.status}" ${res.body}`)
    }
    return res.json("Items.#.id") as string[]
}

function deleteItems(id: string){
    const payload = JSON.stringify({
        id
    })

    const res = http.post(`${base_url}/deleteitem`, payload,{
        headers: {"Content-type": "application/json"},
        tags: {name: "deleteItems"}
    })
}


export function teardown(data: Data){
    const idList = viewCart(data.cookie)
    check(idList, {
        "50-item": (r)=> r.length == 50,
        "unique-item": (r)=> new Set(r).size == 50
    }
    )
    for (const id of idList) {
        deleteItems(id)
    }
}