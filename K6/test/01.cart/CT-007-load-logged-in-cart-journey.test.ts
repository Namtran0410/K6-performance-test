import http from "k6/http"
import { Options } from "k6/options" 
import {check, sleep } from "k6"
import {Trend} from "k6/metrics"
import exec, {test}from "k6/execution"
import encoding from "k6/encoding"


//declaration
const base_url="https://api.demoblaze.com"
const maxVus=10
const prod_id = 2
const cartJourneyDuration = new Trend("cart_journey_duration", true)

type Account= {
    username: string,
    password: string
}


// utils function
function signup(){
    const account: Account = {
        username: `CT-007-${Date.now()}`,
        password: encoding.b64encode("Password@123")
    }
    const payload = JSON.stringify(account)
    const res = http.post(`${base_url}/signup`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "signup"}
    })
    // signup lỗi (vd trùng username) vẫn trả 200 nhưng body có errorMessage
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Signup failed: ${res.status}: ${res.body}`)
    }
    return {res, account}
}

function login(account: Account){
    const payload = JSON.stringify(account)
    const res = http.post(`${base_url}/login`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "login"}
    })
    // login thành công trả về "Auth_token: <token>", sai mật khẩu thì có errorMessage
    if(res.status !== 200 || !String(res.body).includes("Auth_token")) {
        test.abort(`Login failed: ${res.status}: ${res.body}`)
    }
    return {res, account}
}

function addToCart(cookie: string){
    const payload = JSON.stringify({
        id: crypto.randomUUID(),
        cookie,
        prod_id,
        flag: true
    })
    const res = http.post(`${base_url}/addtocart`,payload,
        {
            headers: {"Content-type": "application/json"},
            tags:{name: "add-to-cart"}
        }
    )
    return res
}

function viewCart(cookie: string){
    const payload = JSON.stringify({cookie, flag: true})
    const res = http.post(`${base_url}/viewcart`, payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "view-cart"}
        }
    )
    const idLine = res.json("Items.0.id") as string
    return {res, idLine}
}

function deleteItem(idLine: string) {
    const payload = JSON.stringify({
        id: idLine
    })
    const res = http.post(`${base_url}/deleteitem`, payload, 
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "delete-item"}
        }
    )
    return res
}
// execution function
export const options: Options = {
    scenarios: {
        "load-logged-in-cart" :{
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: 10}, 
                {duration: "3m", target: 10}, 
                {duration: "1m", target: 0}
            ]
        }
    }, 
    thresholds: {
        "http_req_duration{name:add-to-cart}": ["p(95)<1200"],
        "http_req_duration{name:view-cart}": ["p(95)<1200"],
        "http_req_duration{name:delete-item}": ["p(95)<1200"],
        "cart_journey_duration": ["p(95)<6000"],
        "http_req_failed": ["rate<0.01"],
        "checks": ["rate>0.99"],
    }
}

export function setup(): string[]{
    // create 10 accounts
    let cookieList: string[] = []
    for(let i = 0; i < maxVus; i ++) {
        const {account} = signup()
        const {res: LoginSuccess}= login(account)
        const cookie = String(LoginSuccess.json()).replace("Auth_token: ", "")
        cookieList.push(cookie)
    }
    return cookieList
    
}

export default function(cookieList: string[]){
    const cookie = cookieList[(exec.vu.idInTest - 1) % cookieList.length]
    const addToCartRes = addToCart(cookie)
    const viewCartRes = viewCart(cookie)
    const deleteItemRes = deleteItem(viewCartRes.idLine)
    const viewCartAgain = viewCart(cookie)
    sleep(1)

    check(addToCartRes, {
        "add-to-cart-status-ok": (r)=> r.status === 200
    }, {name: "add-to-cart"})

    check(viewCartRes, {
        "view-cart-status-ok": (r)=> r.res.status === 200
    }, {name: "view-cart"})

    check(deleteItemRes, {
        "delete-item-status-ok": (r)=> r.status ===200
    }, {name: "delete-item"})

    check(viewCartAgain.res, {
        "view-cart-again-status-ok": (r)=> r.status === 200,
        "cart-empty-after-delete": (r)=> (r.json("Items") as any[]).length === 0
    }, {name: "view-cart"})

    cartJourneyDuration.add(
        addToCartRes.timings.duration
        + viewCartRes.res.timings.duration
        + deleteItemRes.timings.duration
        + viewCartRes.res.timings.duration
    )
} 
