/** Yêu cầu 100 tải trong vòng 30s */
import http from 'k6/http';
import {sleep, check} from 'k6';
import exec, { test } from 'k6/execution';
import {Options} from 'k6/options';
const defaultVu = 100

export const options: Options = {
    vus: defaultVu,
    duration: '30s',
    thresholds: {
        'http_req_duration{name:signup}': ['p(95)<4200'], // 95% of requests should be below 500ms
        'http_req_failed{name:signup}': ['rate<=0.01'],
        'http_reqs{name:signup}': ['count>100'],
        'checks': ['rate>=0.99']
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
        "Status at 200": (r)=> r.status == 200
    })
    sleep(1)
}

