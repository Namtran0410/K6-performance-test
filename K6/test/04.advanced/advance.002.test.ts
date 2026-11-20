import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options" 
import encoding from "k6/encoding"
import {browser, } from "k6/browser"
import { Trend } from "k6/metrics"
import { Account, utils } from "../../utils/common.ts"

const addToCartUiDuration = new Trend("add_to_cart_ui_duration", true)

const WEB_URL = "https://www.demoblaze.com" 

// người dùng add to cart liên tục và xem giỏ hàng qua api
// người dùng add to cart liên tục và xem giỏ hàng qua browser

export const options: Options = {
    scenarios: {
        cart_api: {
            executor: "constant-arrival-rate",
            duration: "2m",
            timeUnit: "1s",
            rate: 2,
            startTime: "0s",
            preAllocatedVUs: 8,
            maxVUs: 16,
            exec: "executionCartApi"
        },
        cart_browser: {
            executor: "constant-vus",
            duration: "1m",
            vus: 1,
            startTime: "1m",
            exec: "executionCartBrowser",
            options: {browser: {type: "chromium"}}
        }
    },
    thresholds: {
        "add_to_cart_ui_duration": ["p(75)<2500"],
        "http_req_duration{scenario:cart_api,name:add-to-cart}": ["p(95)<1200"],
        "http_req_duration{scenario:cart_api,name:view-cart}":["p(95)<1200"],
        "http_req_failed{scenario:cart_api}":["rate<0.01"],
        "checks{scenario:cart_api}":["rate>0.99"],
        "checks{scenario:cart_browser}":["rate>0.99"]
    }
}

export function executionCartApi(){
    const cookie = crypto.randomUUID()
    const cartRes = utils.cart.addToCart(cookie, 1, false)
    const viewCart = utils.cart.viewCart(cookie, false)

    check(cartRes, {
        "cart-res-status": (r)=> r.status === 200
    })

    check(viewCart, {
        "cart-view-status": (r)=> r.res.status == 200,
    })
    sleep(1)
}

const PRODUCTS = [1, 2, 8, 10]

export async function executionCartBrowser(){
    const page = await browser.newPage()
    try {
        // xoay vòng sản phẩm theo số thứ tự vòng lặp: 1 → 2 → 8 → 10 → 1 ...
        const prodId = PRODUCTS[exec.vu.iterationInScenario % PRODUCTS.length]
        await page.goto(`${WEB_URL}/prod.html?idp_=${prodId}`)

        // nút "Add to cart" hiện sau khi JS tải xong thông tin sản phẩm
        const addBtn = page.locator('a[onclick^="addToCart"]')
        await addBtn.waitFor({ state: "visible" })

        // "Product added" là alert của trình duyệt: k6 browser tự đóng alert
        // và không có sự kiện "dialog", nên chờ response của /addtocart
        // (trang hiện alert ngay sau khi response này về).
        // Phải đăng ký chờ TRƯỚC khi bấm, nếu không có thể lỡ mất response.
        const start = Date.now()
        const addResponse = page.waitForResponse(/\/addtocart/, { timeout: 10000 })
        await addBtn.click()
        const res = await addResponse
        addToCartUiDuration.add(Date.now()-start)
        check(res, {
            "browser-add-to-cart-status-ok": (r) => r !== null && r.status() === 200,
        })
    } finally {
        await page.close()
    }
    sleep(1)
}