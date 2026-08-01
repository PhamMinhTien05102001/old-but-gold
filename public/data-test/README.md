# data-test (local only)

Khi `.env` có `VITE_USE_TEST_DATA=true`, app đọc JSON trong folder này thay vì crawl/proxy.

1. Copy `latest.example.json` → `latest.json`, `history.example.json` → `history.json`
2. Sửa giá test tùy ý
3. Đặt `VITE_USE_TEST_DATA=true` trong `.env`, chạy `npm run dev`

`latest.json` / `history.json` bị gitignore; chỉ commit `*.example.json`.
