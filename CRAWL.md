# Logic crawl giá vàng

Tài liệu mô tả cách hệ thống lấy và lưu giá từ các tiệm (không phụ thuộc UI).

## Vì sao cần crawl riêng?

GitHub Pages chỉ host file tĩnh. Browser gọi thẳng site tiệm sẽ bị **CORS**.  
Production đọc JSON đã crawl sẵn trong `public/data/`. Local (`npm run dev`) vẫn có thể lấy HTML live qua Vite proxy.

## Thành phần

| File | Vai trò |
|------|---------|
| [`scripts/stores/{id}.json`](scripts/stores/) | Config từng tiệm: url, parser, crawl `adaptive` \| `fixed` |
| [`scripts/stores/_template.json`](scripts/stores/_template.json) | Mẫu copy khi thêm tiệm (file `_` bị bỏ qua khi load) |
| [`scripts/scrape.mjs`](scripts/scrape.mjs) | Orchestrator: due per-store + PARSERS |
| [`public/data/history/{store}/history.json`](public/data/history) | Lịch sử + **giá hiện tại = điểm cuối**; append khi `sourceUpdatedAt` đổi |
| [`public/data/schedule.json`](public/data/schedule.json) | Runtime mọi tiệm: `stores.{id}` (nextCrawlAt, X, status, …) |
| [`.github/workflows/scrape-gold.yml`](.github/workflows/scrape-gold.yml) | Heartbeat Actions + commit data |

Policy (`scripts/stores/`) tách khỏi runtime (`schedule.json`).  
`mode` / min-max / interval cố định chỉ nằm ở config — `schedule.json` không lặp lại (trừ **X hiện tại** của store adaptive).

## Luồng tổng quan

```text
GitHub Action (mỗi 30 phút)
  → node scripts/scrape.mjs
  → load scripts/stores/*.json (bỏ _*)
  → đọc schedule.json → stores.{id}
  → với mỗi store: nếu chưa tới nextCrawlAt → bỏ qua store đó
  → nếu không store nào due → skip (exit 0)
  → crawl chỉ các store due (hoặc --force: tất cả)
  → với mỗi kind: append history chỉ khi sourceUpdatedAt khác tip cùng kind
  → cập nhật interval / nextCrawlAt **riêng** trong stores.{id}
  → ghi schedule.json (+ history nếu có append)
  → commit/push nếu file đổi
```

`workflow_dispatch` (chạy tay trên Actions) luôn gọi `--force`.

## Crawl modes (per store)

Cấu hình trong `scripts/stores/{id}.json` → `crawl`:

| Mode | Hành vi |
|------|---------|
| **`fixed`** | Luôn `nextCrawlAt = now + intervalMinutes` (vd. HN: **30** phút). Không half/double. |
| **`adaptive`** | Sau crawl: giá đổi → `X = max(min, floor(X/2))`; không đổi → `X = min(max, X*2)`. |

Mặc định hiện tại:

| Store | Mode | Interval |
|-------|------|----------|
| `hkn`, `kkvh` | adaptive | min 30 / max 120 (seed X≈60) |
| `hn` | fixed | 30 |

Heartbeat cron vẫn `*/30`. Store adaptive có thể skip nhiều heartbeat; store fixed 30p gần như crawl mỗi lần heartbeat.

`schedule.json` chỉ giữ **runtime** (bot cập nhật). Ví dụ:

```json
{
  "stores": {
    "hkn": {
      "intervalMinutes": 60,
      "lastCrawlAt": "…",
      "nextCrawlAt": "…",
      "lastResult": "unchanged",
      "lastChangedKinds": [],
      "status": "ok",
      "rows": 1
    },
    "hn": {
      "lastCrawlAt": "…",
      "nextCrawlAt": "…",
      "lastResult": "unchanged",
      "lastChangedKinds": [],
      "status": "ok",
      "rows": 1
    }
  }
}
```

| Field trong `stores.{id}` | Ý nghĩa |
|---------------------------|---------|
| `intervalMinutes` | Chỉ **adaptive**: X hiện tại (half/double). Fixed lấy interval từ config. |
| `lastCrawlAt` / `nextCrawlAt` | Lịch lần crawl |
| `lastResult` / `lastChangedKinds` | Kết quả lần crawl gần nhất |
| `status` / `rows` / `error?` | Health cho UI |

`mode`, `minIntervalMinutes`, `maxIntervalMinutes`, interval cố định → chỉ trong [`scripts/stores/{id}.json`](scripts/stores/).

UI đọc `stores.{id}.status`. `nextCrawlAt` thiếu/null → lần chạy đầu crawl store đó ngay.

## History & so sánh “đổi giá”

Mỗi lần crawl **thành công** (status `ok`), từng `kind` tracked chỉ được **append** vào `history/{store}/history.json` khi `sourceUpdatedAt` (giờ tiệm, đã normalize) **khác** điểm cuối history cùng kind. Cùng giờ tiệm → bỏ qua (không nhân đôi điểm). Thiếu `sourceUpdatedAt` → không append kind đó.

`ts` vẫn là epoch ms lúc bot crawl — không dùng làm điều kiện ghi.

App (prod / test fixtures) lấy giá hiện tại từ **điểm cuối history** theo store/kind.

So sánh buy/sell với điểm cuối history chỉ dùng để **chỉnh interval X** trên store **adaptive** (và ghi `lastChangedKinds`):

- Khác buy/sell → `lastResult: changed`, rút ngắn X
- Không kind nào đổi → `lastResult: unchanged`, nới X

Crawl fail → không append; `status: fallback` nếu còn history cũ.

## Nguồn & parse

Mỗi tiệm: file [`scripts/stores/{id}.json`](scripts/stores/) + hàm parser trong `PARSERS` ([`scrape.mjs`](scripts/scrape.mjs)). Hiện có:

- **hkn** — bảng HTML Hoa Kim Nguyên, dòng chứa `9999`; giá nhỏ (&lt; 100000) ×1000 → VND/chỉ
- **kkvh** — bảng Kim Khánh Việt Hùng, dòng `Vàng 999.9`
- **hn** — Hồng Ngọc / Mão Thiệt

### Thêm tiệm mới

1. Copy [`scripts/stores/_template.json`](scripts/stores/_template.json) → `scripts/stores/{id}.json`, điền `id`, `url`, `parser`, `crawl`
2. Nếu HTML khác layout hiện có: thêm parser vào `PARSERS` + kind trong `isTrackedKind` (và UI/types nếu cần tab mới)
3. Chạy `npm run scrape:force` — cập nhật `schedule.json` + history khi có data

## Chạy local

```bash
npm run scrape         # chỉ crawl store đã tới nextCrawlAt
npm run scrape:force   # crawl mọi store + cập nhật lịch / data
```

## Lưu ý

- Giá web chỉ mang tính tham khảo.
- Actions cần quyền **Read and write** để push JSON.
- Push data có thể kích hoạt lại workflow deploy Pages (rebuild UI với data mới).
