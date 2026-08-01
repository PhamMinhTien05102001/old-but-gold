# Old But Gold

App React theo dõi giá vàng 9999 (Vite + TypeScript + Tailwind + React Router).

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- React Router
- Recharts
- Cheerio (scrape Node trong `scripts/`)

## Scripts

```bash
npm install
npm run dev            # dev server + Vite proxy (CORS)
npm run build          # production build (base: /old-but-got/)
npm run preview        # preview build + proxy
npm run scrape         # crawl theo lịch adaptive
npm run scrape:force   # crawl ngay (bỏ qua nextCrawlAt)
npm run format         # Prettier
npm run lint           # oxlint
```

## Cấu trúc

```
src/
  routes.ts                 # path + page components
  pages/*/index.tsx         # Hkn, Kkvh, Compare, Market
  components/               # UI (StoreTab, charts, …)
  context/GoldPricesContext.tsx
  lib/                      # fetch, parse, history, SJC
scripts/
  scrape.mjs                # crawl adaptive
  sources.json              # danh sách domain
public/data/                # latest.json, history.json, schedule.json
.github/workflows/          # deploy-pages + scrape-gold
```

## Routes

| Path | Page |
|------|------|
| `/` | Hoa Kim Nguyên |
| `/kkvh` | Kim Khánh Việt Hùng |
| `/compare` | So sánh |
| `/market` | Thị trường SJC |

`base` Vite: `/old-but-got/` (GitHub Pages project site).

## Tài liệu khác

- [CRAWL.md](./CRAWL.md) — logic crawl / adaptive interval / data files
- [DEPLOY.md](./DEPLOY.md) — deploy GitHub Pages
