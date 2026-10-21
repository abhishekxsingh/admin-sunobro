# SunoBro Admin Panel

Next.js 15 (App Router) / React 19 / Tailwind v4 / TypeScript, pnpm 9. See `../CLAUDE.md` for the cross-service overview.

## Dev

```bash
pnpm dev -p 3002   # package.json does not pin a port
pnpm lint
pnpm build
```

Deploys to Azure App Service `sunobro-admin` on push to `main` (`.github/workflows/azure-deploy.yml`). Work on `dev`, merge to `main`.

## Structure

```
src/
├── app/
│   ├── page.tsx                 redirects to /admin
│   ├── admin/
│   │   ├── page.tsx + AdminDashboardClient.tsx   stats cards + quick-nav
│   │   ├── orders/      OrdersClient.tsx          order queue + SYNC_QIKINK + NEW ORDER; drawer loads full detail, PUSH_TO_QIKINK / SYNC_STATUS, cancel warning
│   │   │                NewOrderPanel.tsx         admin-created orders: product/variant picker, shipping, prepaid vs COD, push now
│   │   ├── team/        TeamClient.tsx — Team page (admin role only; ops see a locked notice): add member (name, email, role admin/ops, generated one-time password or own), credentials card with COPY LOGIN MESSAGE, inline role select, deactivate/reactivate, reset password, remove. Backend /admin/members
│   │   ├── coupons/     CouponsClient.tsx (filters LIVE/SCHEDULED/ENDED, switch on/off, edit, delete, expand → orders that used it) + CouponForm.tsx (presets Festival / Seasonal / General / For customers, code generator, % or ₹, cap, min order, dates, total + per-customer limits, first order only, show at checkout, customer search picker)
│   │   ├── products/    ProductsClient.tsx        product form (size × colour grid: Store SKU + colour image per row; ADD COLOUR block also adds missing sizes to an existing colour — saved with SAVE PRODUCT; status review/draft/active); PRODUCT SHEET download + IMPORT SHEET
│   │   │                ProductCatalogTable.tsx   ALL / IN REVIEW / LIVE / DRAFT tabs, click-to-rename, PUBLISH/UNPUBLISH, expand → colours (image + on/off switch) → size chips (on/off)
│   │   │                SheetImportPanel.tsx      upload .xlsx → server preview (dryRun) → APPLY IMPORT
│   │   │                QikinkExportPanel.tsx     step 1: upload Qikink My Products CSV → preview → products in review
│   │   │                VariationsPanel.tsx       step 2 (per product): paste Product Variations table + image link per colour → READ TABLE → SAVE
│   │   │                ColourEditors.tsx         ColourEntryForm (shared with the edit form) + manual entry inside the expanded row: ADD COLOUR (name + image + Store SKU per size; sizes from the Qikink size range; paste a SKU column into the first box), + SIZE on a colour card, click a thumbnail to change that colour's image (POST /admin/products/:id/variants, PUT …/colour-image)
│   │   ├── inventory/   InventoryClient.tsx       per-variant stock (CRITICAL ≤5 / LOW ≤20 / OPTIMAL)
│   │   ├── settings/    SettingsClient.tsx        store settings (display only); live Qikink status, CHECK_SKUS, SYNC_ORDERS
│   │   ├── profile/     ProfileClient.tsx         identity from /admin/auth/me, edit + password change
│   │   └── login/       LoginClient.tsx           login form + theme toggle
│   ├── demo-access/route.ts     dev shortcut — localhost only, open-redirect safe
│   ├── globals.css              Tailwind v4, dark default, html.light overrides
│   └── layout.tsx               no-flash theme script + JetBrains Mono
├── components/  admin-sidebar.tsx, logo.tsx, multi-select.tsx (dropdown with checkboxes, search, add-your-own, chips — used for the product form's grid Sizes/Colours), status.tsx (icon badges for order / product / Qikink status, Spinner, EmptyState — icons from lucide-react 1.x; reuse these instead of hand-rolled badges)
├── hooks/use-theme.ts           dark/light toggle, localStorage key sb_admin_theme
├── middleware.ts                guards /admin/* by sb_admin_session cookie presence
└── lib/
    ├── (public/SunoBro-Product-Sheet.xlsx)  the product sheet template served at /SunoBro-Product-Sheet.xlsx
    └── api/
        ├── client.ts            fetch wrapper, credentials: 'include', never renders raw HTML error bodies
        ├── endpoints.ts         adminAuthApi, adminApi (stats/inventory/orders/orderDetail/updateOrderStatus), adminProductsApi (incl. bulkCreate, syncQikink), adminProfileApi, qikinkApi (status/syncProducts/syncOrders); adminApi also has pushOrderToQikink / syncOrderFromQikink
        └── types.ts             AdminOrder, QueueOrder (with qikink* / trackingLink / awb), AdminProduct, InventoryItem, QikinkSyncResult …
```

## API base URL

The browser always calls same-origin `/api/*`; `next.config.ts` proxies it to `BACKEND_URL` (falls back to `NEXT_PUBLIC_API_BASE_URL`, then the Azure backend). This is what makes login work in production: the `sb_admin_session` cookie belongs to the admin's own domain, so `middleware.ts` can see it, and Azure's platform CORS doesn't apply.

## Auth / middleware

- Session = `sb_admin_session` httpOnly cookie set by the backend (name overridable via `ADMIN_SESSION_COOKIE`).
- `middleware.ts` only checks the cookie exists; the backend does real JWT verification.
- In `NODE_ENV=development` **on localhost/127.0.0.1 only**, auth is bypassed entirely.

## Theme system

- Dark by default (CSS vars on `:root`); light via `html.light`.
- Inline script in `layout.tsx` reads `sb_admin_theme` before hydration (no flash).
- `technical-border` utility uses `var(--technical-border-color)`.

## Visual conventions

- Font `JetBrains Mono` everywhere; icons `lucide-react`; animation `motion/react`
- Labels in SCREAMING_SNAKE_CASE (`SYNC_ALL`, `ORDER_STATUS`)
- Borders via `technical-border`

## Environment (`.env.local`, template `.env.example`)

```
BACKEND_URL=https://preflight-hdfabqd3apc5bjfu.centralindia-01.azurewebsites.net
ADMIN_SESSION_COOKIE=sb_admin_session
NEXT_PUBLIC_SITE_URL=http://localhost:3002
```
