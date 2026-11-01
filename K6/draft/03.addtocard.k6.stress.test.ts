/** Stress test theo VU cao hơn mức bình thường và tăng theo từng bậc */
/**
 * VU: 200-300-500
 * rampup: 30s, hold :1m, down: 30s
 */

import http from "k6/http"
import {check, sleep}from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"
const BASE_URL='https://api.demoblaze.com'
export const options: Options = {
    stages: [
        {duration: "2m", target: 200},
        {duration: "2m", target: 200},
        {duration: "2s", target: 0}
    ],
    thresholds: {
        "http_req_duration{name:addtocard}": ["p(95)<1500"],
        "http_req_failed": ["rate<0.01"],
        "checks": ["rate>0.99"]
    }
}
function getCookie(){
    const cookie = crypto.randomUUID() + exec.vu.idInTest
    return cookie
}
function getItems(){
    const res = http.get(`${BASE_URL}/entries`, {
        tags: {name: "getItems"}
    })
    if(res.status !== 200) {
        test.abort(`Failed get items at ${res.status}`)
    }
    const data:any = res.json()
    const listItem = data.Items 
    return listItem
}

export default function(){
    const id = crypto.randomUUID() + exec.vu.idInTest
    const cookie = `user=`+getCookie()
    const listProduct = getItems()
    const itemId = listProduct[0].id
    const payload = JSON.stringify({
        id,
        cookie,
        flag: false,
        prod_id: itemId
    })
    const res = http.post(`${BASE_URL}/addtocart`, payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "addtocart"}
        }
    )
    if(res.status !== 200) {
        test.abort(`Fail at: ${exec.vu.idInTest}: ${res.status}`)
    }
    check(res, {
        "Add to cart check": (r)=> r.status == 200
    })
}