import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"
import {Trend}from "k6/metrics"
import encoding from "k6/encoding"

// ---- Workload model (Little's Law) ----
// Mặc định là mức nhẹ cho demoblaze (site công khai).
// Trên staging: k6 run -e RATE=500 -e N_ACCOUNTS=100 -e BASE_URL=<staging-url> pf-sr-001.test.ts
const base_url = __ENV.BASE_URL || "https://api.demoblaze.com"
const RATE = Number(__ENV.RATE || 25)                 // λ: số flow mỗi giây
const R = Number(__ENV.R || 16)                     // thời gian phản hồi giả định của cả flow (giây)
const Z = Number(__ENV.Z || 2)                       // think time (giây)
const N_ACCOUNTS = Number(__ENV.N_ACCOUNTS || 50)    // số tài khoản tạo trong setup()

const preAllocatedVUs = Math.ceil(RATE * (R + Z))    // VU = λ × (R + Z)
const maxVUs = preAllocatedVUs * 2

const headers = { "Content-type": "application/json" }
const prod_id = 1

type Account = {
    username: string,
    password: string
}

const journeyR = new Trend("journey_res_time", true)

export const options: Options = {
    setupTimeout: "5m",
    scenarios: {
        "pf-sr-001": {
            executor: "constant-arrival-rate",
            rate: RATE,
            timeUnit: "1s",
            preAllocatedVUs,
            maxVUs,
            duration: "1m"
        }
    },
    thresholds: {
        "dropped_iterations": ["count==0"],
        "iterations": [`rate>=${RATE * 0.95}`, `rate<${RATE * 1.05}`],   // λ ±5%
        "journey_res_time": [`avg<${R * 1000 * 1.1}`, "p(95)<2400"],      // avg kiểm tra giả định R (lệch tối đa 10%)
        "checks": ["rate>0.99"],
        "http_req_failed": ["rate<0.01"]
    }
}

// signup: chỉ gọi trong setup(), lỗi thì dừng test luôn
function signup(prefix: string): Account {
    const account: Account = {
        username: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        password: encoding.b64encode("Password@123")
    }
    const res = http.post(`${base_url}/signup`, JSON.stringify(account), {
        headers,
        tags: { name: "signup" }
    })
    // demoblaze trả 200 kể cả khi lỗi, lỗi nằm trong body (errorMessage)
    if (res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Signup failed: ${res.status}: ${res.body}`)
    }
    return account
}

// login: gọi trong mỗi vòng lặp, KHÔNG abort, trả token hoặc null
function login(account: Account) {
    const res = http.post(`${base_url}/login`, JSON.stringify(account), {
        headers,
        tags: { name: "login" }
    })
    const body = String(res.body)
    // thành công: body là chuỗi "Auth_token: <token>"
    const token = body.includes("Auth_token")
        ? String(res.json()).replace("Auth_token: ", "")
        : null
    return { res, token }
}

// addToCart: dùng token làm cookie, flag = true (người dùng đã đăng nhập)
function addToCart(token: string) {
    const payload = JSON.stringify({
        id: crypto.randomUUID(),
        cookie: token,
        prod_id,
        flag: true
    })
    const res = http.post(`${base_url}/addtocart`, payload, {
        headers,
        tags: { name: "add-to-cart" }
    })
    return res
}

export function setup(): Account[] {
    // nhiều VU dùng chung tài khoản để login được, không cần mỗi VU một tài khoản
    const accountList: Account[] = []
    for (let i = 0; i < N_ACCOUNTS; i++) {
        accountList.push(signup(`pf-sr-001-${i}`))
    }
    return accountList
}

export default function (accountList: Account[]) {
    const account = accountList[(exec.vu.idInTest - 1) % accountList.length]

    const { res: loginRes, token } = login(account)
    const loginOk = check(loginRes, {
        "login-status-ok": (r) => r.status === 200,
        "login-has-token": () => token !== null,
    })
    if (!loginOk || !token) return          // login lỗi: dừng vòng lặp này, không ghi Trend

    sleep(Z)                                // think time

    const cartRes = addToCart(token)
    check(cartRes, {
        "add-to-cart-status-ok": (r) => r.status === 200,
    })

    // R của cả flow, không tính think time
    journeyR.add(loginRes.timings.duration + cartRes.timings.duration)
}
