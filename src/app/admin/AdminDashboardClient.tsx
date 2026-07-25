"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Boxes,
  ChevronRight,
  MemoryStick,
  Cable,
  CircuitBoard,
  ShoppingBag,
  ShoppingCart,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { adminApi, adminAuthApi } from "@/lib/api/endpoints";
import type { AdminStats, AdminUser, InventoryItem, QueueOrder } from "@/lib/api/types";

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
  { ref: "#ORD-4921-A", client: "Vector Dynamics Ltd.", value: 12450, currency: "USD", status: "delivered", createdAt: new Date().toISOString() },
  { ref: "#ORD-5012-K", client: "H. Matsumoto (Individual)", value: 2800, currency: "USD", status: "pending", createdAt: new Date().toISOString() },
  { ref: "#ORD-5015-Z", client: "Aether Research", value: 45120, currency: "USD", status: "shipped", createdAt: new Date().toISOString() },
];

const INVENTORY_ICONS = [MemoryStick, Cable, CircuitBoard];

const statusTone = (status: InventoryItem["status"]) =>
  status === "OPTIMAL"
    ? "bg-secondary/10 text-secondary border-secondary/20"
    : status === "CRITICAL"
      ? "bg-tertiary/10 text-tertiary border-tertiary/20"
      : "bg-destructive/10 text-destructive border-destructive/20";

const money = (n: number, currency = "USD") =>
  `${currency === "INR" ? "₹" : "$"}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const QUICK_NAV = [
  { label: "Orders", sub: "Manage fulfillment queue", href: "/admin/orders", icon: ShoppingCart, metric: (s: AdminStats) => `${s.activeOrders.toLocaleString()} active` },
  { label: "Products", sub: "Catalog & pricing", href: "/admin/products", icon: ShoppingBag, metric: () => "Manage catalog" },
  { label: "Inventory", sub: "Stock & variants", href: "/admin/inventory", icon: Boxes, metric: () => "Monitor stock" },
  { label: "Settings", sub: "Store & integrations", href: "/admin/settings", icon: Settings, metric: () => "Configure" },
];

export function AdminDashboardClient() {
  const router = useRouter();
  const [stats, setStats] = useState(DEMO_STATS);
  const [inventory, setInventory] = useState(DEMO_INVENTORY);
  const [queue, setQueue] = useState(DEMO_QUEUE);
  const [isDemo, setIsDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminAuthApi.me().then((user) => {
      if (!cancelled) setAdminUser(user);
    }).catch(() => {
      // Backend unreachable — stay in demo mode, don't redirect
      if (!cancelled) setIsDemo(true);
    });

    Promise.all([adminApi.stats(), adminApi.inventory(), adminApi.orders()])
      .then(([liveStats, liveInventory, liveQueue]) => {
        if (cancelled) return;
        setStats(liveStats);
        setInventory(liveInventory);
        setQueue(liveQueue);
        setIsDemo(false);
      })
      .catch(() => {
        if (!cancelled) setIsDemo(true);
      });

    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await adminAuthApi.logout();
    } catch {
      // cookie may already be gone / backend not connected
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const criticalInventory = [...inventory]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="dashboard"
        adminName={adminUser?.name}
        adminRole={adminUser?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

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
          </div>

          {/* Stat cards */}
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
                <span className={`font-mono text-xs ${stats.revenueChangePct >= 0 ? "text-secondary" : "text-destructive"}`}>
                  {stats.revenueChangePct >= 0 ? "+" : ""}{stats.revenueChangePct}%
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
                <span className={`font-mono text-xs ${stats.conversionChangePct >= 0 ? "text-secondary" : "text-destructive"}`}>
                  {stats.conversionChangePct >= 0 ? "+" : ""}{stats.conversionChangePct}%
                </span>
              </div>
              <div className="mt-6 font-mono text-xs text-muted-foreground flex justify-between">
                <span>P95 Latency: 142ms</span>
                <span>HTTP 200 OK</span>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Quick nav grid */}
        <section className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-widest mb-4 px-1">Quick Access</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_NAV.map(({ label, sub, href, icon: Icon, metric }) => (
              <Link
                key={label}
                href={href}
                className="technical-border bg-surface-lowest hover:bg-surface-container transition-colors p-6 group relative overflow-hidden flex flex-col gap-3"
              >
                <Icon className="absolute top-3 right-3 h-12 w-12 opacity-10 group-hover:opacity-20 transition-opacity" />
                <p className="font-mono text-[11px] uppercase tracking-wider">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-mono text-[10px] text-primary">{metric(stats)}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Critical inventory summary */}
          <section className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-mono text-[11px] uppercase tracking-widest">Critical Stock</h3>
              <Link href="/admin/inventory" className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
                VIEW ALL <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="technical-border bg-surface-lowest overflow-hidden">
              {criticalInventory.map((item, i) => {
                const Icon = INVENTORY_ICONS[i % INVENTORY_ICONS.length];
                return (
                  <div
                    key={item.sku}
                    className="flex items-center gap-4 p-4 border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-10 h-10 bg-muted flex items-center justify-center technical-border shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{item.sku}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm">{item.stock.toLocaleString()} <span className="text-xs text-muted-foreground">units</span></p>
                      <span className={`font-mono text-[10px] px-2 py-0.5 border ${statusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Queue */}
          <section className="lg:col-span-5">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-mono text-[11px] uppercase tracking-widest">Queue Protocol</h3>
              <Link href="/admin/orders" className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1">
                VIEW ALL <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-4">
              {queue.map((o) => (
                <div
                  key={o.ref}
                  className={`p-4 technical-border bg-surface-container hover:bg-muted transition-all group cursor-pointer ${
                    o.status === "pending" ? "border-l-4 border-l-tertiary" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs text-primary">{o.ref}</span>
                    <span className={`font-mono text-[10px] px-2 ${o.status === "pending" ? "bg-tertiary text-background" : "bg-secondary text-secondary-foreground"}`}>
                      {o.status.toUpperCase()}
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
                      <span className="font-mono text-sm">{money(o.value, o.currency)}</span>
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
      </main>
    </div>
  );
}
