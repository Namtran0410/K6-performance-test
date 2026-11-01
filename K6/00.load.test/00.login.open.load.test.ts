import http from 'k6/http';
import {sleep, check} from 'k6';
import exec, { test } from 'k6/execution';
import {Options} from 'k6/options';

export const options: Options = {
    scenarios: {
        signup: {
            executor: "ramping-arrival-rate",
            startRate: 0,
            timeUnit: "1s",
            preAllocatedVUs: 100,
            maxVUs: 500,
            stages: [
                {duration: "30s", target: 100},
                {duration: "30s", target: 100},
                {duration: "1m", target: 0}
            ]
        }
    },
    thresholds: {
        "http_req_duration{name: signup}": [
            {
                threshold: "p(95)<=10000",
                abortOnFail: true,
                delayAbortEval:"30s"
            }
        ],
        "http_req_failed{name:signup}": [
            {
                threshold: "rate<0.01",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ]
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

export default function(){
    const user = createUser()
    const payload = JSON.stringify(user)
    const res = http.post(`${BASE_URL}/signup`, payload, {
        headers: {'Content-Type': 'application/json'},
        tags: {name: 'signup'}
    })

    if(res.status !== 200){
        test.abort(`Stop test at: ${exec.instance.vusActive}`)
    }

    check(res, {
        "Status at 200": (r)=> r.status == 200,
        "No error message": (r)=> !String(r.body).includes("errorMessage")
    })
    sleep(1)
}
