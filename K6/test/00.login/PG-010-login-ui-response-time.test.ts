import {browser} from "k6/browser"
import { check } from "k6"
import { Options } from "k6/options"
import http from "k6/http"
import {test}from "k6/execution"
import {Trend}from "k6/metrics"
import encoding from "k6/encoding"
const api_url = "https://api.demoblaze.com"
const base_url = "https://www.demoblaze.com/"
const loginUiDuration = new Trend("login_ui_duration", true)

type Account = {
    username: string,
    password: string
}

export const options: Options = {
    scenarios: {
        "welcome-test": {
            executor: "per-vu-iterations",
            vus: 1,
            iterations: 5,
            options: {browser: {type: "chromium"}}
        }
    },
    thresholds: {
        "login_ui_duration": ["p(75)<3000"],
        "checks": ["rate>0.99"]
    }
}


export function setup(): Account {
    const username = `this_test_${Date.now()}`
    const password = `this_pass_${Date.now()}`

    // signup gửi password dạng base64 để khớp với việc frontend demoblaze
    // tự base64 password khi login qua UI (logIn() -> b64EncodeUnicode)
    const payload = JSON.stringify({username, password: encoding.b64encode(password)})

    const res = http.post(`${api_url}/signup`, payload,
        {headers: {"Content-type": "application/json"}, tags: {name: "signup"}}
    )
    if(res.status !== 200 || String(res.body).includes("errorMessage")) {
        test.abort(`Create account failed: ${res.status}: ${res.body}`)
    }
    // trả password PLAIN để fill vào ô login (frontend sẽ base64 lại -> khớp bản đã lưu)
    return {username, password}
}

export default async function(account: Account){
    const page = await browser.newPage()
    try {
        // 1. Mở Home, mở modal Log in
        await page.goto(base_url)
        await page.locator("#login2").click()
        await page.waitForSelector("#logInModal", { state: "visible" })

        // 2. Điền username + password
        await page.locator("#loginusername").fill(account.username)
        await page.locator("#loginpassword").fill(account.password)

        // 3. Bắt đầu đếm giờ, click 'Log in' (nút submit trong modal)
        const start = Date.now()
        await page.locator("button[onclick='logIn()']").click()

        // 4. Dừng giờ khi 'Welcome <user>' hiện
        await page.waitForSelector("#nameofuser", { state: "visible" })
        const duration = Date.now() - start
        loginUiDuration.add(duration)

        // ── Checks ──
        const welcomeText = await page.locator("#nameofuser").textContent()
        const welcomeOk = (welcomeText ?? "").includes("Welcome")
        const logoutOk = await page.locator("#logout2").isVisible()
        check(page, {
            "welcome <user> visible": () => welcomeOk,
            "log out visible": () => logoutOk,
        })
    } finally {
        await page.close()
    }
}