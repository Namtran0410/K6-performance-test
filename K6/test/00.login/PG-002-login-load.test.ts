import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"

export const options: Options = {
    scenarios: {
        login_load_test: {
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: 10}, // trong 1 phút, tăng số lượng tối đa ở giây 61 lên 10 iteration/s
                {duration: "3m", target: 10}, // giữ nguyên tốc độ 10 iteration/s trong 3 phút
                {duration: "1m", target: 0} // giảm dần về 0 trong 1 phút
            ],            
            tags: { tc: "PF-LG-002" }
        }
    },
    thresholds: {
        "http_req_duration{name:login}": ["p(95)<1200"],
        "http_req_failed{name:login}": ["rate<0.01"],
        "checks{name:login}": ["rate>0.99"]
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
    if(res.status !==200) {
        console.log(`status: ${res.status} at ${exec.vu.idInTest}`)
    }
    check(res, {
        "login success": (r)=> r.status == 200 && !String(r.body).includes("errorMessage"),
        "response check": (r:any) => String(r.body).startsWith(`"Auth_token:`)
    },
    {name: "login"}
    )
    sleep(1)
}
