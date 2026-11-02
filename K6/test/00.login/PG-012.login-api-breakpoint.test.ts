import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"

export const options: Options = {
    scenarios: {
        "breakpoint-login": {
            executor: "ramping-arrival-rate",
            startRate: 0,
            timeUnit: "1s",
            preAllocatedVUs: 10,
            maxVUs: 5000,
            stages: [
                {duration: "10m", target: 1500}
            ]
        }
    },
    thresholds: {
        "http_req_duration{name: login}": [
            {
                threshold: "p(95)<30000",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ],
        "http_req_failed{name: login}": [
            {
                threshold: "rate<0.01",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ]
    }
}

const BASE_URL='https://api.demoblaze.com'
type Account = {
    username: string,
    password: string
}

export function setup(){
    const account: Account = {
           username: `Test_${Date.now()}`,
           password: `Password_${Date.now()}` 
    }
    const res = http.post(`${BASE_URL}/signup`, 
        JSON.stringify(account), 
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "signup"}
        }
    )
    if(res.status !== 200 || String(res.body).includes("errorMessage")){
        test.abort("Failed when create account")
    }
    return account
}

export default function(account: Account){
    const res = http.post(
        `${BASE_URL}/login`, 
        JSON.stringify(account),
        {
            headers: {
                "Content-type": "application/json"
            }, 
            tags: {name:"login"}
        }
    )
    check(res, {
        "status code correct": (r)=> r.status == 200,
        "response ok": (r)=> String(r.body).startsWith(`"Auth_token: `)
    })
    
}