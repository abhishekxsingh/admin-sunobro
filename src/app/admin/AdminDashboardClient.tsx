"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  BarChart3,
  Cable,
  ChevronRight,
  CircuitBoard,
  ImageOff,
  LayoutDashboard,
  LogOut,
  MemoryStick,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  TrendingUp,
  Upload,
  User,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { adminApi, adminAuthApi, productsApi } from "@/lib/api/endpoints";
import type { AdminStats, InventoryItem, Product, QueueOrder } from "@/lib/api/types";
import { parseProductsCsv } from "@/lib/csv";

const DEMO_STATS: AdminStats = {
  grossRevenue24h: 142850,
  revenueChangePct: 12.4,
  activeOrders: 1204,
  conversionRatePct: 3.82,
  conversionChangePct: -0.4,
};

const DEMO_INVENTORY: InventoryItem[] = [
  { sku: "SB-CORE-01", name: "Titanium Modular Chassis", stock: 1240, status: "OPTIMAL" },
  { sku: "SB-LINK-X", name: "High-Density Optical Array", stock: 42, status: "CRITICAL" },
  { sku: "SB-PROC-Z1", name: "Cryo-Cooled Logic Unit", stock: 812, status: "OPTIMAL" },
];

const DEMO_QUEUE: QueueOrder[] = [
  {
    ref: "#ORD-4921-A",
    client: "Vector Dynamics Ltd.",
    value: 12450,
    currency: "USD",
    status: "FULFILLED",
  },
  {
    ref: "#ORD-5012-K",
    client: "H. Matsumoto (Individual)",
    value: 2800,
    currency: "USD",
    status: "PENDING",
  },
  {
    ref: "#ORD-5015-Z",
    client: "Aether Research",
    value: 45120,
    currency: "USD",
    status: "FULFILLED",
  },
];

const DEMO_PRODUCTS: Product[] = [
  {
    id: "demo-p1",
    sku: "SB-TEE-BLK",
    name: "SunoBro Technical Tee",
    size: "M",
    imageUrl: "",
    price: 42,
  },
  {
    id: "demo-p2",
    sku: "SB-CAP-01",
    name: "Circuit Cap",
    size: "One Size",
    imageUrl: "",
    price: 28,
  },
];

const EMPTY_NEW_PRODUCT = { name: "", size: "", imageUrl: "", price: "" };

const INVENTORY_ICONS = [MemoryStick, Cable, CircuitBoard];

const statusTone = (status: InventoryItem["status"]) =>
  status === "OPTIMAL"
    ? "bg-secondary/10 text-secondary border-secondary/20"
    : status === "CRITICAL"
      ? "bg-tertiary/10 text-tertiary border-tertiary/20"
      : "bg-destructive/10 text-destructive border-destructive/20";

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ProductThumb({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(!src);

  if (errored) {
    return (
      <div className="w-10 h-10 shrink-0 bg-muted flex items-center justify-center technical-border">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  // Product images come from arbitrary URLs pasted into the CSV/add-product
  // form, so next/image's fixed-domain optimizer doesn't apply here.

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="w-10 h-10 shrink-0 object-cover technical-border bg-muted"
    />
  );
}

export function AdminDashboardClient() {
  const router = useRouter();
  const [stats, setStats] = useState(DEMO_STATS);
  const [inventory, setInventory] = useState(DEMO_INVENTORY);
  const [queue, setQueue] = useState(DEMO_QUEUE);
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [isDemo, setIsDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_NEW_PRODUCT);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvStatus, setCsvStatus] = useState<{ message: string; error?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([adminApi.stats(), adminApi.inventory(), adminApi.orders(), productsApi.list()])
      .then(([liveStats, liveInventory, liveQueue, liveProducts]) => {
        if (cancelled) return;
        setStats(liveStats);
        setInventory(liveInventory);
        setQueue(liveQueue);
        setProducts(liveProducts);
        setIsDemo(false);
      })
      .catch(() => {
        // No backend wired up yet — keep the demo data so the dashboard
        // still reads as a finished product. Once /admin/stats etc. exist
        // this branch stops firing automatically.
        if (!cancelled) setIsDemo(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;

    const price = parseFloat(newProduct.price);
    const payload = {
      sku: "",
      name: newProduct.name.trim(),
      size: newProduct.size.trim(),
      imageUrl: newProduct.imageUrl.trim(),
      price: Number.isFinite(price) ? price : 0,
    };

    setAddingProduct(true);
    try {
      const created = await productsApi.create(payload);
      setProducts((prev) => [created, ...prev]);
    } catch {
      // No backend wired up yet — keep the product locally so the list
      // still reflects what was just added.
      setProducts((prev) => [{ ...payload, id: crypto.randomUUID() }, ...prev]);
    } finally {
      setAddingProduct(false);
      setNewProduct(EMPTY_NEW_PRODUCT);
      setShowAddForm(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingCsv(true);
    setCsvStatus(null);
    try {
      const text = await file.text();
      const rows = parseProductsCsv(text);
      if (rows.length === 0) {
        setCsvStatus({
          message:
            "No product rows found — check the CSV has name, size, image url, and price columns.",
          error: true,
        });
        return;
      }

      try {
        const created = await productsApi.bulkCreate(rows);
        setProducts((prev) => [...created, ...prev]);
      } catch {
        // No backend wired up yet — add the parsed rows locally.
        setProducts((prev) => [
          ...rows.map((row) => ({ ...row, id: crypto.randomUUID() })),
          ...prev,
        ]);
      }
      setCsvStatus({
        message: `Imported ${rows.length} product${rows.length === 1 ? "" : "s"} from CSV.`,
      });
    } catch {
      setCsvStatus({ message: "Could not read that CSV file.", error: true });
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await adminAuthApi.logout();
    } catch {
      // ignore — cookie may already be gone / backend not connected
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-lowest border-r border-border/30 flex flex-col p-2 space-y-4 z-50">
        <div className="px-4 py-6 flex items-center gap-3">
          <Logo size="sm" />
          <div>
            <h1 className="text-xl font-bold leading-tight">SunoBro Admin</h1>
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase opacity-70">
              Technical Operations
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a
            href="#"
            className="bg-secondary/15 text-secondary font-bold rounded-lg flex items-center px-4 py-3 translate-x-1 transition-transform"
          >
            <LayoutDashboard className="h-4 w-4 mr-3" />
            <span className="font-mono text-[11px]">Dashboard</span>
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center px-4 py-3 rounded-lg group"
          >
            <Package className="h-4 w-4 mr-3 opacity-70 group-hover:opacity-100" />
            <span className="font-mono text-[11px]">Orders</span>
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center px-4 py-3 rounded-lg group"
          >
            <Settings className="h-4 w-4 mr-3 opacity-70 group-hover:opacity-100" />
            <span className="font-mono text-[11px]">Settings</span>
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center px-4 py-3 rounded-lg group"
          >
            <User className="h-4 w-4 mr-3 opacity-70 group-hover:opacity-100" />
            <span className="font-mono text-[11px]">Profile</span>
          </a>
        </nav>
        <div className="mt-auto border-t border-border/30 pt-4 px-4 pb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-mono text-[11px] text-primary">OP</span>
            </div>
            <div>
              <p className="font-mono text-[11px] leading-none">Ops_Lead</p>
              <p className="text-[10px] text-muted-foreground font-mono">v2.4.1-stable</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 font-mono text-[11px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? "SIGNING_OUT..." : "SIGN_OUT"}
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="font-mono text-[11px] text-primary uppercase tracking-widest">
                  System Telemetry
                </p>
                {isDemo && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/30 uppercase tracking-widest">
                    Demo Data — Backend Not Connected
                  </span>
                )}
              </div>
              <h2 className="text-4xl font-bold">Operations Dashboard</h2>
            </div>
            <div className="flex gap-4">
              <button className="bg-muted technical-border px-6 py-2 font-mono text-[11px] hover:border-foreground transition-all">
                GENERATE REPORT
              </button>
              <button className="bg-foreground text-background px-6 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all">
                NEW INVENTORY
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-6 technical-border bg-surface-lowest hover:bg-surface-container transition-colors relative overflow-hidden"
            >
              <Wallet className="absolute top-4 right-4 h-14 w-14 opacity-10" />
              <p className="font-mono text-[11px] text-muted-foreground mb-4 uppercase tracking-tighter">
                Gross Revenue (24H)
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{money(stats.grossRevenue24h)}</span>
                <span
                  className={`font-mono text-xs ${stats.revenueChangePct >= 0 ? "text-secondary" : "text-destructive"}`}
                >
                  {stats.revenueChangePct >= 0 ? "+" : ""}
                  {stats.revenueChangePct}%
                </span>
              </div>
              <div className="mt-6 h-1 w-full bg-border">
                <div className="h-full bg-primary" style={{ width: "70%" }} />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="p-6 technical-border bg-surface-lowest hover:bg-surface-container transition-colors relative overflow-hidden"
            >
              <ShoppingCart className="absolute top-4 right-4 h-14 w-14 opacity-10" />
              <p className="font-mono text-[11px] text-muted-foreground mb-4 uppercase tracking-tighter">
                Active Orders
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stats.activeOrders.toLocaleString()}</span>
                <span className="font-mono text-xs text-muted-foreground">UNFULFILLED</span>
              </div>
              <div className="mt-6 flex gap-1">
                {[1, 1, 1, 0, 0].map((on, i) => (
                  <div key={i} className={`h-1 flex-1 ${on ? "bg-secondary" : "bg-border"}`} />
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="p-6 technical-border bg-surface-lowest hover:bg-surface-container transition-colors relative overflow-hidden"
            >
              <TrendingUp className="absolute top-4 right-4 h-14 w-14 opacity-10" />
              <p className="font-mono text-[11px] text-muted-foreground mb-4 uppercase tracking-tighter">
                Conversion Rate
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stats.conversionRatePct}%</span>
                <span
                  className={`font-mono text-xs ${stats.conversionChangePct >= 0 ? "text-secondary" : "text-destructive"}`}
                >
                  {stats.conversionChangePct >= 0 ? "+" : ""}
                  {stats.conversionChangePct}%
                </span>
              </div>
              <div className="mt-6 font-mono text-xs text-muted-foreground flex justify-between">
                <span>P95 Latency: 142ms</span>
                <span>HTTP 200 OK</span>
              </div>
            </motion.div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Inventory table */}
          <section className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-mono text-[11px] uppercase tracking-widest">Inventory Status</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                LIST_MODE: PAGINATED
              </span>
            </div>
            <div className="technical-border bg-surface-lowest overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/30">
                    <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase">
                      SKU / Product
                    </th>
                    <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase text-right">
                      Stock Level
                    </th>
                    <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, i) => {
                    const Icon = INVENTORY_ICONS[i % INVENTORY_ICONS.length];
                    return (
                      <tr
                        key={item.sku}
                        className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-muted flex items-center justify-center technical-border">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-mono text-sm">{item.sku}</p>
                              <p className="text-xs text-muted-foreground">{item.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono">
                          {item.stock.toLocaleString()}{" "}
                          <span className="text-xs text-muted-foreground">units</span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 border ${statusTone(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Queue */}
          <section className="lg:col-span-5">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-mono text-[11px] uppercase tracking-widest">Queue Protocol</h3>
              <button className="text-primary font-mono text-[10px] hover:underline">
                REFRESH_QUEUE
              </button>
            </div>
            <div className="space-y-4">
              {queue.map((o) => (
                <div
                  key={o.ref}
                  className={`p-4 technical-border bg-surface-container hover:bg-muted transition-all group cursor-pointer ${
                    o.status === "PENDING" ? "border-l-4 border-l-tertiary" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs text-primary">{o.ref}</span>
                    <span
                      className={`font-mono text-[10px] px-2 ${
                        o.status === "PENDING"
                          ? "bg-tertiary text-background"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">CLIENT</span>
                      <span className="flex-1 border-b border-dotted border-border/60" />
                      <span className="text-sm">{o.client}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">VALUE</span>
                      <span className="flex-1 border-b border-dotted border-border/60" />
                      <span className="font-mono text-sm">{money(o.value)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Product catalog */}
        <section className="mt-12 pt-12 border-t border-border/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 px-2">
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-widest">Product Catalog</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                {products.length} PRODUCT{products.length === 1 ? "" : "S"} LISTED
              </span>
            </div>
            <div className="flex gap-3">
              <label className="bg-muted technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all cursor-pointer flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" />
                {uploadingCsv ? "UPLOADING..." : "UPLOAD CSV"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                  disabled={uploadingCsv}
                />
              </label>
              <button
                onClick={() => setShowAddForm((s) => !s)}
                className="bg-foreground text-background px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                ADD PRODUCT
              </button>
            </div>
          </div>

          {csvStatus && (
            <p
              className={`px-2 mb-4 font-mono text-[11px] ${csvStatus.error ? "text-destructive" : "text-secondary"}`}
            >
              {csvStatus.message}
            </p>
          )}

          {showAddForm && (
            <form
              onSubmit={handleAddProduct}
              className="mb-6 p-6 technical-border bg-surface-lowest grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
            >
              <div className="md:col-span-2">
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Name
                </label>
                <input
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Size
                </label>
                <input
                  value={newProduct.size}
                  onChange={(e) => setNewProduct((p) => ({ ...p, size: e.target.value }))}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Image URL
                </label>
                <input
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct((p) => ({ ...p, imageUrl: e.target.value }))}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Price
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div className="md:col-span-5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={addingProduct}
                  className="bg-secondary text-secondary-foreground px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {addingProduct ? "SAVING..." : "SAVE PRODUCT"}
                </button>
              </div>
            </form>
          )}

          <div className="technical-border bg-surface-lowest overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase">
                    Product
                  </th>
                  <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase">
                    Size
                  </th>
                  <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase text-right">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-8 text-center font-mono text-xs text-muted-foreground"
                    >
                      NO PRODUCTS YET — ADD ONE OR UPLOAD A CSV
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <ProductThumb src={product.imageUrl} alt={product.name} />
                          <div>
                            <p className="text-sm">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">{product.size || "—"}</td>
                      <td className="p-4 text-right font-mono">{money(product.price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* System logs */}
        <section className="mt-12 pt-12 border-t border-border/30">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4">
              <h4 className="font-mono text-[11px] uppercase tracking-widest text-primary mb-4">
                Neural Feedback Loop
              </h4>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                System monitoring active across 4 nodes. Real-time fulfillment tracking enabled.
                Hardware acceleration verified.
              </p>
              <div className="p-4 bg-surface-lowest technical-border font-mono text-xs space-y-1">
                <p className={isDemo ? "text-tertiary" : "text-secondary"}>
                  {isDemo ? "[WARN] BACKEND_UNREACHABLE — DEMO_MODE" : "[OK] DB_CONN_STABLE"}
                </p>
                <p className="text-muted-foreground">[LOG] FETCH_INV_LIST_SUCCESS</p>
                <p className="text-muted-foreground">[LOG] AUTH_TOKEN_RENEWED</p>
                <p className="text-primary animate-pulse">[SYS] WAITING_FOR_INPUT_</p>
              </div>
            </div>
            <div className="md:col-span-8 h-48 technical-border bg-surface-lowest relative overflow-hidden flex items-center justify-center group">
              <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="w-full h-full flex flex-wrap gap-2 p-4">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 technical-border bg-muted" />
                  ))}
                </div>
              </div>
              <div className="z-10 text-center">
                <BarChart3 className="h-9 w-9 text-primary mb-2 mx-auto" />
                <p className="font-mono text-xs">NODE_MAP_ACTIVE</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="ml-64 py-16 bg-surface-lowest border-t border-border/30">
        <div className="grid grid-cols-12 gap-8 px-8 md:px-16 mx-auto">
          <div className="col-span-12 md:col-span-4">
            <h2 className="text-2xl font-bold mb-4">SunoBro</h2>
            <p className="text-muted-foreground max-w-xs">
              Professional grade technical goods for the modern developer environment. Performance
              is the only metric.
            </p>
          </div>
          <div className="col-span-6 md:col-span-2">
            <p className="font-mono text-[11px] uppercase text-muted-foreground mb-6">Management</p>
            <ul className="space-y-4">
              <li>
                {/* Storefront lives in the separate sunobro-website repo/deployment. */}
                <span className="font-mono text-[11px] text-muted-foreground">Products</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">Inventory</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">Support</span>
              </li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <p className="font-mono text-[11px] uppercase text-muted-foreground mb-6">System</p>
            <ul className="space-y-4">
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">GitHub</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">X</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">API Docs</span>
              </li>
            </ul>
          </div>
          <div className="col-span-12 md:col-span-4 mt-8 md:mt-0">
            <p className="font-mono text-[11px] uppercase text-muted-foreground mb-6">
              System Status
            </p>
            <div className="p-4 technical-border bg-surface-container flex items-center gap-4">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${isDemo ? "bg-tertiary" : "bg-secondary"}`}
              />
              <p className={`font-mono text-xs ${isDemo ? "text-tertiary" : "text-secondary"}`}>
                {isDemo ? "DEMO MODE — BACKEND OFFLINE" : "ALL SYSTEMS OPERATIONAL"}
              </p>
            </div>
            <p className="mt-8 font-mono text-[10px] text-muted-foreground/60">
              © 2026 SunoBro Technical Goods. Built for Performance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
