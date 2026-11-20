import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options" 
import encoding from "k6/encoding"
import {browser, } from "k6/browser"
import { Trend } from "k6/metrics"
import { Account, utils } from "../../utils/common.ts"

const loginUIduration = new Trend("login_ui_duration", true)

const WEB_URL = "https://www.demoblaze.com"      // trang web (utils.base_url là địa chỉ API)
const PLAIN_PASSWORD = "ThisisPassword"          // UI gõ bản gốc, API cần bản Base64

export const options: Options = {
    scenarios: {
        api_load: {
            executor: "constant-arrival-rate",
            rate: 2,
            timeUnit: "1s",
            startTime: "0s",
            duration: "6m",
            preAllocatedVUs: 7,
            maxVUs: 14,
            exec: "api_load_exec"
        },
        browser_user: {
            executor: "constant-vus",
            duration: "5m",
            startTime: "1m",
            vus: 1,
            options: {browser: {type: "chromium"}},
            exec: "browser_load_exec"
        }
    },
    thresholds: {
        "http_req_duration{scenario:api_load,name:login_api}": ["p(95)<1200"],
        "login_ui_duration":["p(75)<3000"],
        "checks": ["rate>0.99"],
        "dropped_iterations": ["count==0"],
        // "browser_web_vital_lcp":
    }
}
export function setup(): Account {
    const baseAccount = {
        username: `Prf-${Date.now()}`,
        password: encoding.b64encode(PLAIN_PASSWORD)
    }
    const {account} = utils.auth.signup(baseAccount)
    return account
}
export function api_load_exec(account: Account) {
    const {res: res_login, token} = utils.auth.login(account)
    const loginOk = check(res_login, {
        "status-lg-ok": (r) =>r.status == 200,
        "token-lg-ok": ()=> token !== null
    })
    if(!token) return 
    const {res: res_check, username} = utils.auth.check(token)
    const resOk = check(res_check, {
        "status-ck-ok": (r)=> r.status === 200,
        "check-ck-ok": (r)=> username == account.username
    })
    sleep(1+Math.random()*2)
}

export async function browser_load_exec(account: Account){
    const page = await browser.newPage()
    try {
        await page.goto(WEB_URL)
        // 1. Chờ product cards hiện (list load bằng JS nên phải chờ)
        const firstCard = await page.waitForSelector("#tbodyid .card", { state: "visible" })

        // 2. Check "product list visible"
        const productsOk = await firstCard.isVisible()
        check(page, {
        "product list visible": () => productsOk,
        })

        // 3. Click nút "Log in" trên navbar
        await page.locator("#login2").click()

        // 4. Chờ modal đăng nhập hiện, rồi check "login modal visible"
        const modal = await page.waitForSelector("#logInModal", { state: "visible" })
        const modalOk = await modal.isVisible()
        check(page, {
        "login modal visible": () => modalOk,
        })

        // 5. Điền thông tin (UI gõ mật khẩu gốc, trang tự mã hoá Base64)
        await page.locator("#loginusername").fill(account.username)
        await page.locator("#loginpassword").fill(PLAIN_PASSWORD)

        // Bắt đầu đo ngay trước khi bấm, dừng khi "Welcome <user>" hiện ra
        const start = Date.now()
        await page.locator('#logInModal button[onclick="logIn()"]').click()
        await page.waitForFunction(
            (u: string) => document.querySelector("#nameofuser")?.textContent === `Welcome ${u}`,
            { timeout: 10000 },
            account.username
        )
        loginUIduration.add(Date.now() - start)

        // Check "Welcome <user>" đúng tên tài khoản
        const welcomeText = await page.locator("#nameofuser").textContent()
        check(page, {
            "welcome user visible": () => welcomeText === `Welcome ${account.username}`,
        })
    } finally {
        await page.close()
    }
}