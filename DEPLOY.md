# Deploy GitHub Pages — ghi chú các bước đã làm

Repo: https://github.com/PhamMinhTien05102001/old-but-got  
Site (sau khi Action xanh): https://phamminhtien05102001.github.io/old-but-got/

## Vì sao không chỉ “bật Pages” là xong?

GitHub Pages chỉ host file tĩnh. Vite proxy (`/proxy/hkn`, `/proxy/kkvh`) **không chạy** trên Pages → browser bị CORS nếu gọi thẳng 2 tiệm.

Giải pháp đã làm:

1. **Deploy** UI bằng GitHub Actions → Pages  
2. **Scrape** định kỳ (cron 30 phút) ghi `public/data/latest.json` + `history.json`  
3. App trên Pages đọc JSON đó; local (`npm run dev`) vẫn dùng proxy

---

## Bước đã làm trên GitHub (Settings → Pages)

Trang: https://github.com/PhamMinhTien05102001/old-but-got/settings/pages

| Mục | Giá trị |
|-----|---------|
| **Source** | **GitHub Actions** (đã chọn sẵn trên UI) |
| Branch deploy classic | Không dùng |
| Custom domain | Để trống |
| HTTPS | Bắt buộc / đã bật với `*.github.io` |

Pages báo *disabled* cho đến khi workflow **Deploy GitHub Pages** chạy thành công lần đầu.

Không cần đổi thêm dropdown Source nếu đã là “GitHub Actions”.

---

## Thay đổi trong code (đã thêm vào repo)

### 1. `vite.config.ts`
- `base: '/old-but-got/'` — bắt buộc vì project site nằm dưới path repo name  
- Giữ proxy cho `npm run dev` / `preview`

### 2. `.github/workflows/deploy-pages.yml`
- Trigger: push `main` + `workflow_dispatch`  
- `npm ci` → `npm run build` → upload `dist` → `actions/deploy-pages`

### 3. `.github/workflows/scrape-gold.yml`
- Cron mỗi 30 phút + chạy tay  
- `node scripts/scrape.mjs`  
- Commit + push `public/data/*.json` nếu có thay đổi

### 4. `scripts/scrape.mjs`
- Fetch HTML HKN + KKVH (cheerio), chỉ vàng 9999 / 999.9  
- Chuẩn hóa VND/chỉ, ghi `latest.json` + append `history.json`

### 5. App runtime
- **DEV**: fetch qua Vite proxy  
- **Production (Pages)**: fetch `BASE_URL/data/latest.json`  
- SJC trên Pages: raw GitHub CSV (CORS OK)  
- Merge `history.json` remote với localStorage

### 6. Seed data lần đầu
- Chạy `npm run scrape` local → tạo `public/data/latest.json` + `history.json` để site có giá ngay khi deploy

---

## Việc bạn cần làm sau khi push

1. Vào **Actions** → đợi workflow **Deploy GitHub Pages** thành công (màu xanh).  
2. (Tuỳ chọn) **Actions → Scrape gold prices → Run workflow** để cập nhật giá ngay, không chờ 30 phút.  
3. Mở: https://phamminhtien05102001.github.io/old-but-got/  
4. Nếu 404: đợi 1–2 phút, hard refresh; kiểm tra `base` trùng tên repo (`old-but-got`).

### Quyền Actions (nếu scrape không push được)

**Settings → Actions → General → Workflow permissions** → chọn **Read and write permissions** → Save.

---

## Local sau này

```bash
npm install
npm run scrape   # cập nhật JSON thủ công
npm run dev      # proxy live từ 2 tiệm
npm run build    # build với base /old-but-got/
```
