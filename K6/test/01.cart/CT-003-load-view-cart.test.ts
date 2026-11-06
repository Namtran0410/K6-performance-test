import http from "k6/http"
import { Options } from "k6/options"
import exec, {test} from "k6/execution"
import encoding from "k6/encoding"
import {check, sleep} from "k6"

const base_url='https://api.demoblaze.com'
const VUS = 10
const PRODS = [1, 2, 8, 10, 1]
type Account = {
    username: string,
    password: string
}

export const options: Options = {
    scenarios: {
        "load-test-view-cart": {
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: 10},
                {duration: "3m", target: 10},
                {duration: "1m", target: 0}
            ]
        }
    },
    thresholds: {
        "http_req_duration{name:view-cart}": ["p(95)<1200"],
        "http_req_failed{name:view-cart}": ["rate<0.01"],
        "checks": ["rate>0.99"],
    }
}

function createAccount(i: number):Account {
    const username = `CT-003-${Date.now()}-${i}`
    const password = encoding.b64encode("Password@1")
    const payload = JSON.stringify({username, password})
    const res=http.post(`${base_url}/signup`, payload,{
        headers: {"Content-type":"application/json"},
        tags: {name: "signup"}
    })
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Create account failed: ${res.status}: ${res.body}`)
    }
    return {username, password}
}

function login(account: Account) {
    const payload = JSON.stringify(account)
    const res = http.post(`${base_url}/login`, payload,{
        headers: {"Content-type": "application/json"},
        tags: {name: "login"}
    })

    if(res.status !== 200 || String(res.body).includes("errorMessage")){
        test.abort(`Login Failed: ${res.status}: ${res.body}`)
    }
    const cookie = String(res.json()).replace("Auth_token: ", "")
    
    return cookie
}

function randomProdId(): number {
    
    return PRODS[Math.floor(Math.random() * PRODS.length)]
}

function addToCart(cookie: string){
    const line = crypto.randomUUID()
    const payload = JSON.stringify({
        id: line,
        cookie,
        prod_id: randomProdId(),
        flag: true
    })

    const res = http.post(`${base_url}/addtocart`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "add-to-cart"}
    })

    return res
}

function addMultipleItemsToCart(cartLength: number, cookie: string){
    for(let item =0; item < cartLength; item ++) {
        addToCart(cookie)
    }

}
export function setup(): string[]{
    const tokens: string[] = []
    for(let i = 0; i < VUS; i++){
        const token = login(createAccount(i))
        addMultipleItemsToCart(PRODS.length, token)   // seed 1 lần ở đây
        tokens.push(token)
    }
    return tokens
}


function viewCart(cookie: string){
    const payload = JSON.stringify({
        cookie,
        flag: true
    })
    const res= http.post(`${base_url}/viewcart`,payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "view-cart"}
    })    
    const data = {
        status: res.status,
        body: res.json("Items.#.id") as string[]
    }
    return data
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

export default function(tokens: string[]){
    const token = tokens[(exec.vu.idInTest - 1) % tokens.length]

    const res = viewCart(token)
    check(res, {
        "response-code-ok": (r) => r.status == 200,
        "length-value-ok": (r)=> r.body.length == 5
    },
    {name: "view-cart"}
    )
    sleep(1)
}


export function teardown(tokens: string[]){
    for (const token of tokens) {
        for (const id of viewCart(token).body) {
            deleteItems(id)
        }
    }
}