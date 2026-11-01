/**
 * Tăng tải liên tục, tới ngưỡng không chịu được
 * Tăng theo RPS(ramping-arrival-rate) không tăng theo VU
 */

import http from "k6/http"
import {check, sleep } from "k6"
import exec, {test}from "k6/execution" 
import { Options } from "k6/options"

const BASE_URL='https://api.demoblaze.com'

export const options: Options = {
    scenarios: {
        breakpoint: {
            executor: "ramping-arrival-rate",
            startRate: 10,
            timeUnit: "1s",
            preAllocatedVUs: 450,
            maxVUs: 10000,
            stages: [{
                duration: "5m", target: 500
            }]
        }
    },
    thresholds: {
        "http_req_failed{name:viewcart}": [
            {
                threshold: "rate<0.01", 
                abortOnFail: true, 
                delayAbortEval: "30s"
            }
        ],
        "http_req_duration{name:viewcart}": [
            { 
                threshold: "p(95)<5000", 
                abortOnFail: true, 
                delayAbortEval: "30s" 
            },
    ],
    }
}

export default function(){
    const cookie = crypto.randomUUID() + `${exec.vu.idInTest}`
    const payload = JSON.stringify({
        cookie,
        flag: false
    })
    const res = http.post(`${BASE_URL}/viewcart`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "viewcart"}
    })
    if(res.status !== 200) {
        test.fail(`View fail at: ${exec.vu.idInTest}`)
    }
    check(res, {
        "Check view cart": (r)=> r.status == 200
    })
}