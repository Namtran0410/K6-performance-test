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
        { duration: "3m", target: 200 },
        { duration: "2s", target: 0 }
    ],
    thresholds: {
        "http_req_duration{name:viewcart}": ["p(95)<=1000"],
        "http_req_failed{name:viewcart}": ["rate<0.01"],
        "checks": ["rate>=0.99"]
    }
};
function default_1() {
    const cookie = crypto.randomUUID() + `${execution_1.default.vu.idInTest}`;
    const payload = JSON.stringify({
        cookie,
        flag: false
    });
    const res = http_1.default.post(`${BASE_URL}/viewcart`, payload, {
        headers: { "Content-type": "application/json" },
        tags: { name: "viewcart" }
    });
    if (res.status !== 200) {
        execution_1.test.fail(`View fail at: ${execution_1.default.vu.idInTest}`);
    }
    (0, k6_1.check)(res, {
        "Check view cart": (r) => r.status == 200
    });
}
//# sourceMappingURL=02.viewcart.k6.stress.test.js.map