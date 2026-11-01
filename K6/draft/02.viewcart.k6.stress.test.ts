/** Stress test theo VU cao hơn mức bình thường và tăng theo từng bậc */
/**
 * VU: 200-300-500
 * rampup: 30s, hold :1m, down: 30s
 */

import http from "k6/http"
import {check, sleep } from "k6"
import exec, { test } from "k6/execution"
import { Options } from "k6/options"

const BASE_URL='https://api.demoblaze.com'
export const options: Options = {
    stages: [
        {duration: "2m", target:200},
        {duration: "3m", target: 200},
        {duration: "2s", target: 0}
    ],
    thresholds: {
        "http_req_duration{name:viewcart}": ["p(95)<=1000"],
        "http_req_failed{name:viewcart}": ["rate<0.01"],
        "checks": ["rate>=0.99"] 
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