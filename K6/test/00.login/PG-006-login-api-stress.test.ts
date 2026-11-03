import http from "k6/http"
import {check, sleep} from "k6"
import { Options } from "k6/options"
import {test} from "k6/execution"
import encoding from "k6/encoding"
import { tagWithCurrentStageIndex } from "https://jslib.k6.io/k6-utils/1.6.0/index.js"

const BASE_URL='https://api.demoblaze.com'

export const options: Options = {
    scenarios: {
        "stress_login": {
            executor: "ramping-arrival-rate",
            maxVUs: 100,
            startRate: 1,
            timeUnit: "1s",
            preAllocatedVUs: 20,
            stages: [
                {duration: "30s", target: 2},   // tăng lên R
                {duration: "2m",  target: 2},   // giữ R
                {duration: "30s", target: 4},  // tăng lên 2R
                {duration: "2m",  target: 4},  // giữ 2R
                {duration: "30s", target: 8},  // tăng lên 3R
                {duration: "2m",  target: 8},  // giữ 3R
                {duration: "1m",  target: 0},
            ]
        }
    },
    thresholds: {
        "http_req_duration{name:stress_login}": [
            {
                "threshold": "p(95)<10000",
                "abortOnFail": true,
                "delayAbortEval": "30s"
            }
        ],
        "dropped_iterations": ["count==0"],
        "http_req_duration{name:stress_login,stage:1}": ["p(95)<2000"],  // giữ R
        "http_req_duration{name:stress_login,stage:3}": ["p(95)<2000"],  // giữ 2R
        "http_req_duration{name:stress_login,stage:5}": ["p(95)<2000"],  // giữ 3R
        "http_req_failed{name:stress_login,stage:1}": ["rate<0.05"],
        "http_req_failed{name:stress_login,stage:3}": ["rate<0.05"],
        "http_req_failed{name:stress_login,stage:5}": ["rate<0.05"],

    }
}

type Account= {
    username: string,
    password: string
}
function createAccount(): Account{
    const username = `test_${Date.now()}`
    const password = encoding.b64encode("Password@123")
    const account = {username, password}
    const payload = JSON.stringify(account)
    const res = http.post(`${BASE_URL}/signup`,payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "signup"}
        }
     )
    if(res.status !== 200 || String(res.body).includes("errorMessage")){
        test.abort(`Failed, cannot create account: ${res.status}- ${res.body}`)
    }
    return account
}

export function setup(): Account{
    const account = createAccount()
    return account
}

export default function(account: Account){
    tagWithCurrentStageIndex()
    const payload = JSON.stringify(account)
    const res = http.post(`${BASE_URL}/login`, payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "stress_login"}
        }
    )
    check(res, {
        "status code correct": (r)=> r.status == 200,
        "body-login-success": (r)=> String(r.body).startsWith(`"Auth_token: `)
    })
}