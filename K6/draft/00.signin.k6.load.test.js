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
/** Yêu cầu 100 tải trong vòng 30s */
const http_1 = __importDefault(require("k6/http"));
const k6_1 = require("k6");
const execution_1 = __importStar(require("k6/execution"));
const options_1 = require("k6/options");
const defaultVu = 100;
exports.options = {
    vus: defaultVu,
    duration: '30s',
    thresholds: {
        'http_req_duration{name:signup}': ['p(95)<4200'], // 95% of requests should be below 500ms
        'http_req_failed{name:signup}': ['rate<=0.01'],
        'http_reqs{name:signup}': ['count>100'],
        'checks': ['rate>=0.99']
    }
};
const BASE_URL = 'https://api.demoblaze.com';
function createUser() {
    const id = `${execution_1.default.vu.idInTest}_${execution_1.default.vu.iterationInScenario}`;
    const username = `Test_${Date.now()}_${id}`;
    const password = `Password_${Date.now()}_${id}`;
    return { username, password };
}
function default_1() {
    const user = createUser();
    const payload = JSON.stringify(user);
    const res = http_1.default.post(`${BASE_URL}/signup`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'signup' }
    });
    if (res.status !== 200) {
        execution_1.test.abort(`Stop test at: ${execution_1.default.instance.vusActive}`);
    }
    (0, k6_1.check)(res, {
        "Status at 200": (r) => r.status == 200
    });
    (0, k6_1.sleep)(1);
}
//# sourceMappingURL=00.signin.k6.load.test.js.map