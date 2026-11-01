/** Tăng tải đột ngột
 * VU: 10-300
 * duration: rampup: 30s, hold: 1m, recover: 2m
 * 
 */

import http from "k6/http"
import {check, sleep } from "k6"
import exec, {test}from "k6/execution" 
import { Options } from "k6/options"

const BASE_URL='https://api.demoblaze.com'

export const options: Options = {
    stages: [
        {duration: "30s", target: 300},
        {duration: "2m", target: 300},
        {duration: "1m", target: 0}
    ],
    thresholds: {
        "http_req_duration{name:viewcart}": ["p(95)< 1500"],
        "http_req_failed{name:viewcart}": ["rate<=0.01"],
        "checks{name:viewcart}":["rate>=0.99"]
    }
}

export default function(){
    const cookie = crypto.randomUUID() + `${exec.vu.idInTest}`
    const payload = JSON.stringify({
        cookie,
        flag: false
    })
    const res = http.post(`${BASE_URL}/viewcart`, payload, {
        headers: {
            "Content-type": "application/json"
        },
        tags: {name: "viewcart"}
    })
    if(res.status !== 200) {
        test.abort(`Failed at: ${exec.vu.idInTest}`)
    }
    check(res, {"Check view cart": (r)=> r.status == 200})
}