import http from "k6/http"
import {check, sleep} from "k6"
import { Options } from "k6/options"
import { Account, utils } from "../../../utils/common.ts"
import { test } from "k6/execution"
const R = 2
export const options: Options =  {
    scenarios: {
        "EX-CAR-01": {
            executor: "constant-arrival-rate",
            timeUnit: "1s",
            duration: "5m",
            preAllocatedVUs: 3,
            maxVUs: 6,
            rate: R,
            exec: "loginFunction"
        }
    },
    thresholds: {
        "http_req_duration{name:login}": ["p(95)<1200"],
        "http_req_duration{name:check}": ["p(95)<1000"],
        "http_req_failed": ["rate<0.01"],
        "http_req_failed{name:login}": ["rate<0.01"],
        "http_req_failed{name:check}": ["rate<0.01"],
        "dropped_iterations": ["count==0"],
        "checks": ["rate>0.99"],
    }
}
const baseUrl = utils.base_url

export function setup(){
    const account: Account = {
        username: `ex-cart-01-${Date.now()}`,
        password: "ThisIsPassword"
    }
    const {res}= utils.auth.signup(account)
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort("Create Account Fail")
    }
    return account
}


export function loginFunction(account:Account){
    const {res:loginRes, token} = utils.auth.login(account)
    check(loginRes, {
        "status-login-ok": (r)=> r.status == 200,
        "contain-token": (r) => String(r.body).startsWith(`"Auth_token: `)
    })

    if(!token) return
    const {res: checkRes, username}= utils.auth.check(token)
    check(checkRes, {
        "status-check-ok": (r)=> r.status == 200,
        "username-ok": (r)=> username === account.username
    })
}