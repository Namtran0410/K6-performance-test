import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"
const totalUser= 10

export const options: Options = {
    scenarios: {
        check_token: {
            executor: "ramping-vus",
            stages: [
                {duration: "1m", target: totalUser},
                {duration: "3m", target: totalUser},
                {duration: "1m", target: 0}
            ],
        tags: {tc: "PF-LG-004"}
        }
    },
    thresholds: {
        "http_req_duration{name:token}": ["p(95)<1500"],
        "http_req_failed{name:token}": ["rate<0.01"]
    }
}

type Account = {
    username: string,
    password: string
}
const BASE_URL='https://api.demoblaze.com'

export function signup(input: Account): Account{
    const res = http.post(`${BASE_URL}/signup`, 
        JSON.stringify(input),
        {
            headers: {
                "Content-type": "application/json"
            }
        }
    )
    if(res.status !== 200 || String(res.body).includes("errorMessage")){
        test.abort("Create Account Failed")
    }
    return input
}

export function setup(){
    const accountList: Account[]= []
    for(let start =0; start < totalUser; start ++){
        const account = signup({
            username: `Test_user_${Date.now()}_${start}`,
            password: `Password123@11`
        })
        accountList.push(account)
    }
    return accountList
}

export default function(accountList: Account[]){
    const user = accountList[(exec.vu.idInTest-1) % accountList.length]
    const loginRes = http.post(
        `${BASE_URL}/login`,
        JSON.stringify(user),
        {
            headers: {
                "Content-type": "application/json"
            },
            tags: {name: "login"}
        }
    )
    const loginOk = check(loginRes, {
        "login status 200": (r)=> r.status == 200,
        "login has token" : (r)=>String(r.body).startsWith(`"Auth_token:`)
    },
    {name: "login"})
    if(!loginOk) {
        sleep(1)
        return
    }

    const token = String(loginRes.json()).replace("Auth_token: ", "")
    const resCheck = http.post(`${BASE_URL}/check`, 
        JSON.stringify({token}),
        {
            headers: {"Content-type": "application/json"}, 
            tags: {name: "check"}
        }
    )
    check(resCheck, {
        "token status 200": (r)=> r.status === 200,
        "token belong tp user": (r)=> r.json("Item.username") === user.username,
        
    },
    {name: "check"})
    sleep(1)
}

