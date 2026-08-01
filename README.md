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
cp .env.example .env   # hoặc tự tạo .env
npm run dev            # VITE_USE_TEST_DATA=true → data-test; false → proxy live
npm run build          # production build (base: /old-but-got/)
npm run preview        # preview build + proxy
npm run scrape         # crawl theo lịch adaptive
npm run scrape:force   # crawl ngay (bỏ qua nextCrawlAt)
npm run format         # Prettier
npm run lint           # oxlint
```

Trong `.env`:

```
VITE_USE_TEST_DATA=true   # dùng public/data-test/
VITE_USE_TEST_DATA=false  # mặc định: proxy (dev) / public/data (prod)
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
public/data/                # data chuẩn (crawl / pull)
public/data-test/           # fixtures local khi VITE_USE_TEST_DATA=true
.github/workflows/          # deploy-pages + scrape-gold
```

`base` Vite: `/old-but-got/` (GitHub Pages project site).

## Tài liệu khác

- [CRAWL.md](./CRAWL.md) — logic crawl / adaptive interval / data files
- [DEPLOY.md](./DEPLOY.md) — deploy GitHub Pages
