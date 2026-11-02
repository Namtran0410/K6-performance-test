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
exports.default = default_1;
const http_1 = __importDefault(require("k6/http"));
const k6_1 = require("k6");
const execution_1 = __importStar(require("k6/execution"));
const options_1 = require("k6/options");
const BASE_URL = 'https://api.demoblaze.com';
exports.options = {
    scenarios: {
        login: {
            executor: "ramping-arrival-rate",
            startRate: 100,
            timeUnit: "1s",
            preAllocatedVUs: 200,
            maxVUs: 1000,
            stages: [
                { duration: "5m", target: 500 }
            ]
        }
    },
    thresholds: {
        "http_req_duration{name: signup}": [
            {
                threshold: "p(95)<=5000",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ],
        "http_req_failed{name:singup}": [
            {
                threshold: "rate<0.01",
                abortOnFail: true,
                delayAbortEval: "30s"
            }
        ]
    }
};
function default_1() {
    const id = execution_1.default.vu.idInTest;
    const res = http_1.default.post(`${BASE_URL}/signup`, JSON.stringify({
        username: `Test_${id}`,
        password: `Password_${id}`
    }), {
        headers: { "Content-type": "application/json" },
        tags: { name: "signup" }
    });
    if (res.status !== 200) {
        execution_1.test.fail(`View fail at: ${execution_1.default.vu.idInTest}`);
    }
    (0, k6_1.check)(res, {
        "Check view cart": (r) => r.status == 200
    });
}
//# sourceMappingURL=07.signup.k6.breakpoint.test.js.map