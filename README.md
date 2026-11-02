# K6 Performance Test

Hướng dẫn cài đặt môi trường để chạy performance test bằng [Grafana k6](https://grafana.com/docs/k6/latest/).

Script k6 viết bằng JavaScript nhưng chạy trên runtime riêng của k6, không chạy trên Node.js. Node.js và npm được dùng để quản lý package hỗ trợ phát triển, ví dụ `@types/k6` để editor gợi ý code.

## Yêu cầu môi trường

| Công cụ | Phiên bản đang dùng |
| --- | --- |
| k6 | v2.3.0 |
| Node.js | v24.21.0 |
| npm | 11.19.0 |

## 1. Cài đặt k6

### Ubuntu / Debian

```bash
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### macOS

```bash
brew install k6
```

### Windows

```powershell
winget install k6 --source winget
```

### Docker

Không cần cài k6 lên máy:

```bash
docker run --rm -i grafana/k6 run - < K6/smoke.js
```

## 2. Kiểm tra cài đặt

```bash
k6 version
```

Kết quả mong đợi có dạng:

```text
k6 v2.3.0 (commit/e088784614, go1.26.8, linux/amd64)
```

## 3. Cài đặt Node.js và npm

Cài Node.js qua [nvm](https://github.com/nvm-sh/nvm), npm đi kèm Node.js:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 24
```

Kiểm tra:

```bash
node -v
npm -v
```

Khởi tạo project và cài type definition cho k6, chạy từ thư mục gốc của repo:

```bash
npm init -y
npm install --save-dev @types/k6 typescript
```

Thêm `node_modules/` vào `.gitignore`, và commit `package.json` cùng `package-lock.json`. Từ lần sau, chỉ cần chạy `npm ci` để cài lại.

### Cấu hình TypeScript

`tsconfig.json` chỉ phục vụ editor và kiểm tra type, `k6 run` không cần file này. Tạo file ở thư mục gốc của repo (không dùng cấu hình mặc định của `tsc --init` vì không hợp với script k6):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "types": ["k6"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["K6/**/*.ts"]
}
```

Kiểm tra type:

```bash
npx tsc -p tsconfig.json
```

Lệnh không in gì nghĩa là không có lỗi. Sau khi đổi `tsconfig.json`, trong VS Code nhấn `Ctrl+Shift+P` và chọn **TypeScript: Restart TS Server**.

## 4. Chạy thử test đầu tiên

Tạo file `K6/smoke.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://quickpizza.grafana.com';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get(BASE_URL);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

Chạy test từ thư mục gốc của repo:

```bash
k6 run K6/smoke.js
```

Test đạt khi `checks_failed` bằng `0.00%` và các threshold có dấu `✓`. Nếu threshold không đạt, k6 trả về exit code khác 0, nên có thể dùng trực tiếp trong CI.

> `quickpizza.grafana.com` là trang demo công khai của Grafana, chỉ dùng để kiểm tra môi trường. Chỉ chạy load test trên hệ thống bạn có quyền test.

## 5. Chạy với hệ thống cần test

Truyền URL qua biến môi trường, không ghi cứng trong script:

```bash
k6 run -e BASE_URL=https://staging.example.com K6/smoke.js
```

## 6. Xuất báo cáo

Báo cáo HTML (có thể mở trực tiếp bằng trình duyệt):

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=report.html k6 run K6/smoke.js
```

Trong lúc test chạy, xem dashboard trực tiếp tại <http://127.0.0.1:5665>.

Test quá ngắn sẽ không tạo được báo cáo (log báo `report generation was skipped`). Thời lượng 5 giây bị bỏ qua, 30 giây tạo được.

Tóm tắt kết quả dạng JSON:

```bash
k6 run --summary-export=summary.json K6/smoke.js
```

## Xử lý lỗi thường gặp

| Lỗi | Cách xử lý |
| --- | --- |
| `k6: command not found` | Cài lại theo mục 1, rồi mở terminal mới |
| `npm: command not found` | Chạy `source ~/.nvm/nvm.sh`, hoặc cài lại theo mục 3 |
| `sudo gpg -k` hoặc `--recv-keys` lỗi keyserver | Kiểm tra mạng/proxy, cho phép cổng 80 tới `keyserver.ubuntu.com`, rồi chạy lại |
| `apt-get update` lỗi `NO_PUBKEY` | Chạy lại lệnh `--recv-keys` ở mục 1 |
| `Cannot find module 'k6/...'` trong VS Code | Chạy `npm ci`, tạo `tsconfig.json` theo mục 3, rồi Restart TS Server |
| `TS1295`, `TS1287` hoặc `TS1484` khi chạy `tsc` | Dùng `tsconfig.json` ở mục 3 thay cho cấu hình của `tsc --init` |
| `too many open files` khi chạy nhiều VU | Tăng giới hạn file descriptor: `ulimit -n 65536` |
| `bind: address already in use` khi bật dashboard | Đổi cổng: `K6_WEB_DASHBOARD_PORT=5666` |

Tổng kết 5 loại
Loại	Tải	Thời lượng	Kết quả
Load	Bình thường	Vài phút	Pass/fail theo threshold
Stress	Vượt mức bình thường, tăng theo bậc	10 phút trở lên	Bậc nào hệ thống bắt đầu xuống cấp
Spike	Vọt lên trong vài giây	Vài phút	Lỗi lúc đỉnh, thời gian hồi phục
Soak	Bình thường, giữ rất lâu	Vài giờ	Có lỗi tích tụ theo thời gian không
Breakpoint	Tăng RPS liên tục đến khi hỏng	Đến khi bị dừng	Con số RPS tối đa