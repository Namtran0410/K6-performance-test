import exec, {test} from "k6/execution"
import { Options } from "k6/options"
import {check, sleep}from "k6"
import http from "k6/http"

export const options: Options = { 
    scenarios: {
        incorrect_password: {
            executor: "ramping-vus",
            stages: [
                {"duration": "1m", target: 10},
                {"duration": "3m", target: 10},
                {"duration": "1m", target: 0}
            ],
            tags: { tc: "PF-LG-003" }
        }
    },
    thresholds: {
        "http_req_duration{name:login_fail}": ["p(95)< 1200"],
        "checks{name:login_fail}": ["rate>=0.99"]
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
    const res = http.post(`${BASE_URL}/signup`,
        JSON.stringify({
            username, password
        }),
        {headers: {
            "Content-type": "application/json"
        }}
    )
    if(res.status !== 200 || String(res.body).includes(`errorMessage`))
        test.abort(`Error message: ${res.body}`)
    const newPassword = `WrongPass!123`
    const user:Account = {
        username,
        password: newPassword
    }
    return user
}

export function setup(){
    return createUser()
}
export default function(user: Account){
    const payload = JSON.stringify(user)
    const res = http.post(`${BASE_URL}/login`, payload,{
        headers: {"Content-type": "application/json"},
        tags: {name: "login_fail"}
    })
    check(res, {
        "status 200": (r) => r.status === 200,
        "wrong password message": (r) => r.json("errorMessage") === "Wrong password."
    }, { name: "login_fail" })
    sleep(1)
}
