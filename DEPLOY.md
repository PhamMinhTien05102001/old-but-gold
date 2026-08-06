# Deploy GitHub Pages

Repo: https://github.com/PhamMinhTien05102001/old-but-gold  
Site: https://phamminhtien05102001.github.io/old-but-gold/

## Vì sao không chỉ “bật Pages” là xong?

GitHub Pages chỉ host file tĩnh. Vite proxy (`/proxy/hkn`, …) **không chạy** trên Pages → browser bị CORS nếu gọi thẳng site tiệm.

Giải pháp:

1. **Build** UI bằng GitHub Actions, publish folder `dist` lên branch **`gh-pages`**
2. **Scrape** định kỳ ghi `public/data/history/…` trên `main`; sau scrape, Deploy chạy lại (qua `workflow_run`)
3. Local (`npm run dev`) vẫn dùng proxy live

> **Lưu ý (2026-08):** `actions/deploy-pages` (OIDC / artifact) hay kẹt `deployment_queued` rồi `Timeout reached, aborting!` — lỗi phía GitHub Pages queue, không phải build app. Workflow hiện **không dùng** action đó nữa.

---

## Bắt buộc: Settings → Pages

Trang: https://github.com/PhamMinhTien05102001/old-but-gold/settings/pages

| Mục | Giá trị |
|-----|---------|
| **Source** | **Deploy from a branch** |
| **Branch** | `gh-pages` / `/ (root)` |
| Custom domain | Để trống |
| HTTPS | Bật |

Sau lần Deploy đầu tiên thành công, branch `gh-pages` sẽ xuất hiện (do `peaceiris/actions-gh-pages` tạo). Nếu chưa có branch: chạy **Actions → Deploy GitHub Pages → Run workflow**, rồi mới chọn branch trong Settings.

### Quyền Actions

**Settings → Actions → General → Workflow permissions** → **Read and write permissions** → Save  
(cần để scrape push `main` và deploy push `gh-pages`)

---

## Workflow

### [`deploy-pages.yml`](.github/workflows/deploy-pages.yml)

- Trigger: `push` `main` | `workflow_dispatch` | `workflow_run` sau scrape success
- `npm ci` → `npm run build` → copy `404.html` → publish `dist/` lên `gh-pages`

### [`scrape-gold.yml`](.github/workflows/scrape-gold.yml)

- Cron ~30 phút; manual `--force`
- Chi tiết: [CRAWL.md](./CRAWL.md)

### App

- `vite` `base: '/old-but-gold/'`
- Prod đọc `history/{store}/history.json` (+ `schedule.json`)
- DEV: proxy live

---

## Sau khi push

1. **Cancel** mọi run Deploy đang treo/`deployment_queued` (nếu còn).
2. Push workflow mới → đợi **Deploy GitHub Pages** xanh.
3. Settings → Pages → Source = **branch `gh-pages`**.
4. Mở https://phamminhtien05102001.github.io/old-but-gold/ (đợi 1–2 phút, hard refresh nếu cần).

---

## Local

```bash
npm install
npm run scrape:force   # crawl ngay
npm run dev            # proxy live
npm run build          # base /old-but-gold/
```
