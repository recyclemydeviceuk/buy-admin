# BuyUpon admin

Admin panel for the CashMyMobile buy side (Vite + React 18 + TypeScript + Tailwind).
Talks only to the BuyUpon API ([recyclemydeviceuk/buycmm-backend](https://github.com/recyclemydeviceuk/buycmm-backend))
under `/api/buy/admin/*`. The storefront lives in [recyclemydeviceuk/buy-cmm](https://github.com/recyclemydeviceuk/buy-cmm).

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL and VITE_STOREFRONT_URL
npm run dev            # http://localhost:3004
npm run build          # type-check + production build to dist/
```

Sign-in is by a six-digit code emailed to an admin address; access and every
control are governed by the role's permissions (Team & roles). Screens: dashboard,
orders and order detail, products with the variant matrix, inventory and bulk
pricing, customers, reviews, enquiries, newsletter, settings (store, delivery,
catalogue, featured, payments, notifications, system), team and roles with a
permission matrix, activity log, and ⌘K search.

`src/types/storefront.ts` mirrors `frontend/src/types.ts` in buy-cmm; keep them in
sync when the storefront contract changes.
