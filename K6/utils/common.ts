import http from "k6/http"

export type Account = {
    username: string,
    password: string
}

export type CartItem = {
    id: string,         // id của dòng trong giỏ (dùng cho deleteitem)
    cookie: string,
    prod_id: number
}

export const base_url = __ENV.BASE_URL || 'https://api.demoblaze.com'
const headers = { "Content-type": "application/json" }

export class Authentication {
    signup(account: Account){
        const payload = JSON.stringify(account)
        const res = http.post(`${base_url}/signup`, payload,
            {
                headers,
                tags: {name: "signup"}
            }
        )
        // demoblaze trả 200 kể cả khi lỗi, lỗi nằm trong body (errorMessage)
        const ok = res.status === 200 && !String(res.body).includes("errorMessage")
        return {res, account, ok}
    }

    login(account: Account){
        const payload = JSON.stringify(account)
        const res = http.post(`${base_url}/login`, payload,
            {
                headers,
                tags: {name: "login"}
            }
        )
        // thành công: body là chuỗi "Auth_token: <token>", lỗi: { errorMessage }
        const token = String(res.body).includes("Auth_token")
            ? String(res.json()).replace("Auth_token: ", "")
            : null
        return {res, token}
    }

    // xác thực token, trả về username nếu token hợp lệ
    check(token: string){
        const payload = JSON.stringify({token})
        const res = http.post(`${base_url}/check`, payload,
            {
                headers,
                tags: {name: "check"}
            }
        )
        // thành công: { "Item": { "username", "token", "expiration" } }
        const username = String(res.body).includes("Item")
            ? (res.json("Item.username") as string)
            : null
        return {res, username}
    }
}

// cookie: guest id (flag = false) hoặc token sau khi login (flag = true)
export class Cart {
    addToCart(cookie: string, prod_id: number, flag: boolean){
        const payload = JSON.stringify({
            id: crypto.randomUUID(),
            cookie,
            prod_id,
            flag
        })
        const res = http.post(`${base_url}/addtocart`, payload,
            {
                headers,
                tags: {name: "add-to-cart"}
            }
        )
        return res
    }

    // trả về danh sách dòng trong giỏ (rỗng nếu lỗi)
    viewCart(cookie: string, flag: boolean){
        const payload = JSON.stringify({cookie, flag})
        const res = http.post(`${base_url}/viewcart`, payload,
            {
                headers,
                tags: {name: "view-cart"}
            }
        )
        const items = String(res.body).includes("Items")
            ? (res.json("Items") as CartItem[])
            : []
        return {res, items}
    }

    // nút Purchase trên web gọi /deletecart: đặt hàng xong thì xoá toàn bộ giỏ
    purchase(cookie: string){
        const payload = JSON.stringify({cookie})
        const res = http.post(`${base_url}/deletecart`, payload,
            {
                headers,
                tags: {name: "purchase"}
            }
        )
        return res
    }
}

export const utils = {
    base_url,
    auth: new Authentication(),
    cart: new Cart()
}
