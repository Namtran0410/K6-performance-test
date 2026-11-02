"use strict";
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
exports.default = login;
/**Yêu cầu rampup 100 trong 20s, hold 10s, rampdown trong 10s về 0 */
const k6_1 = require("k6");
const execution_1 = __importStar(require("k6/execution"));
const http_1 = __importDefault(require("k6/http"));
const options_1 = require("k6/options");
const BASE_URL = 'https://api.demoblaze.com';
exports.options = {
    stages: [
        { "duration": "20s", target: 100 },
        { "duration": "10s", target: 100 },
        { "duration": "10s", target: 0 }
    ],
    thresholds: {
        "http_req_duration{name:login}": ["p(95)<3300"],
        "http_req_failed{name:login}": ["rate<0.01"],
        "checks": ["rate>=0.99"]
    }
};
function accountGeneration() {
    const id = execution_1.default.vu.idInTest + "_" + execution_1.default.vu.idInInstance;
    const username = `Test_${id}`;
    const password = `Passwrod_${id}`;
    return { username, password };
}
function createAccount() {
    const userInfor = accountGeneration();
    const payload = JSON.stringify(userInfor);
    const res = http_1.default.post(`${BASE_URL}/signup`, payload, {
        headers: { "Content-Type": "application/json" },
        tags: { name: "signup" }
    });
    if (res.status !== 200) {
        execution_1.test.abort(`Create Fail: ${userInfor}`);
    }
    return userInfor;
}
function login() {
    const account = createAccount();
    const payload = JSON.stringify(account);
    const res = http_1.default.post(`${BASE_URL}/login`, payload, {
        headers: {
            "Content-type": "application/json"
        },
        tags: { name: "login" }
    });
    if (res.status !== 200) {
        execution_1.test.abort(`Login fail with ${account}`);
    }
    (0, k6_1.check)(res, {
        "login success": (r) => r.status == 200
    });
    (0, k6_1.sleep)(1);
}
//# sourceMappingURL=01.login.k6.load.test.js.map