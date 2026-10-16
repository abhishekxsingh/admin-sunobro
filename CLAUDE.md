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
│   │   ├── products/    ProductsClient.tsx        product CRUD with a size × colour variant grid; one Qikink SKU per row (pattern fill helper), MAPPED x/y badge, ACTIVE locked until fully mapped, trackInventory toggle, catalog CSV template + import
│   │   ├── inventory/   InventoryClient.tsx       per-variant stock (CRITICAL ≤5 / LOW ≤20 / OPTIMAL)
│   │   ├── settings/    SettingsClient.tsx        store settings (display only); live Qikink status, CHECK_SKUS, SYNC_ORDERS
│   │   ├── profile/     ProfileClient.tsx         identity from /admin/auth/me, edit + password change
│   │   └── login/       LoginClient.tsx           login form + theme toggle
│   ├── demo-access/route.ts     dev shortcut — localhost only, open-redirect safe
│   ├── globals.css              Tailwind v4, dark default, html.light overrides
│   └── layout.tsx               no-flash theme script + JetBrains Mono
├── components/  admin-sidebar.tsx, logo.tsx
├── hooks/use-theme.ts           dark/light toggle, localStorage key sb_admin_theme
├── middleware.ts                guards /admin/* by sb_admin_session cookie presence
└── lib/
    ├── csv.ts                   catalog CSV (one row per variant: product_name, slug, price, images `|`-separated, size, color, qikink_sku, …) → grouped products; CATALOG_CSV_TEMPLATE
    └── api/
        ├── client.ts            fetch wrapper, credentials: 'include', never renders raw HTML error bodies
        ├── endpoints.ts         adminAuthApi, adminApi (stats/inventory/orders/orderDetail/updateOrderStatus), adminProductsApi (incl. bulkCreate, syncQikink), adminProfileApi, qikinkApi (status/syncProducts/syncOrders); adminApi also has pushOrderToQikink / syncOrderFromQikink
        └── types.ts             AdminOrder, QueueOrder (with qikink* / trackingLink / awb), AdminProduct, InventoryItem, QikinkSyncResult …
```

## API base URL

`NEXT_PUBLIC_API_BASE_URL`, **defaulting to the deployed Azure backend** (`https://preflight-hdfabqd3apc5bjfu.centralindia-01.azurewebsites.net`). Set it to `http://localhost:4000` in `.env.local` for local backend work. `next.config.ts` also rewrites `/api/*` → `BACKEND_URL`, but the client calls the backend directly (proxying would drop `Set-Cookie`).

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
NEXT_PUBLIC_API_BASE_URL=https://preflight-hdfabqd3apc5bjfu.centralindia-01.azurewebsites.net
ADMIN_SESSION_COOKIE=sb_admin_session
NEXT_PUBLIC_SITE_URL=http://localhost:3002
```
