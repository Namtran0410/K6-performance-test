import http from "k6/http"
import encoding from "k6/encoding"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"

const base_url= 'https://api.demoblaze.com'
const R = 10
const maxVus = 50
export const options: Options = {
    scenarios: {
        "ramping-rate-login": {
            executor: "ramping-arrival-rate",
            startRate: 0,
            timeUnit: "1s",
            preAllocatedVUs: 20,
            maxVUs: maxVus,
            stages: [
                {duration: "1m", target: R},
                {duration: "3m", target: R},
                {duration: "1m", target: 0}
            ]
        },
    },
    thresholds: {
        "http_req_duration{name:check}": ["p(95)<1000"],
        "http_req_duration{name:login}": ["p(95)<1200"],
        "http_req_failed": ["rate< 0.01"],
        "checks": ["rate>=0.99"],
        "dropped_iterations":["count == 0"]
    },
}
type Account= {
    username: string,
    password: string
}
function signupFunction(account:Account):Account{
    const password = encoding.b64encode(account.password)
    const payload = JSON.stringify({username: account.username, password})

    const res = http.post(`${base_url}/signup`, payload,
        {headers: {"Content-type": "application/json"}, tags: {name: "signup"}}
    )
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Create account failed: ${res.status}: ${res.body}`)
    }
    // trả password PLAIN để fill vào ô login (frontend sẽ base64 lại -> khớp bản đã lưu)
    const returnAccount: Account = {
        username: account.username,
        password
    }
    return returnAccount
}
function loginFunction(account:Account) {
    const payload = JSON.stringify(account)
    const resLogin = http.post(`${base_url}/login`, payload, {
        headers: {"Content-type": "application/json"},
        tags: {name: "login"}
    })
    return resLogin
}

function checkFunction(token: string){
    const resCheck = http.post(`${base_url}/check`, 
        JSON.stringify({token}),
        {
            headers: {"Content-type": "application/json"}, 
            tags: {name: "check"}
        }
    )
    return resCheck
}
export function setup(): Account[]{
    const accountList: Account[] = []
    for(let vu = 0; vu < maxVus; vu ++) {
        const username = `PG_013_${Date.now()}_${vu}`
        const password = `Password_${Date.now()}`
        const account = signupFunction({username, password})
        accountList.push(account)
    }
    return accountList
}

export default function(accountList: Account[]){
    const user = accountList[(exec.vu.idInTest-1) % accountList.length]
    const resLogin = loginFunction(user)
    const token = String(resLogin.json()).replace("Auth_token: ", "")
    const resCheck = checkFunction(token)

    check(
        resLogin, {
        "login-status-success": (re)=> re.status === 200,
        "body-contain-token": (re) => String(re.body).startsWith(`"Auth_token: `),
        },
        {name: "login"}
    )

    check(
        resCheck, {
            "check-status-success": (re)=> re.status === 200,
            "username-matched": (re)=> user.username == re.json("Item.username")
        },
        {name: "check"}
)
}