import http from "k6/http"
import {check, sleep}from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"

const BASE_URL='https://api.demoblaze.com'

export const options: Options = {
    scenarios: {
        login: {
            executor: "ramping-arrival-rate",
            startRate: 100,
            timeUnit: "1s",
            preAllocatedVUs: 200,
            maxVUs: 1000,
            stages: [
                {duration: "5m", target: 500}
            ]
        }
    },
    thresholds: {
        "http_req_duration{name: signup}": [
            {
                threshold: "p(95)<=5000",
                abortOnFail: true,
                delayAbortEval:"30s"
            }
        ],
        "http_req_failed{name:singup}": [
            {
                threshold: "rate<0.01",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ]
    }
}

export default function(){
    const id = exec.vu.idInTest
    const res = http.post(`${BASE_URL}/signup`, 
        JSON.stringify({
            username: `Test_${id}`,
            password: `Password_${id}`
        }),
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "signup"}
        }
    )
    if(res.status !== 200) {
        test.fail(`View fail at: ${exec.vu.idInTest}`)
    }
    check(res, {
        "Check view cart": (r)=> r.status == 200
    })
}