# Logic crawl giá vàng

Tài liệu mô tả cách hệ thống lấy và lưu giá từ các tiệm (không phụ thuộc UI).

## Vì sao cần crawl riêng?

GitHub Pages chỉ host file tĩnh. Browser gọi thẳng site tiệm sẽ bị **CORS**.  
Production đọc JSON đã crawl sẵn trong `public/data/`. Local (`npm run dev`) vẫn có thể lấy HTML live qua Vite proxy.

## Thành phần

| File | Vai trò |
|------|---------|
| [`scripts/sources.json`](scripts/sources.json) | Danh sách domain + parser (`hkn`, `kkvh`, `hn`) |
| [`scripts/scrape.mjs`](scripts/scrape.mjs) | Orchestrator crawl + adaptive X |
| [`public/data/history/{hkn,kkvh,hn}/history.json`](public/data/history) | Lịch sử + **giá hiện tại = điểm cuối**; append khi `sourceUpdatedAt` đổi |
| [`public/data/schedule.json`](public/data/schedule.json) | State khoảng X, lịch crawl, `storeStatus` |
| [`.github/workflows/scrape-gold.yml`](.github/workflows/scrape-gold.yml) | Heartbeat Actions + commit data |

Không còn file `latest/` — tránh lệch giữa snapshot và history.

## Luồng tổng quan

```text
GitHub Action (mỗi 30 phút)
  → node scripts/scrape.mjs
  → nếu chưa tới nextCrawlAt → skip (exit 0)
  → nếu tới hạn (hoặc --force) → crawl mọi source trong sources.json
  → với mỗi kind: append history chỉ khi sourceUpdatedAt khác tip cùng kind
  → so sánh buy/sell với điểm cuối history (chỉ để chỉnh X):
      giá đổi → X = max(30, X/2)
      giá không đổi → X = min(120, X*2)
  → ghi schedule.json (+ history nếu có append)
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

## History & so sánh “đổi giá”

Mỗi lần crawl **thành công** (status `ok`), từng `kind` tracked chỉ được **append** vào `history/{store}/history.json` khi `sourceUpdatedAt` (giờ tiệm, đã normalize) **khác** điểm cuối history cùng kind. Cùng giờ tiệm → bỏ qua (không nhân đôi điểm). Thiếu `sourceUpdatedAt` → không append kind đó.

`ts` vẫn là epoch ms lúc bot crawl — không dùng làm điều kiện ghi.

App (prod / test fixtures) lấy giá hiện tại từ **điểm cuối history** theo store/kind.

So sánh buy/sell với điểm cuối history chỉ dùng để **chỉnh interval X** (và ghi `lastChangedKinds`):

- Khác buy/sell → `lastResult: changed`, rút ngắn X
- Không kind nào đổi → `lastResult: unchanged`, nới X

Crawl fail → không append; `storeStatus: fallback` nếu còn history cũ.

`schedule.json` được cập nhật sau mọi lần crawl tới hạn.

## Nguồn & parse

Cấu hình trong `sources.json`. Hiện có:

- **hkn** — bảng HTML Hoa Kim Nguyên, dòng chứa `9999`; giá nhỏ (&lt; 100000) ×1000 → VND/chỉ
- **kkvh** — bảng Kim Khánh Việt Hùng, dòng `Vàng 999.9`
- **hn** — Hồng Ngọc / Mão Thiệt

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
