# Logic crawl giá vàng

Tài liệu mô tả cách hệ thống lấy và lưu giá từ các tiệm (không phụ thuộc UI).

## Vì sao cần crawl riêng?

GitHub Pages chỉ host file tĩnh. Browser gọi thẳng site tiệm sẽ bị **CORS**.  
Production đọc JSON đã crawl sẵn trong `public/data/`. Local (`npm run dev`) vẫn có thể lấy HTML live qua Vite proxy.

## Thành phần

| File | Vai trò |
|------|---------|
| [`scripts/sources.json`](scripts/sources.json) | Danh sách domain + parser (`hkn`, `kkvh`) |
| [`scripts/scrape.mjs`](scripts/scrape.mjs) | Orchestrator crawl + adaptive X |
| [`public/data/latest/{hkn,kkvh}.json`](public/data/latest) | Snapshot giá mới nhất theo tiệm |
| [`public/data/history/{hkn,kkvh}/history.json`](public/data/history) | Lịch sử — **chỉ append khi giá đổi** |
| [`public/data/schedule.json`](public/data/schedule.json) | State khoảng X và lịch crawl tiếp theo |
| [`.github/workflows/scrape-gold.yml`](.github/workflows/scrape-gold.yml) | Heartbeat Actions + commit data |

## Luồng tổng quan

```text
GitHub Action (mỗi 30 phút)
  → node scripts/scrape.mjs
  → nếu chưa tới nextCrawlAt → skip (exit 0)
  → nếu tới hạn (hoặc --force) → crawl mọi source trong sources.json
  → so sánh buy/sell với latest/{store}.json
  → giá đổi: append history/{store}/history.json + X = max(30, X/2)
  → giá không đổi: không append history + X = min(120, X*2)
  → ghi latest/{store}.json + schedule.json
  → commit/push nếu file đổi
```

`workflow_dispatch` (chạy tay trên Actions) luôn gọi `--force`.

## Adaptive interval (X)

| Tham số | Giá trị |
|---------|---------|
| Mặc định / max | **120 phút** (2 giờ) |
| Min | **30 phút** |
| Heartbeat cron | `*/30 * * * *` (Actions không đổi cron động) |

Sau mỗi lần crawl thành công:

- **Có đổi giá** → `X = max(30, floor(X / 2))`
- **Không đổi giá** → `X = min(120, X * 2)`
- `nextCrawlAt = lastCrawlAt + X` (lưu ISO datetime UTC)

`schedule.json` ví dụ:

```json
{
  "intervalMinutes": 120,
  "minIntervalMinutes": 30,
  "maxIntervalMinutes": 120,
  "lastCrawlAt": "2026-08-01T02:04:14.062Z",
  "nextCrawlAt": "2026-08-01T04:04:14.062Z",
  "lastResult": "unchanged",
  "lastChangedKinds": []
}
```

`nextCrawlAt: null` (hoặc file mới) → lần chạy đầu crawl ngay.

## So sánh “đổi giá”

Với mỗi `kind` (vd. `hkn_nhan_9999`, `kkvh_9999`):

- Lấy `buy` / `sell` từ crawl mới
- So với cùng `kind` trong `latest/{store}.json`
- Khác → kind đó được append vào `history/{store}/history.json`
- Không có kind nào đổi → **không ghi** history

`latest/{store}.json` và `schedule.json` vẫn được cập nhật sau mọi lần crawl (kể cả giá không đổi) để biết lần check gần nhất và X mới.

## Nguồn & parse

Cấu hình trong `sources.json`. Hiện có:

- **hkn** — bảng HTML Hoa Kim Nguyên, dòng chứa `9999`; giá nhỏ (&lt; 100000) ×1000 → VND/chỉ
- **kkvh** — bảng Kim Khánh Việt Hùng, dòng `Vàng 999.9`

Thêm domain: thêm entry vào `sources.json` + hàm parser tương ứng trong `scrape.mjs`.

## Chạy local

```bash
npm run scrape         # tôn trọng nextCrawlAt (có thể skip)
npm run scrape:force   # luôn crawl + cập nhật X / data
```

## Lưu ý

- Giá web chỉ mang tính tham khảo.
- Actions cần quyền **Read and write** để push JSON.
- Push data có thể kích hoạt lại workflow deploy Pages (rebuild UI với data mới).
