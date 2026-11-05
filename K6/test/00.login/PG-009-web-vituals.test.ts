import {browser, } from "k6/browser"
import {check} from "k6"
import { Options } from "k6/options"  
const BASE_URL= 'https://www.demoblaze.com/'
export const options: Options = {
    scenarios: {
        "web_vitual_test": {
            executor: "per-vu-iterations",
            vus: 1,
            iterations: 5,
            options: {browser: {type: "chromium"}}
        }
    },
    thresholds: {
    browser_web_vital_lcp:  ["p(75)<2500"],
    browser_web_vital_fcp:  ["p(75)<1800"],
    browser_web_vital_cls:  ["p(75)<0.1"],
    browser_web_vital_ttfb: ["p(75)<800"],
    }
}

export default async function(){
    const page = await browser.newPage()
    try {
        await page.goto(BASE_URL)
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
    } finally {
        await page.close()
    }
}