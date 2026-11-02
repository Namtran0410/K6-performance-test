import http from "k6/http"
import { Options } from "k6/options"
import exec, {test} from "k6/execution"
import {sleep, check}from "k6"
import encoding from "k6/encoding"
const BASE_URL = 'https://api.demoblaze.com'
const maxVu= 10

export const options: Options ={
    scenarios: {
        login: {
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: maxVu},
                {duration: "3m", target: maxVu},
                {duration: "1m", target: 0}
            ]
        }
    },
    thresholds: {
        "http_req_duration{name:login}": [
            {
                threshold: "p(95)<1200",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ],
        "http_req_failed{name:login}": [
            {
                threshold: "rate<0.01",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ],
        "checks": ["rate>0.99"]
    }
}

function checkToken(token: string, username: string){
    const res = http.post(
        `${BASE_URL}/check`, 
        JSON.stringify({token}),
        {
            headers: {
                "Content-type": "application/json"
            },
            tags: {name: "check"}
        }
    )
    if(res.status !== 200 || String(res.body).includes("errorMessage")){
        test.abort(`Check failed, status: ${res.status} and ${res.body}`)
    }
    const data= res.json()
    return data!["Item" as keyof typeof data]["username"] == username  
}
type Account = {
    username: string,
    password: string
}
export function setup(): Account{
        const username= `user_${Date.now()}`
        const password = encoding.b64encode("Password@123")
        const account = {username, password}

        const payload = JSON.stringify({username, password})
        
        const res = http.post(`${BASE_URL}/signup`,
            payload,
            {
                headers: {"Content-type": "application/json"},
                tags: {name: "signup"}
            }
        )
        
        if(res.status !== 200 || String(res.body).includes("errorMessage")){
            test.abort("Create account failed")
        }
        return account
    }

export default function(account: Account){
    
    const payload = JSON.stringify(account)
    const res = http.post(`${BASE_URL}/login`, 
        payload,
        {
            headers: {"Content-type": "application/json"},
            tags: {name: "login"}
        }
    )
    const token = String(res.json()).replace("Auth_token: ", "")


    check(res, {
        "check-login-success-code": (r)=>r.status == 200,
        "check-login-success-response": (r)=>String(r.body).startsWith(`"Auth_token: `),
        "check-token-correct": ()=> checkToken(token,account.username)
    })
    sleep(0.5)
}
