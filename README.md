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

## Scripts

- `npm run dev` — phát triển + proxy
- `npm run scrape` — scrape giá → `public/data`
- `npm run build` — build production (`base: /old-but-got/`)
- `npm run preview` — xem build kèm proxy
