"use strict";
/** Stress test theo VU cao hơn mức bình thường và tăng theo từng bậc */
/**
 * VU: 200-300-500
 * rampup: 30s, hold :1m, down: 30s
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = void 0;
exports.default = default_1;
const http_1 = __importDefault(require("k6/http"));
const k6_1 = require("k6");
const execution_1 = __importStar(require("k6/execution"));
const options_1 = require("k6/options");
const BASE_URL = 'https://api.demoblaze.com';
exports.options = {
    stages: [
        { duration: "2m", target: 200 },
        { duration: "2m", target: 200 },
        { duration: "2s", target: 0 }
    ],
    thresholds: {
        "http_req_duration{name:addtocard}": ["p(95)<1500"],
        "http_req_failed": ["rate<0.01"],
        "checks": ["rate>0.99"]
    }
};
function getCookie() {
    const cookie = crypto.randomUUID() + execution_1.default.vu.idInTest;
    return cookie;
}
function getItems() {
    const res = http_1.default.get(`${BASE_URL}/entries`, {
        tags: { name: "getItems" }
    });
    if (res.status !== 200) {
        execution_1.test.abort(`Failed get items at ${res.status}`);
    }
    const data = res.json();
    const listItem = data.Items;
    return listItem;
}
function default_1() {
    const id = crypto.randomUUID() + execution_1.default.vu.idInTest;
    const cookie = `user=` + getCookie();
    const listProduct = getItems();
    const itemId = listProduct[0].id;
    const payload = JSON.stringify({
        id,
        cookie,
        flag: false,
        prod_id: itemId
    });
    const res = http_1.default.post(`${BASE_URL}/addtocart`, payload, {
        headers: { "Content-type": "application/json" },
        tags: { name: "addtocart" }
    });
    if (res.status !== 200) {
        execution_1.test.abort(`Fail at: ${execution_1.default.vu.idInTest}: ${res.status}`);
    }
    (0, k6_1.check)(res, {
        "Add to cart check": (r) => r.status == 200
    });
}
//# sourceMappingURL=03.addtocard.k6.stress.test.js.map