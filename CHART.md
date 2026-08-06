# Logic hiển thị dữ liệu lên chart

Tài liệu mô tả pipeline từ `history.json` → điểm trên biểu đồ (không phụ thuộc scrape).

## Nguồn dữ liệu

| Nguồn | Vai trò |
|-------|---------|
| `public/data/history/{hkn,kkvh,hn}/history.json` | Production |
| `public/data-test/history/...` | Khi `VITE_USE_TEST_DATA=true` |

Mỗi record (`PricePoint`):

```ts
{
  ts: number              // lúc scrape ghi (epoch ms)
  store, kind, label
  buy, sell
  sourceUpdatedAt?: string // giờ tiệm, vd. "19:35:06 06/08/2026"
}
```

**Giá trị Y trên chart:** chỉ **bán ra** (`sell`).  
**Trục X:** thời gian tiệm qua `pointTimeMs` (ưu tiên `sourceUpdatedAt`, không có thì dùng `ts`).

Code: [`src/lib/normalize.ts`](src/lib/normalize.ts) (`pointTimeMs`), [`src/components/StoreTab.tsx`](src/components/StoreTab.tsx), [`src/components/PriceChart.tsx`](src/components/PriceChart.tsx).

## Pipeline

```text
history (tất cả store)
  → filterHistory(range, kinds của tab)
  → buildChartRows          // 1 row / 1 record history
  → collapseSamePricePlateaus
  → PriceChart (Recharts)
       · Line connectNulls
       · ChangeDot (chấm)
       · Tooltip / activeDot khi hover
```

```mermaid
flowchart TD
  hist[history.json]
  filt[filterHistory range + kind]
  rows[buildChartRows]
  collapse[collapseSamePricePlateaus]
  chart[PriceChart]
  hist --> filt --> rows --> collapse --> chart
```

## Bước 1 — Lọc theo range & kind

[`filterHistory`](src/lib/history.ts):

- Range: `1D` | `7D` | `30D` | `3M` | `All` (cutoff theo `pointTimeMs`, không theo `ts` crawl)
- Chỉ giữ `kind` của cửa hàng đang mở (HKN / KKVH / HN)

## Bước 2 — Map sang điểm chart

`buildChartRows`:

- Mỗi history record → `{ ts: pointTimeMs(p), [sellKey]: p.sell }`
- Sort tăng dần theo `ts`
- `sellKey`: `nhan_sell` | `sell` | `hn_sell` tùy kind

Không merge live/proxy vào chart — chỉ data trong history file.

## Bước 3 — Gộp plateau cùng giá

`collapseSamePricePlateaus` — tránh chồng chấm khi nhiều scrape cùng `sell` sát giờ trên trục dài (30D):

- Duyệt theo thời gian
- **Bỏ** điểm giữa nếu `sell == điểm trước` **và** `sell == điểm sau`
- **Giữ** đầu + cuối mỗi đoạn giá không đổi

| Input (sell theo thời gian) | Output chart |
|-----------------------------|--------------|
| 100 → 100 → 100 | giữ đầu + cuối (2 điểm, đoạn ngang) |
| 100 → 100 → 105 | giữ cả 3? → bỏ giữa cùng giá: đầu(100), cuối plateau(100), rồi 105 → **2 điểm 100 + 1 điểm 105** |
| 100 → 105 (cách 30 phút) | **giữ cả 2** (khác giá, không gộp) |

History.json **không** bị xóa record — chỉ rút gọn khi vẽ.

## Bước 4 — Vẽ (PriceChart)

- Line `type="monotone"`, `connectNulls`
- **ChangeDot:** hiện chấm khi
  - điểm đầu series, hoặc
  - điểm cuối series, hoặc
  - `sell` khác điểm hợp lệ liền trước
- Hover: `activeDot` + tooltip (`toLocaleString('vi-VN')` theo epoch X)

Hai điểm **khác giá** nhưng sát nhau trên filter 30D vẫn có thể trông chồng (scale hẹp); hover hoặc filter `1D`/`7D` tách rõ hơn. Đó là giới hạn pixel, không phải mất data.

## Label “Nguồn cập nhật” trên StoreTab

Lấy từ **điểm cuối history** của kind (`latestPoint`), không lấy giờ proxy live — khớp điểm cuối chart / JSON.

## File liên quan

| File | Việc |
|------|------|
| [`src/lib/history.ts`](src/lib/history.ts) | `filterHistory`, `latestPoint`, `previousPoint` |
| [`src/lib/normalize.ts`](src/lib/normalize.ts) | `pointTimeMs`, `sourceUpdatedAtToMs` |
| [`src/components/StoreTab.tsx`](src/components/StoreTab.tsx) | build + collapse + truyền `PriceChart` |
| [`src/components/PriceChart.tsx`](src/components/PriceChart.tsx) | Recharts, ChangeDot, domain Y |
| [`CRAWL.md`](CRAWL.md) | Cách scrape **ghi** history (khác UI chart) |
