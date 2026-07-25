"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { adminApi, adminAuthApi } from "@/lib/api/endpoints";
import type { AdminOrder, AdminUser, QueueOrder } from "@/lib/api/types";

const DEMO_ORDERS: AdminOrder[] = [
  {
    id: "demo-1",
    reference: "SB-A4921",
    status: "pending",
    client: "Vector Dynamics Ltd.",
    total: 12450,
    currency: "INR",
    items: [{ name: "SunoBro Technical Tee", size: "L", color: "Black", sku: "SB-TEE-L-BLK", price: 4150, qty: 3 }],
    statusHistory: [{ status: "pending", note: "Order created.", createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    shippingCity: "Mumbai",
    shippingCountry: "IN",
  },
  {
    id: "demo-2",
    reference: "SB-B5012",
    status: "paid",
    client: "H. Matsumoto",
    total: 2800,
    currency: "INR",
    items: [{ name: "Circuit Cap", size: "One Size", color: "White", sku: "SB-CAP-OS-WHT", price: 2800, qty: 1 }],
    statusHistory: [
      { status: "pending", note: "Order created.", createdAt: new Date(Date.now() - 86400000).toISOString() },
      { status: "paid", note: "Payment confirmed.", createdAt: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    shippingCity: "Delhi",
    shippingCountry: "IN",
  },
  {
    id: "demo-3",
    reference: "SB-C5015",
    status: "delivered",
    client: "Aether Research",
    total: 45120,
    currency: "INR",
    items: [{ name: "SunoBro Technical Tee", size: "M", color: "Grey", sku: "SB-TEE-M-GRY", price: 4150, qty: 10 }],
    statusHistory: [
      { status: "pending", note: "Order created.", createdAt: new Date(Date.now() - 172800000).toISOString() },
      { status: "shipped", note: "Dispatched via BlueDart.", createdAt: new Date(Date.now() - 86400000).toISOString() },
      { status: "delivered", note: "Delivered.", createdAt: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    shippingCity: "Bangalore",
    shippingCountry: "IN",
  },
];

type StatusFilter = "all" | "pending" | "paid" | "shipped" | "delivered" | "cancelled";

const STATUS_BADGE: Record<AdminOrder["status"], string> = {
  pending: "bg-tertiary/10 text-tertiary border-tertiary/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  shipped: "bg-primary/10 text-primary border-primary/20",
  delivered: "bg-secondary/10 text-secondary border-secondary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const money = (n: number, cur = "INR") =>
  `${cur === "INR" ? "₹" : "$"}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const fromQueueOrder = (q: QueueOrder, i: number): AdminOrder => ({
  id: `queue-${i}`,
  reference: q.ref,
  status: q.status,
  client: q.client,
  total: q.value,
  currency: q.currency,
  items: [],
  statusHistory: [],
  createdAt: q.createdAt,
  shippingCity: "—",
  shippingCountry: "—",
});

export function OrdersClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(DEMO_ORDERS);
  const [isDemo, setIsDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<AdminOrder["status"]>("pending");
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    let cancelled = false;

    adminAuthApi.me().then((user) => {
      if (!cancelled) setAdminUser(user);
    }).catch(() => { /* backend offline */ });

    adminApi.orders().then((liveOrders) => {
      if (cancelled) return;
      setOrders(liveOrders.map(fromQueueOrder));
      setIsDemo(false);
    }).catch(() => {
      if (!cancelled) setIsDemo(true);
    });

    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await adminAuthApi.logout(); } catch { /* ignore */ }
    finally { router.push("/admin/login"); router.refresh(); }
  };

  const handleUpdateStatus = async () => {
    if (!selected) return;
    setUpdatingId(selected.id);
    try {
      await adminApi.updateOrderStatus(selected.id, { status: newStatus, note: statusNote });
      const updated: AdminOrder = {
        ...selected,
        status: newStatus,
        statusHistory: [
          ...selected.statusHistory,
          { status: newStatus, note: statusNote, createdAt: new Date().toISOString() },
        ],
      };
      setOrders((prev) => prev.map((o) => (o.id === selected.id ? updated : o)));
      setSelected(updated);
    } catch {
      // Graceful degradation — update local state only
      const updated: AdminOrder = {
        ...selected,
        status: newStatus,
        statusHistory: [
          ...selected.statusHistory,
          { status: newStatus, note: statusNote || "(local only)", createdAt: new Date().toISOString() },
        ],
      };
      setOrders((prev) => prev.map((o) => (o.id === selected.id ? updated : o)));
      setSelected(updated);
    } finally {
      setUpdatingId(null);
      setStatusNote("");
    }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="orders"
        adminName={adminUser?.name}
        adminRole={adminUser?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-mono text-[11px] text-primary uppercase tracking-widest">
              Operations Dashboard
            </p>
            {isDemo && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/30 uppercase tracking-widest">
                Demo Data
              </span>
            )}
          </div>
          <h2 className="text-4xl font-bold">Orders Queue</h2>
        </header>

        {/* Filter bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "paid", "shipped", "delivered", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono text-[11px] px-3 py-1.5 border transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Orders table */}
        <div className="technical-border bg-surface-lowest overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {["Reference", "Client", "Total", "Status", "Date", ""].map((h) => (
                  <th key={h} className="p-4 font-mono text-[11px] text-muted-foreground uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-mono text-xs text-muted-foreground">
                    NO ORDERS MATCHING FILTER
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="p-4 font-mono text-xs text-primary">{order.reference}</td>
                    <td className="p-4 text-sm">{order.client}</td>
                    <td className="p-4 font-mono text-sm">{money(order.total, order.currency)}</td>
                    <td className="p-4">
                      <span className={`font-mono text-[10px] px-2 py-0.5 border ${STATUS_BADGE[order.status]}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => { setSelected(order); setNewStatus(order.status); }}
                        className="font-mono text-[11px] text-primary hover:underline"
                      >
                        VIEW →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination hint */}
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>{filtered.length} ORDER{filtered.length === 1 ? "" : "S"}</span>
          <div className="flex gap-2">
            <button className="technical-border px-3 py-1.5 flex items-center gap-1 hover:border-foreground transition-all disabled:opacity-40" disabled>
              <ChevronLeft className="h-3 w-3" /> PREV
            </button>
            <button className="technical-border px-3 py-1.5 flex items-center gap-1 hover:border-foreground transition-all disabled:opacity-40" disabled>
              NEXT <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </main>

      {/* Order detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 h-screen w-[480px] max-w-full bg-surface-lowest border-l border-border/30 z-50 flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/30">
                <div>
                  <p className="font-mono text-xs text-primary">{selected.reference}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-8 flex-1">
                {/* Status history */}
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest mb-3">Status History</p>
                  <div className="space-y-2">
                    {selected.statusHistory.map((h, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 border ${STATUS_BADGE[h.status as AdminOrder["status"]] || "border-border/30"}`}>
                            {h.status.toUpperCase()}
                          </span>
                          {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                          <p className="font-mono text-[10px] text-muted-foreground/60">
                            {new Date(h.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Line items */}
                {selected.items.length > 0 && (
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest mb-3">Items</p>
                    <div className="technical-border overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/30 bg-muted/30">
                            {["Item", "SKU", "Qty", "Price"].map((h) => (
                              <th key={h} className="p-2 font-mono text-[10px] text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selected.items.map((item, i) => (
                            <tr key={i} className="border-b border-border/30 last:border-b-0">
                              <td className="p-2 text-sm">{item.name} <span className="text-muted-foreground text-xs">{item.size}/{item.color}</span></td>
                              <td className="p-2 font-mono text-[10px] text-muted-foreground">{item.sku}</td>
                              <td className="p-2 font-mono text-xs">{item.qty}</td>
                              <td className="p-2 font-mono text-xs">{money(item.price, selected.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-right mt-2 font-mono text-sm">
                      Total: <span className="font-bold">{money(selected.total, selected.currency)}</span>
                    </div>
                  </div>
                )}

                {/* Shipping */}
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest mb-2">Shipping</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {selected.client} · {selected.shippingCity}, {selected.shippingCountry}
                  </p>
                </div>

                {/* Status update */}
                <div className="p-4 technical-border bg-surface-container space-y-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest">Update Status</p>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as AdminOrder["status"])}
                    className="w-full bg-muted technical-border px-3 py-2 font-mono text-xs"
                  >
                    {(["pending", "paid", "shipped", "delivered", "cancelled"] as const).map((s) => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full bg-muted technical-border px-3 py-2 font-mono text-xs"
                  />
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updatingId === selected.id}
                    className="w-full bg-secondary text-secondary-foreground py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {updatingId === selected.id ? "UPDATING..." : "UPDATE STATUS"}
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
