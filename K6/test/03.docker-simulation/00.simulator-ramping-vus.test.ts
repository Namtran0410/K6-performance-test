import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options" 
import encoding from "k6/encoding"
import { Rate, Counter } from "k6/metrics"
const BASE_URL = 'https://api.demoblaze.com'

const reqSuccess = new Rate('req_success')
const reqErrors = new Counter('req_errors')

// options
export const options: Options = {
    scenarios: {
        "simulator-001": {
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: 200},
                {duration: "2m", target: 200},
                {duration: "1m", target: 0}
            ]
        }
    }, 
    thresholds: {
        "http_req_duration{name:signup}": ["p(95)<1500"],
        "http_req_failed{name:signup}": ["rate<0.01"],
        "checks": ["rate>0.99"], 
        req_success: ["rate>0.99"],
        req_errors: ["count<10"]
        
    }
}
type Account = {
    username: string,
    password: string
}

function signup(account: Account){
    const payload = JSON.stringify(account)
    const res = http.post(`${BASE_URL}/signup`, payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "signup"}
        })
    return res
}

export default function(){
    const account: Account = {
        username: `${Date.now()}_${exec.vu.idInTest}_${exec.vu.idInInstance}`,
        password: encoding.b64encode(`This_is_password_${Date.now()}`)
    }
    
    const res = signup(account)
    sleep(1)
    
    const ok = check(res, {
        "status-ok": (r)=>r.status == 200,
        "no-error": (r)=> !String(r.body).includes("errorMessage")
    })
    reqSuccess.add(ok)
    if(!ok) {
        reqErrors.add(1)
    }
}


