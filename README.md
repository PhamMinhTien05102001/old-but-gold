# Old But Gold

Theo dõi giá vàng **9999** từ Hoa Kim Nguyên và Kim Khánh Việt Hùng (bảng + biểu đồ), kèm tham chiếu lịch sử SJC.

## Chạy local

```bash
npm install
npm run dev
```

Mở URL Vite in ra (ví dụ `http://localhost:5174`). **Bắt buộc** chạy qua `npm run dev` hoặc `npm run preview` vì app dùng Vite proxy để tránh CORS khi lấy HTML giá vàng.

- Refresh: lấy giá 2 tiệm, ghi snapshot vào `localStorage`
- Tab Thị trường SJC: CSV lịch sử công khai (3 tháng+)

## Scripts

- `npm run dev` — phát triển + proxy
- `npm run build` — build production
- `npm run preview` — xem build kèm proxy
