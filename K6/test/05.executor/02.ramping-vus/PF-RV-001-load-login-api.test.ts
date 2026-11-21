import http from "k6/http"
import { Options } from "k6/options"
import {check, sleep} from "k6"
import {test} from "k6/execution"
import { Trend, Counter, Rate } from "k6/metrics"

const server_processing_time = new Trend("server_processing_time", true)
const server_5xx_total = new Counter("server_5xx_total", false)
const serverErrorRate = new Rate("serverErrorRate")
const base_url='https://api.demoblaze.com'

type Account = {
    username: string,
    password: string
}

export const options: Options = {
    scenarios: {
        ex001: {
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: 10},
                {duration: "3m", target: 10},
                {duration: "1m", target: 0}
            ],
            exec: "load_login"
        }
    },
    thresholds: {
        "http_req_duration{name:login}": ["p(95)<1200"],
        "http_req_failed{name:login}": ["rate<0.01"],
        "checks": ["rate>0.99"],
        "server_processing_time{name:login}": ["p(95)<1000"],
        "server_5xx_total{name:login}": ["count==0"],
        "serverErrorRate{name:login}": ["rate<0.01"],
    }
}
export function setup(): Account{
    const payload: Account = {
        username: `test_user_${Date.now()}`,
        password: `ThisIsPassword`
    }
    const res = http.post(`${base_url}/signup`,JSON.stringify(payload),
            {
                headers: {"Content-type": "application/json"},
                tags: {name: "signup"}
            } 
        )
    if(res.status !== 200) {
        test.abort(`Create account failed ${res.status}`)
    } 
    return payload
}

export function load_login(payload: Account){
    const resLogin = http.post(`${base_url}/login`, JSON.stringify(payload), 
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "login"}
        })
    
    // Metrics count 
    server_processing_time.add(resLogin.timings.waiting, {name: "login"})
    server_5xx_total.add(resLogin.status >= 500 ? 1:0, {name: "login"})
    const isServerError = 
    resLogin.status >=500 || 
    (resLogin.status === 200 && String(resLogin.body).includes("errorMessage"))
    ? true : false

    serverErrorRate.add(isServerError, {name:"login"})

    // const resCheck - http.post(`${base_url}/login`, JSON.stringify())
    check(resLogin, {
        "status-ok": (r)=> r.status == 200,
        "contain-auth-token": (r)=> String(r.body).startsWith(`"Auth_token: `),
        "not-contain-error": (r)=> !String(r.body).includes("errorMessage")
    })

    sleep(1)
}