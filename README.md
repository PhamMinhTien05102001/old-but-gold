# Old But Gold

Theo dõi giá vàng **9999** từ Hoa Kim Nguyên và Kim Khánh Việt Hùng (bảng + biểu đồ), kèm tham chiếu lịch sử SJC.

## Chạy local

```bash
npm install
npm run scrape   # optional: ghi public/data/*.json
npm run dev
```

Mở URL Vite in ra. Local dùng Vite proxy để tránh CORS.

## GitHub Pages

Xem chi tiết các bước deploy: [DEPLOY.md](./DEPLOY.md)

- Site: https://phamminhtien05102001.github.io/old-but-got/
- Deploy: workflow `Deploy GitHub Pages`
- Cập nhật giá: workflow `Scrape gold prices` (cron 30 phút)

## Cấu trúc chính

- `src/routes.ts` — quản lý path + label + page component
- `src/pages/` — HknPage, KkvhPage, ComparePage, MarketPage
- `src/index.css` — Tailwind v4 + theme tokens (không còn `App.css`)

## Routes

| Path       | Page                |
| ---------- | ------------------- |
| `/`        | Hoa Kim Nguyên      |
| `/kkvh`    | Kim Khánh Việt Hùng |
| `/compare` | So sánh             |
| `/market`  | Thị trường SJC      |
