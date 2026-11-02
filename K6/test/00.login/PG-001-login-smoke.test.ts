import http from "k6/http"
import {sleep, check} from "k6"
import { Options } from "k6/options"
import exec, {test} from "k6/execution"

export const options: Options = {
    scenarios: {
        login_smoke: {
            executor: "constant-vus",
            vus: 1,
            duration: "1m",
            tags: { tc: "PF-LG-001" }
        }
    },
    thresholds: {
        "http_req_duration{name: login}": ["p(95)<=5000"],
        "http_req_failed{name: login}": ["rate<0.01"],
        "checks{name: login}": ["rate>0.99"]
    }
}

const BASE_URL = 'https://api.demoblaze.com'
type Account = {
    username: string, 
    password: string
}

function createUser(): Account{
    const id = `${exec.vu.idInTest}_${exec.vu.iterationInScenario}`
    const username = `Test_${Date.now()}_${id}`
    const password = `Password_${Date.now()}_${id}`
    return {username, password}
}

export function setup(): Account{
    const user = createUser()
    console.log(user)
    const res = http.post(`${BASE_URL}/signup`, JSON.stringify(user), {
        headers: {"Content-type": "application/json"}
    })
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Signup failed: ${res.body}`)
    }
    return user
}

export default function(user: Account){
    const res = http.post(`${BASE_URL}/login`, JSON.stringify(user), {
        headers: {"Content-type": "application/json"},
        tags: { name: "login" }
    })
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Failed at ${exec.vu.idInTest}: ${res.body}`)
    }

    check(res, {
        "login success": (r)=> r.status == 200 && !String(r.body).includes("errorMessage")
    }, { name: "login" })
    sleep(1)
}
