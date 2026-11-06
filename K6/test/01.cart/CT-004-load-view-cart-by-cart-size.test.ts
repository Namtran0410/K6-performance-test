import http from "k6/http"
import { Options } from "k6/options"
import exec, {test} from "k6/execution"
import encoding from "k6/encoding"
import {check, sleep} from "k6"
import {Trend} from "k6/metrics"

const base_url='https://api.demoblaze.com'
const SIZES = [1, 10, 30]                       // kích thước giỏ cần đo
const PRODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]   // prod_id hợp lệ để seed (xoay vòng)

const cartRead = new Trend("cart_read_duration", true)

type Account = {
    username: string,
    password: string
}
type Cart = {
    token: string,
    size: number
}

export const options: Options = {
    scenarios: {
        "scalability-view-cart": {
            executor: "per-vu-iterations",
            vus: 1,
            iterations: SIZES.length,   // chạy 1 lần cho mỗi size
        }
    },
    thresholds: {
        "http_req_duration{name:viewcart,size:1}":  ["p(95)<1200"],
        "http_req_duration{name:viewcart,size:10}": ["p(95)<1200"],
        "http_req_duration{name:viewcart,size:30}": ["p(95)<1200"],
        "http_req_duration{name:view}":             ["p(95)<1000"],
        "checks": ["rate>0.99"],
    }
}

function createAccount(i: number): Account {
    const username = `CT-004-${Date.now()}-${i}`
    const password = encoding.b64encode("Password@1")
    const payload = JSON.stringify({username, password})
    const res = http.post(`${base_url}/signup`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "signup"}
    })
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Create account failed: ${res.status}: ${res.body}`)
    }
    return {username, password}
}

function login(account: Account): string {
    const payload = JSON.stringify(account)
    const res = http.post(`${base_url}/login`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "login"}
    })
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Login Failed: ${res.status}: ${res.body}`)
    }
    return String(res.json()).replace("Auth_token: ", "")
}

function addToCart(cookie: string, prod_id: number) {
    const payload = JSON.stringify({
        id: crypto.randomUUID(),
        cookie,
        prod_id,
        flag: true
    })
    http.post(`${base_url}/addtocart`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "add-to-cart"}
    })
}

// seed đúng `size` item vào giỏ, prod_id xoay vòng qua PRODS
function seedCart(cookie: string, size: number) {
    for(let i = 0; i < size; i++) {
        addToCart(cookie, PRODS[i % PRODS.length])
    }
}

export function setup(): Cart[] {
    const carts: Cart[] = []
    for(let i = 0; i < SIZES.length; i++) {
        const size = SIZES[i]
        const token = login(createAccount(i))
        seedCart(token, size)
        carts.push({token, size})
    }
    return carts
}

export default function(carts: Cart[]) {
    const {token, size} = carts[exec.vu.iterationInInstance]

    // warm-up: request đầu của VU gánh phí TCP/TLS handshake.
    // Gắn tag riêng "warmup" để nó KHÔNG lọt vào {name:view}/{name:viewcart},
    // các request đo thật sau đó dùng lại kết nối đã mở -> p95 không bị cold-start kéo lên.
    if(exec.vu.iterationInInstance === 0) {
        http.get(`${base_url}/entries`, {tags: {name: "warmup"}})
    }

    // 1. đọc giỏ, tag theo size
    const resView = http.post(`${base_url}/viewcart`,
        JSON.stringify({cookie: token, flag: true}),
        {headers: {"Content-type": "application/json"}, tags: {name: "viewcart", size: String(size)}}
    )
    cartRead.add(resView.timings.duration, {size: String(size)})

    const prodIds = (resView.json("Items.#.prod_id") as number[]) ?? []
    check(resView, {
        "viewcart-status-ok": (r) => r.status === 200,
        "cart-size-match": () => prodIds.length === size,
    }, {name: "viewcart", size: String(size)})

    // 2. gọi /view cho từng item trong giỏ (như cart.html)
    for(const pid of prodIds) {
        const resProd = http.post(`${base_url}/view`,
            JSON.stringify({id: String(pid)}),
            {headers: {"Content-type": "application/json"}, tags: {name: "view", size: String(size)}}
        )
        check(resProd, {
            "view-status-ok": (r) => r.status === 200,
        }, {name: "view", size: String(size)})
    }

    sleep(1)
}

export function teardown(carts: Cart[]) {
    for(const {token} of carts) {
        const ids = (http.post(`${base_url}/viewcart`,
            JSON.stringify({cookie: token, flag: true}),
            {headers: {"Content-type": "application/json"}, tags: {name: "viewcart"}}
        ).json("Items.#.id") as string[]) ?? []
        for(const id of ids) {
            http.post(`${base_url}/deleteitem`, JSON.stringify({id}), {
                headers: {"Content-type": "application/json"},
                tags: {name: "deleteItems"}
            })
        }
    }
}
``