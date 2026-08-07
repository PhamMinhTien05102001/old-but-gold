# TODO

Danh sách việc cần làm tiếp (ưu tiên chưa xếp cứng — làm theo nhu cầu).

> **Phân biệt nguồn ý**
>
> - Mục **1–3** bên dưới: yêu cầu của bạn.
> - Mục **S1–S5** (phần *Đề xuất*): gợi ý thêm từ agent — không phải backlog bắt buộc.

---

# Yêu cầu của bạn

## 1. Bộ filter thời gian linh hoạt hơn

### Vấn đề hiện tại

Chart chỉ có các preset cứng: `1D` | `7D` | `30D` | `3M` | `All` (xem [`CHART.md`](CHART.md), [`filterHistory`](src/lib/history.ts)).

Khi chọn **1D**, hệ thống lấy cutoff = “từ giờ hiện tại lùi lại 1 ngày” — tức chỉ xem được **ngày hôm nay / 24h gần nhất**, không chọn được:

- Một ngày cụ thể trong quá khứ (vd. 02/08/2026)
- Một khoảng tùy ý (vd. từ 01/08 → 05/08)

### Hướng làm

Thêm (hoặc thay một phần) filter bằng **date picker**:

| Chế độ | Mô tả |
|--------|--------|
| **Một ngày** | Chọn 1 ngày → chart chỉ hiện điểm trong ngày đó (00:00 → 23:59 theo giờ tiệm / `pointTimeMs`) |
| **Khoảng A → B** | Chọn từ ngày A đến ngày B (inclusive) |

Preset cũ (`1D`, `7D`, …) có thể giữ song song để thao tác nhanh; date picker dùng khi cần nhìn sâu vào ngày/khoảng cụ thể.

### Gợi ý kỹ thuật

- UI: date picker (single) + range picker, hoặc một control hỗ trợ cả hai mode
- Logic lọc: mở rộng `filterHistory` nhận `fromMs` / `toMs` thay vì chỉ `range` preset
- Trục X / domain chart cần khớp khoảng đã chọn (không bị “kéo” về gần hiện tại)

---

## 2. Crawl theo từng cửa hàng (config & lịch riêng)

### Vấn đề hiện tại

Crawl dùng **một** adaptive interval `X` chung cho cả hệ thống ([`CRAWL.md`](CRAWL.md), `schedule.json`):

- Heartbeat Actions mỗi 30 phút
- Sau crawl: giá đổi → rút X; giá không đổi → nới X (min 30p, max 120p)
- Khi tới hạn thì crawl **mọi** source trong `sources.json` cùng lúc

Một số tiệm ít đổi giá → crawl thưa (3–4 tiếng) là đủ.  
Một số tiệm cập nhật thường xuyên → cần crawl dày hơn (vd. cố định **30 phút/lần**), không nên bị kéo theo interval chung khi các tiệm khác “im”.

### Hướng làm

Tách lịch / config **theo từng cửa hàng** (store / kind), ví dụ trong `sources.json` hoặc file schedule per-store:

| Cửa hàng | Ví dụ config |
|----------|----------------|
| Tiệm ít đổi | Adaptive: min 30p → max 180–240p (3–4 tiếng) |
| Tiệm hay cập nhật | Fixed: luôn crawl mỗi **30 phút** (không nhân đôi X khi giá đứng) |

Mỗi store có:

- `lastCrawlAt` / `nextCrawlAt` riêng
- `intervalMinutes` (hoặc mode `adaptive` | `fixed`) riêng
- Khi heartbeat chạy: chỉ crawl những store đã tới `nextCrawlAt`

### Gợi ý kỹ thuật

- Mở rộng `schedule.json` → state theo store (hoặc `schedule/{store}.json`)
- Orchestrator `scrape.mjs`: skip từng store thay vì skip cả run
- Workflow vẫn heartbeat `*/30`; logic “có crawl hay không” nằm ở config từng store

---

## 3. Lưu thêm các loại vàng khác (98, 97, …)

### Vấn đề hiện tại

Parser / history chủ yếu theo dõi loại vàng chính của từng tiệm (vd. 9999, 999.9 — xem [`CRAWL.md`](CRAWL.md)). Các loại khác trên bảng giá (vàng 98, 97, …) chưa được crawl và lưu đầy đủ.

### Hướng làm

- Mở rộng parser từng tiệm để lấy thêm các dòng loại vàng cần theo dõi
- Định nghĩa `kind` / `label` rõ ràng cho từng loại (vd. `hkn_98`, `kkvh_97`, …) để không lẫn với loại đang có
- Append vào cùng `history/{store}/history.json` (hoặc tách file nếu cần) khi `sourceUpdatedAt` / giá của kind đó đổi
- UI sau này: cho chọn loại vàng trên tab cửa hàng / summary (không bắt buộc làm cùng lúc với crawl)

### Lưu ý

- Không phải tiệm nào cũng có đủ 98 / 97 — config theo store (chỉ crawl kind tồn tại trên site)
- Chart / filter hiện gắn `kinds` theo tab store — cần mở rộng khi thêm nhiều kind

---

# Đề xuất (agent suggest)

> Các mục dưới đây là ý cải thiện / UI thêm — đánh dấu **`[SUGGEST]`** để dễ lọc khỏi yêu cầu gốc.

---

## S1. `[SUGGEST]` Cao nhất trong khoảng (cạnh Thấp nhất)

### Bối cảnh

[`PriceCards`](src/components/PriceCards.tsx) đã có cột **Thấp nhất · {range}** (min `sell` trong `rangeHistory`). Chưa có **Cao nhất** đối xứng.

### Hướng làm

- Thêm `highestSellPoint` (mirror `lowestSellPoint`) trên cùng `rangeHistory` + `kind`
- UI: cạnh / dưới khối “Thấp nhất”, hiện giá cao nhất + ngày (`pointTimeMs`) theo cùng format `vi-VN`
- Khi đổi range / date picker (mục 1), cả thấp nhất và cao nhất đều theo khoảng đang chọn

### Lưu ý

- Chỉ tính trên `sell` (đồng bộ chart hiện tại); nếu sau này có toggle mua/bán thì áp dụng cùng rule
- Không có data trong khoảng → giữ copy “Chưa có dữ liệu” như thấp nhất

---

## S2. `[SUGGEST]` Highlight điểm đổi giá trên chart

### Bối cảnh

Chart đang **line-only**, `dot={false}` — chi tiết chỉ qua hover ([`CHART.md`](CHART.md), [`PriceChart`](src/components/PriceChart.tsx)). Trong một ngày / khoảng hẹp, khó nhìn nhanh lúc nào tiệm **đổi giá** (khác với lúc chỉ đổi `sourceUpdatedAt` nhưng giá đứng — các điểm giữa đã bị `collapseSamePricePlateaus` bỏ).

### Hướng làm

- Sau khi collapse plateau: mọi đỉnh còn lại mà `sell` ≠ điểm trước đã là “điểm đổi giá” (cộng điểm đầu series)
- Vẽ marker nhỏ chỉ tại các điểm đó (không bật `dot` cho mọi vertex), ví dụ:
  - `dot` custom / `activeDot` cố định kích thước nhỏ
  - hoặc series phụ chỉ gồm các điểm change
- Tooltip giữ nguyên; optional: label ngắn (+/− đ so với điểm trước) khi hover change-point

### Lưu ý

- Filter dài (`30D` / `All`) có nhiều change → marker dễ rối: cân nhắc chỉ bật khi range ngắn (`1D` / `7D` / ngày cụ thể), hoặc toggle “Hiện điểm đổi giá”
- Không nhầm với “lần crawl”: chỉ highlight khi **giá** đổi, không phải mỗi lần scrape

---

## S3. `[SUGGEST]` Panel trạng thái crawl trên UI

### Bối cảnh

App đọc history + `storeStatus`, nhưng user không thấy lịch crawl: `lastCrawlAt`, `nextCrawlAt`, `intervalMinutes` trong [`schedule.json`](public/data/schedule.json) ([`CRAWL.md`](CRAWL.md)). Trên GitHub Pages dễ có cảm giác “sao giá chưa cập nhật?” trong khi bot chưa tới hạn crawl.

### Hướng làm

- Fetch / reuse `schedule.json` (context đã có health — mở rộng đọc schedule nếu chưa)
- UI gọn (footer tab store, hoặc block nhỏ trên Summary / header app):
  | Trường | Hiển thị |
  |--------|----------|
  | Lần crawl gần nhất | `lastCrawlAt` → relative + absolute `vi-VN` |
  | Lần crawl kế tiếp | `nextCrawlAt` (hoặc “đã tới hạn / đang chờ Actions”) |
  | Khoảng X hiện tại | `intervalMinutes` phút |
  | Kết quả lần trước | `lastResult` + `lastChangedKinds` nếu có |
  | Health từng tiệm | đã có `storeStatus` — gắn cạnh tên store |

- Khi đã làm **crawl per-store** (mục 2): panel hiện từng store thay vì một dòng global

### Lưu ý

- Đây là metadata vận hành, không phải giá — giữ UI nhỏ, không chen hero/chart
- `nextCrawlAt` là kế hoạch bot; Actions heartbeat ~30p nên “tới hạn” ≠ “đã crawl xong ngay lập tức”

---

## S4. `[SUGGEST]` Nén / archive history khi file phình

### Bối cảnh

Mỗi lần `sourceUpdatedAt` đổi → append [`history/{store}/history.json`](public/data/history). Sau mục 2 (crawl 30p cố định) + mục 3 (nhiều kind 98/97/…), file JSON trên repo / Pages sẽ phình → chậm load, diff Git lớn, Actions commit nặng.

### Hướng làm (chọn một hoặc kết hợp)

| Chiến lược | Ý tưởng |
|------------|---------|
| **Giữ dày gần đây, gộp cũ** | VD. 7–14 ngày gần: giữ mọi điểm đổi giờ/giá; cũ hơn: chỉ giữ điểm **đổi giá** hoặc 1 điểm / ngày (OHLC đơn giản: open/high/low/close `sell`) |
| **Tách theo tháng** | `history/hkn/2026-08.json` + manifest; UI load tháng cần thiết / ghép khi chọn range |
| **Archive ngoài hot path** | Đẩy file cũ vào `public/data/archive/` hoặc release asset; app mặc định chỉ load cửa sổ gần |

### Gợi ý kỹ thuật

- Script bảo trì (chạy tay hoặc định kỳ trong scrape): đọc history → compact → ghi lại; không xóa tip hiện tại
- Document rule trong `CRAWL.md` / `CHART.md` (chart `All` với data đã gộp sẽ thưa hơn — chấp nhận được)
- Ưu tiên làm **trước hoặc cùng** khi bật crawl dày + nhiều kind

---

## S5. `[SUGGEST]` Ngưỡng giá “quan tâm” (local)

### Bối cảnh

Chưa có cảnh báo khi giá bán xuống mức mình muốn mua. Site tĩnh (Pages) → không cần backend: lưu preference trên máy user.

### Hướng làm

- Input trên tab store (hoặc Summary): “Báo khi bán ≤ … đ” theo `kind` / store
- Persist `localStorage` (key theo `store` + `kind`)
- Khi `sell` hiện tại ≤ ngưỡng:
  - Badge / tô màu trên `PriceCards` + hàng Summary
  - Optional: `Notification` API (xin quyền 1 lần) khi mở app và vượt ngưỡng — không có push nền nếu không mở trang
- Không có ngưỡng → UI như hiện tại

### Lưu ý

- Chỉ so với **giá hiện tại** (tip history), không backfill alert cho quá khứ trừ khi user chủ động
- Không commit ngưỡng lên git; thuần client-side
- Phân biệt rõ với health/crawl alert (đỏ cảnh báo hệ thống) vs ngưỡng giá (màu/ý nghĩa khác — tránh nhầm “lỗi crawl”)
