# Deploy GitHub Pages

Repo: https://github.com/PhamMinhTien05102001/old-but-gold  
Site: https://phamminhtien05102001.github.io/old-but-gold/

## Vì sao không chỉ “bật Pages” là xong?

GitHub Pages chỉ host file tĩnh. Vite proxy (`/proxy/hkn`, …) **không chạy** trên Pages → browser bị CORS nếu gọi thẳng site tiệm.

Giải pháp:

1. **Build** UI bằng GitHub Actions, upload artifact → `actions/deploy-pages`
2. **Scrape** định kỳ ghi `public/data/history/…` trên `main`; sau scrape, Deploy chạy lại (qua `workflow_run`)
3. Local (`npm run dev`) vẫn dùng proxy live

> **Lưu ý:** Đôi khi Pages kẹt `deployment_queued` / `deployment_in_progress` rồi timeout — lỗi phía GitHub, không phải build app. Cancel run treo rồi **Re-run** hoặc đợi rồi deploy lại.

---

## Bắt buộc: Settings → Pages

Trang: https://github.com/PhamMinhTien05102001/old-but-gold/settings/pages

| Mục | Giá trị |
|-----|---------|
| **Source** | **GitHub Actions** |
| Custom domain | Để trống |
| HTTPS | Bật |

### Quyền Actions

**Settings → Actions → General → Workflow permissions** → **Read and write permissions** → Save  
(cần để scrape push `main`; deploy dùng `pages: write` + OIDC)

---

## Workflow

### [`deploy-pages.yml`](.github/workflows/deploy-pages.yml)

- Trigger: `push` `main` | `workflow_dispatch` | `workflow_run` sau scrape success
- Job `build`: `npm ci` → `npm run build` → `404.html` → upload Pages artifact
- Job `deploy`: `actions/deploy-pages`

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
2. Push → đợi **Deploy GitHub Pages** xanh (build + deploy).
3. Settings → Pages → Source = **GitHub Actions**.
4. Mở https://phamminhtien05102001.github.io/old-but-gold/ (đợi 1–2 phút, hard refresh nếu cần).

Nhánh `gh-pages` không còn dùng; có thể xóa trên GitHub nếu muốn dọn.

---

## Local

```bash
npm install
npm run scrape:force   # crawl ngay
npm run dev            # proxy live
npm run build          # base /old-but-gold/
```
