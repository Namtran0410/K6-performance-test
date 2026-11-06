import { Options } from "k6/options";
import encoding from "k6/encoding"
import exec, {test} from "k6/execution"
import {check, sleep} from "k6"
import http from "k6/http"
import { Trend } from "k6/metrics";

const cartJourneyDuration = new Trend("cart_journey_duration", true)
const base_url="https://api.demoblaze.com"
const prod_id = 1

// utils function
function addToCart(cookie: string){
    const payload = JSON.stringify({
        id: crypto.randomUUID(),
        cookie,
        prod_id,
        flag: false
    })
    const res = http.post(`${base_url}/addtocart`,payload,
        {
            headers: {"Content-type": "application/json"},
            tags:{name: "add-to-cart"}
        }
    )
    return res
}

function viewCart(cookie: string){
    const payload = JSON.stringify({cookie, flag: false})
    const res = http.post(`${base_url}/viewcart`, payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "view-cart"}
        }
    )
    const idLine = res.json("Items.0.id") as string
    return {res, idLine}
}

function deleteItem(idLine: string) {
    const payload = JSON.stringify({
        id: idLine
    })
    const res = http.post(`${base_url}/deleteitem`, payload, 
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "delete-item"}
        }
    )
    return res
}

// execution function
export const options: Options = {
    scenarios: {
        "full-flow-CT-006": {
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: 10},
                {duration: "3m", target: 10},
                {duration: "1m", target: 0}
            ]
        }
    },
    thresholds: {
        "http_req_duration{name:add-to-cart}": ["p(95)<1200"],
        "http_req_duration{name:view-cart}": ["p(95)<1200"],
        "http_req_duration{name:delete-item}": ["p(95)<1200"],
        "cart_journey_duration": ["p(95)<6000"],
        "http_req_failed": ["rate<0.01"],
        "checks": ["rate>0.99"],
    }
}

export default function(){
    const cookie = crypto.randomUUID()
    const addToCartRes = addToCart(cookie)
    const {res: viewCartRes, idLine} = viewCart(cookie)
    const deleteItemRes = deleteItem(idLine)
    const viewCartAgain = viewCart(cookie)
    check(addToCartRes, {
        "add-to-cart-status-ok": (r)=> r.status === 200
    }, {name: "add-to-cart"})

    check(viewCartRes, {
        "view-cart-status-ok": (r)=> r.status === 200
    }, {name: "view-cart"})

    check(deleteItemRes, {
        "delete-item-status-ok": (r)=> r.status ===200
    }, {name: "delete-item"})

    check(viewCartAgain.res, {
        "view-cart-again-status-ok": (r)=> r.status === 200,
        "cart-empty-after-delete": (r)=> (r.json("Items") as any[]).length === 0
    }, {name: "view-cart"})

    cartJourneyDuration.add(
        addToCartRes.timings.duration 
        + viewCartRes.timings.duration 
        + deleteItemRes.timings.duration
        + viewCartAgain.res.timings.duration
    )

    sleep(1)
}