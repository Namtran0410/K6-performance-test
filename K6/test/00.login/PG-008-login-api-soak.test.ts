import http from "k6/http"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"
import encoding from "k6/encoding"
import {check, sleep} from "k6"

const BASE_URL='https://api.demoblaze.com'
export const options: Options = {
    scenarios: {
        "soak_login": {
            executor: "constant-vus",
            vus: 5,
            duration: "10m"
        }
    },
    thresholds: {
        "http_req_duration{name:login}": ["p(95)<1200"],
        "http_req_failed{name:login}": ["rate<=0.01"],
        "checks{name:login}": ["rate>0.99"],
    } 
}

type Account = {
    username: string,
    password: string
}

export function setup(): Account {
    const username = `PG_008_${Date.now()}`
    const password = encoding.b64encode("Password@PG_008")
    const account: Account = {username, password}
    const payload = JSON.stringify(account)
    const res = http.post(`${BASE_URL}/signup`,payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "signup"}
    })
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Failed because of: ${res.status}: ${res.body}`)
    }
    return account
}

export default function(account: Account){
    const payload = JSON.stringify(account)
    const res = http.post(`${BASE_URL}/login`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "login"}
    })

    check(res, {
        "res-status-success": (r)=> r.status === 200,
        "response-ok": (r)=> String(r.body).startsWith(`"Auth_token: `),
        },
        {
            name: "login"
        }
    )
    sleep(1)
}
