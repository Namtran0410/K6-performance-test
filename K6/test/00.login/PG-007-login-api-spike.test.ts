import http from "k6/http"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"
import encoding from "k6/encoding"
import {check, sleep} from "k6"
import { tagWithCurrentStageIndex } from "https://jslib.k6.io/k6-utils/1.6.0/index.js"

const BASE_URL='https://api.demoblaze.com'
const R = 1
export const options:Options = {
    scenarios: {
        "spike_login": {
            executor: "ramping-arrival-rate",
            preAllocatedVUs: 1000,
            maxVUs: 4100,
            startRate: 1,
            timeUnit: "1s",
            stages: [
                {duration: "30s", target: R},  //0
                {duration: "5s", target: 1000*R}, //1
                {duration: "30s", target: 1000*R}, //2
                {duration: "5s", target: 1}, //3
                {duration: "30s", target: 1} //4
            ]
        }
    },
    thresholds: {
        "http_req_failed{name:login, stage:2}": ["rate<0.05"],
        "dropped_iterations": ["count >=0"],
        "http_req_duration{name:login, stage:0}": ["p(95)<1000"],
        "http_req_duration{name:login, stage:4}":["p(95)<1200"]
    }
}
type Account= {
    username: string,
    password: string
}
export function setup(): Account{
    const username = `my_test_${Date.now()}`
    const password = encoding.b64encode(`This_Is_My_PW_${Date.now()}`)
    const account = {username, password}
    const payload = JSON.stringify(account)

    const res = http.post(`${BASE_URL}/signup`,payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "signup"}
        }
    )
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Failed when create account: ${res.status}: ${res.body}`)
    }
    return account
}

export default function(account: Account){
    tagWithCurrentStageIndex()
    const payload = JSON.stringify(account)
    const res= http.post(`${BASE_URL}/login`, payload,{
        headers: {"Content-type": "application/json"},
        tags: {name: "login"}
    })
    check(res, {
        "status-ok": (s)=> s.status === 200,
        "response-ok": (s)=> String(s.body).startsWith(`"Auth_token: `)  
    })
}