/**Yêu cầu rampup 100 trong 20s, hold 10s, rampdown trong 10s về 0 */
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import http from "k6/http"
import { Options } from "k6/options"


type Account = {
    username: string,
    password: string
}
const BASE_URL = 'https://api.demoblaze.com'
export const options:Options = {
    stages: [
        {"duration": "20s", target: 100},
        {"duration": "10s", target: 100},
        {"duration": "10s", target: 0}
    ],
    thresholds: {
        "http_req_duration{name:login}": ["p(95)<3300"],
        "http_req_failed{name:login}": ["rate<0.01"],
        "checks": ["rate>=0.99"] 
    }
}

function accountGeneration(): Account{
    const id = exec.vu.idInTest + "_" + exec.vu.idInInstance
    const username = `Test_${id}`
    const password = `Passwrod_${id}`
    return {username, password}
}
function createAccount(): Account{
    const userInfor = accountGeneration()
    const payload = JSON.stringify(userInfor)
    const res = http.post(`${BASE_URL}/signup`, payload, {
        headers: {"Content-Type": "application/json"},
        tags: {name: "signup"}
    })
    if(res.status !== 200) {
        test.abort(`Create Fail: ${userInfor}`)
    }
    return userInfor
}

export default function login(){
    const account = createAccount()
    const payload = JSON.stringify(account)
    const res= http.post(`${BASE_URL}/login`, payload, {
        headers: {
            "Content-type": "application/json"
        },
        tags: {name: "login"}
    })
    if(res.status !== 200){
        test.abort(`Login fail with ${account}`)
    }

    check(res, {
        "login success": (r)=> r.status == 200
    })
    sleep(1)
}
