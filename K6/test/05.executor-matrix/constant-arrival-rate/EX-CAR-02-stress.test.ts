import http from "k6/http"
import {check, sleep} from "k6"
import { Options } from "k6/options"
import exec, {test} from "k6/execution"
import { utils, Account } from "../../../utils/common"

const rate = 2

export const options: Options = {
    scenarios: {
        "stress-login": {
            executor: "constant-arrival-rate",
            timeUnit: "1s",
            preAllocatedVUs: 6,
            maxVUs: 32,
            rate: 2*rate,
            duration: "5m",
            exec: "loginAndCheck"
        }
    },
    thresholds: {
        "http_req_failed": ["rate<0.05"],
        "http_req_failed{name:login}":["rate<0.05"],
        "http_req_failed{name:check}":["rate<0.05"],
        "dropped_iteration": []
    }
}

export function setup():Account{
    const payload: Account = {
        username: `Ex-002-${Date.now()}`,
        password: "ThisIsPassword"
    }
    const {res, account} = utils.auth.signup(payload)
    if(res.status == 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Failed when create user`)
    }
    return account
}

export function loginAndCheck(account: Account){
    const {res: resLogin, token} = utils.auth.login(account)
    if(!token)return
    const {res: resCheck, username} = utils.auth.check(token) 

    check(resLogin, {
        "status-login-ok": (r)=>r.status == 200,
    })

    check(resCheck, {
        "status-check-ok": (r)=> r.status == 200,
        "check-username": ()=> username == account.username
    })
}