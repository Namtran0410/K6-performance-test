import http from "k6/http"
import exec, {test} from "k6/execution"
import {check, sleep}from "k6"
import { Options } from "k6/options"
import { tagWithCurrentStageIndex } from "https://jslib.k6.io/k6-utils/1.6.0/index.js"

// utils function
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
const iter = 3
export const options: Options = {
    scenarios: {
        "CT-009": {
            executor: "ramping-arrival-rate",
            preAllocatedVUs: 20,
            maxVUs: 50,
            startRate: 0,
            timeUnit: "1s",
            stages: [
                {duration: "10s", target: iter},
                {duration: "2m", target: iter},
                {duration: "10s", target: 2*iter},
                {duration: "2m", target: 2*iter},
                {duration: "10s", target: 3*iter},
                {duration: "2m", target: 3*iter}
            ]
        }
    },
    thresholds: {
    // Dừng khẩn cấp: p95 của mọi request vượt 5 giây thì dừng test (chờ 30 giây đầu rồi mới xét)
    "http_req_duration": [
        { threshold: "p(95)<5000", abortOnFail: true, delayAbortEval: "30s" }
    ],

    // Chặng 1 (giữ R)
    "http_req_duration{name:add-to-cart,stage:1}": ["p(95)<1200"],
    "http_req_duration{name:view-cart,stage:1}": ["p(95)<1200"],
    "http_req_duration{name:delete-item,stage:1}": ["p(95)<1200"],
    "http_req_failed{stage:1}": ["rate<0.01"],

    // Chặng 3 (giữ 2R)
    "http_req_duration{name:add-to-cart,stage:3}": ["p(95)<1200"],
    "http_req_duration{name:view-cart,stage:3}": ["p(95)<1200"],
    "http_req_duration{name:delete-item,stage:3}": ["p(95)<1200"],
    "http_req_failed{stage:3}": ["rate<0.01"],

    // Chặng 5 (giữ 3R)
    "http_req_duration{name:add-to-cart,stage:5}": ["p(95)<1200"],
    "http_req_duration{name:view-cart,stage:5}": ["p(95)<1200"],
    "http_req_duration{name:delete-item,stage:5}": ["p(95)<1200"],
    "http_req_failed{stage:5}": ["rate<0.01"],

    // Số lượt k6 phải bỏ vì không còn người dùng ảo rảnh
    "dropped_iterations": ["count==0"],

    // Tỉ lệ check (kiểm tra) đạt
    "checks": ["rate>0.99"],
}

}

export default function(){
    tagWithCurrentStageIndex()
    const cookie = crypto.randomUUID()
    const addToCartRes = addToCart(cookie)
    const viewCartRes = viewCart(cookie)
    const deleteCartRes = deleteItem(viewCartRes.idLine)
    const viewCartAgain = viewCart(cookie)
    
    check(addToCartRes, {
        "add-to-cart-status-ok": (r) => r.status === 200
    }, {name: "add-to-cart"})

    check(viewCartRes, {
        "view-cart-status-ok": (r) => r.res.status === 200
    }, {name: "view-cart"})

    check(deleteCartRes, {
        "delete-item-status-ok": (r) => r.status === 200
    }, {name: "delete-item"})

    check(viewCartAgain.res, {
        "view-cart-again-status-ok": (r) => r.status === 200,
        "cart-empty-after-delete": (r) => (r.json("Items") as any[]).length === 0
    }, {name: "view-cart"})

}