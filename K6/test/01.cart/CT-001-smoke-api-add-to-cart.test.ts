import http from "k6/http"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"
import {check, sleep} from "k6"
import encoding from "k6/encoding"
const base_url='https://api.demoblaze.com'

type Account = {
    username: string,
    password: string
}

export const options: Options = {
    scenarios: {
        "smoke-add-to-cart": {
            executor: "constant-vus",
            vus: 1,
            duration: "1m"
        }
    },
    thresholds: {
        "http_req_duration{name:add-to-cart}": [
            {
                threshold: "p(95)<1200",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ],
        "http_req_failed{name:add-to-cart}":["rate<0.01"],
        "checks": ["rate>0.99"]
    }
}

function createAccount():Account {
    const username = `CT-001-${Date.now()}`
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

function addToCart(cookie: string){
    const line = crypto.randomUUID()
    const payload = JSON.stringify({
        id: line,
        cookie,
        prod_id: 1,
        flag: true
    })

    const res = http.post(`${base_url}/addtocart`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "add-to-cart"}
    })

    return res
}
type cookie = string
export function setup(): cookie{
    const account = createAccount()
    return login(account)

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

export default function(cookie: string){
    const res = addToCart(cookie)

    check(res, 
        {
            "status-ok": (r)=> r.status == 200,
        }, 
        {name: "add-to-cart"}
    )
    sleep(1)
} 

export function teardown(cookie: string){
    for (const id of viewCart(cookie)) {
        deleteItems(id)
    }
}