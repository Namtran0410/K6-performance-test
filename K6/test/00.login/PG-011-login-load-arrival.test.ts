import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"

export const options: Options = {
    scenarios: {
        arrival_login: {
            executor: "ramping-arrival-rate",
            startRate: 0,
            timeUnit: "1s",
            preAllocatedVUs: 10,
            maxVUs: 30,
            stages: [
                {duration: "1m", target: 7},
                {duration: "3m", target: 7},
                {duration: "1m", target: 0}
            ],
            tags: {tc: "PF-LG-011"}
        }
    },
    thresholds: {
        "http_req_duration{name:login-arrival}": ["p(95)< 1200"],
        "http_req_failed{name:login-arrival}": ["rate<0.01"],
        "checks{name:login-arrival}": ["rate> 0.99"],
        "dropped_iterations{scenario:arrival_login}": ["count==0"]
    }
}

type Account = {
    username: string,
    password: string
}
const BASE_URL='https://api.demoblaze.com'

export function setup(){
    const account: Account = {
        username: `newUser_${Date.now()}`,
        password: `Password123_${Date.now()}`
    }

    const res = http.post(`${BASE_URL}/signup`, 
        JSON.stringify(account),
    {
        headers: {"Content-type": "application/json"},
        tags: {name: "signup"}
    }
    )
    if(res.status !==200 || String(res.body).includes("errorMessage")) {
        test.abort("Failed when create account")
    }
    return account
}

export default function(account:Account){
    const res = http.post(`${BASE_URL}/login`, JSON.stringify(account),
    {
        headers: {
            "Content-type": "application/json"
        },
        tags: {name: "login-arrival"}
    }
    )
    check(res, {
        "login-status-success": (r)=> r.status == 200,
        "login-response-success": (r) => String(r.body).startsWith(`"Auth_token: `)
    },
    { name: "login-arrival" }
    )
}