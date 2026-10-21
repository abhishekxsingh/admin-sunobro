"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  BadgeIndianRupee,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  ListFilter,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Truck,
  X,
  CircleX,
} from "lucide-react";
import { EmptyState, OrderStatusBadge, QikinkStatusBadge, Spinner } from "@/components/status";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ApiError } from "@/lib/api/client";
import { adminApi, adminAuthApi, qikinkApi } from "@/lib/api/endpoints";
import type { AdminOrder, AdminUser, QueueOrder } from "@/lib/api/types";
import { NewOrderPanel } from "./NewOrderPanel";

const DEMO_ORDERS: AdminOrder[] = [
  {
    id: "demo-1",
    reference: "SB-A4921",
    status: "pending",
    client: "Vector Dynamics Ltd.",
    total: 12450,
    currency: "INR",
    items: [
      {
        name: "SunoBro Technical Tee",
        size: "L",
        color: "Black",
        sku: "SB-TEE-L-BLK",
        price: 4150,
        qty: 3,
      },
    ],
    statusHistory: [
      { status: "pending", note: "Order created.", createdAt: new Date().toISOString() },
    ],
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
    items: [
      {
        name: "Circuit Cap",
        size: "One Size",
        color: "White",
        sku: "SB-CAP-OS-WHT",
        price: 2800,
        qty: 1,
      },
    ],
    statusHistory: [
      {
        status: "pending",
        note: "Order created.",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
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
    items: [
      {
        name: "SunoBro Technical Tee",
        size: "M",
        color: "Grey",
        sku: "SB-TEE-M-GRY",
        price: 4150,
        qty: 10,
      },
    ],
    statusHistory: [
      {
        status: "pending",
        note: "Order created.",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        status: "shipped",
        note: "Dispatched via BlueDart.",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      { status: "delivered", note: "Delivered.", createdAt: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    shippingCity: "Bangalore",
    shippingCountry: "IN",
  },
];

type StatusFilter = "all" | "pending" | "paid" | "shipped" | "delivered" | "cancelled";

const FILTER_ICON: Record<StatusFilter, typeof Clock> = {
  all: ListFilter,
  pending: Clock,
  paid: BadgeIndianRupee,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: CircleX,
};

const money = (n: number, cur = "INR") =>
  `${cur === "INR" ? "₹" : "$"}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const fromQueueOrder = (q: QueueOrder): AdminOrder => ({
  id: q.id,
  reference: q.ref,
  status: q.status,
  client: q.client,
  total: q.value,
  customerId: q.customerId,
  email: q.email,
  phone: q.phone,
  subtotal: q.subtotal,
  discount: q.discount,
  couponCode: q.couponCode,
  currency: q.currency,
  items: q.items || [],
  statusHistory: [],
  createdAt: q.createdAt,
  shippingCity: q.shippingCity || "—",
  shippingCountry: q.shippingCountry || "—",
  qikinkOrderId: q.qikinkOrderId,
  qikinkStatus: q.qikinkStatus,
  qikinkError: q.qikinkError,
  trackingLink: q.trackingLink,
  awb: q.awb,
  courier: q.courier,
  qikinkAttempts: q.qikinkAttempts,
  qikinkSyncedAt: q.qikinkSyncedAt,
  paymentGateway: q.paymentGateway,
  source: q.source,
});

const errorMessage = (err: unknown) =>
  err instanceof ApiError || err instanceof Error ? err.message : "Request failed.";

// Paid orders that never reached Qikink (failed or skipped push) need an admin.
// COD orders stay pending (Qikink collects the cash) but are still printable.
const needsQikinkPush = (o: AdminOrder) =>
  !o.qikinkOrderId &&
  (o.status === "paid" || (o.status === "pending" && o.paymentGateway === "cod"));

const PAYMENT_LABEL: Record<string, string> = {
  razorpay: "RAZORPAY",
  manual: "PREPAID · ADMIN",
  cod: "COD",
};

export function OrdersClient() {
  const router = useRouter();
  // Demo rows carry new Date() timestamps, so they are only swapped in on the
  // client after a failed fetch — rendering them during SSR breaks hydration.
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<AdminOrder["status"]>("pending");
  const [statusNote, setStatusNote] = useState("");
  const [qikinkBusy, setQikinkBusy] = useState<"push" | "sync" | "all" | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);

  // Search runs on the server across every order (not just the loaded page):
  // reference, name, email, phone, product, SKU, colour, AWB, coupon, city/PIN.
  const loadOrders = useCallback(async (q = "", status: StatusFilter = "all") => {
    setSearching(true);
    try {
      const liveOrders = await adminApi.orders({ q, status });
      setOrders(liveOrders.map((order) => fromQueueOrder(order)));
      setIsDemo(false);
    } catch {
      setOrders(DEMO_ORDERS);
      setIsDemo(true);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    adminAuthApi
      .me()
      .then((user) => {
        if (!cancelled) setAdminUser(user);
      })
      .catch(() => {
        /* backend offline */
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => void loadOrders(query, filter), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, filter, loadOrders]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // The queue payload has no status history — load the full order on open.
  const openOrder = async (order: AdminOrder) => {
    setSelected(order);
    setNewStatus(order.status);
    setNotice(null);
    if (isDemo) return;
    try {
      const detail = await adminApi.orderDetail(order.id);
      setSelected((cur) => (cur?.id === order.id ? { ...cur, ...detail } : cur));
    } catch {
      /* keep the queue row */
    }
  };

  const applyQueueUpdate = async (q: QueueOrder) => {
    const fresh = fromQueueOrder(q);
    setOrders((prev) =>
      prev.map((o) => (o.id === q.id ? { ...o, ...fresh, statusHistory: o.statusHistory } : o)),
    );
    try {
      const detail = await adminApi.orderDetail(q.id);
      setSelected((cur) => (cur?.id === q.id ? { ...cur, ...detail } : cur));
    } catch {
      setSelected((cur) =>
        cur?.id === q.id ? { ...cur, ...fresh, statusHistory: cur.statusHistory } : cur,
      );
    }
  };

  const handlePushToQikink = async () => {
    if (!selected) return;
    setQikinkBusy("push");
    setNotice(null);
    try {
      const updated = await adminApi.pushOrderToQikink(selected.id);
      await applyQueueUpdate(updated);
      setNotice(
        updated.qikinkOrderId
          ? { tone: "info", text: `Pushed to Qikink as ${updated.qikinkOrderId}.` }
          : { tone: "error", text: updated.qikinkError || "Qikink did not accept the order." },
      );
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setQikinkBusy(null);
    }
  };

  const handleSyncFromQikink = async () => {
    if (!selected) return;
    setQikinkBusy("sync");
    setNotice(null);
    try {
      const updated = await adminApi.syncOrderFromQikink(selected.id);
      await applyQueueUpdate(updated);
      setNotice({ tone: "info", text: `Qikink status: ${updated.qikinkStatus || "unknown"}.` });
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setQikinkBusy(null);
    }
  };

  const handleSyncAll = async () => {
    setQikinkBusy("all");
    try {
      await qikinkApi.syncOrders();
      await loadOrders();
    } catch {
      /* queue keeps its last state */
    } finally {
      setQikinkBusy(null);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await adminAuthApi.logout();
    } catch {
      /* ignore */
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const handleUpdateStatus = async () => {
    if (!selected) return;
    setUpdatingId(selected.id);
    try {
      const result = await adminApi.updateOrderStatus(selected.id, {
        status: newStatus,
        note: statusNote,
      });
      const updated: AdminOrder = {
        ...selected,
        status: newStatus,
        statusHistory: [
          ...selected.statusHistory,
          {
            status: newStatus,
            note: result.warning || statusNote,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      setOrders((prev) => prev.map((o) => (o.id === selected.id ? updated : o)));
      setSelected(updated);
      if (result.warning) setNotice({ tone: "error", text: result.warning });
    } catch {
      // Graceful degradation — update local state only
      const updated: AdminOrder = {
        ...selected,
        status: newStatus,
        statusHistory: [
          ...selected.statusHistory,
          {
            status: newStatus,
            note: statusNote || "(local only)",
            createdAt: new Date().toISOString(),
          },
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
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-4xl font-bold">Orders Queue</h2>
            <div className="flex gap-3">
              <button
                onClick={handleSyncAll}
                disabled={isDemo || qikinkBusy === "all"}
                className="technical-border px-3 py-1.5 font-mono text-[11px] flex items-center gap-2 hover:border-foreground transition-all disabled:opacity-40"
              >
                <RefreshCw className={`h-3 w-3 ${qikinkBusy === "all" ? "animate-spin" : ""}`} />
                {qikinkBusy === "all" ? "SYNCING..." : "SYNC_QIKINK"}
              </button>
              <button
                onClick={() => setShowNewOrder(true)}
                disabled={isDemo}
                className="bg-foreground text-background px-3 py-1.5 font-mono text-[11px] font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-40"
              >
                <Plus className="h-3 w-3" /> NEW ORDER
              </button>
            </div>
          </div>
        </header>

        {showNewOrder && (
          <NewOrderPanel
            onClose={() => setShowNewOrder(false)}
            onCreated={(order) => {
              setOrders((prev) => [fromQueueOrder(order), ...prev]);
              setShowNewOrder(false);
            }}
          />
        )}

        {/* Search */}
        <div className="relative mb-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search orders"
            placeholder="Search ref, name, email, phone, product, SKU, colour, AWB, coupon…"
            className="w-full bg-surface-lowest technical-border py-2 pl-9 pr-9 text-sm"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Spinner />
            </span>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "paid", "shipped", "delivered", "cancelled"] as const).map((f) => {
            const Icon = FILTER_ICON[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-mono text-[11px] px-3 py-1.5 border transition-all flex items-center gap-1.5 ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/40 text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {f.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Orders table */}
        <div className="technical-border bg-surface-lowest overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {["Reference", "Client", "Total", "Status", "Qikink", "Date", ""].map((h) => (
                  <th key={h} className="p-4 font-mono text-[11px] text-muted-foreground uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    <EmptyState icon={Inbox}>
                      {query.trim()
                        ? `NO ORDERS MATCH “${query.trim()}”`
                        : "NO ORDERS MATCHING FILTER"}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-primary whitespace-nowrap">
                      {order.reference}
                      <span className="block text-[9px] text-muted-foreground">
                        {PAYMENT_LABEL[order.paymentGateway || "razorpay"] || order.paymentGateway}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      {order.client}
                      {(order.email || order.phone) && (
                        <span className="block font-mono text-[10px] text-muted-foreground">
                          {[order.email, order.phone].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-sm">
                      {money(order.total, order.currency)}
                      {order.couponCode && (
                        <span className="block text-[9px] text-secondary">{order.couponCode}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="p-4 font-mono text-[10px] text-muted-foreground space-y-1">
                      <QikinkStatusBadge
                        status={order.qikinkStatus}
                        awaiting={needsQikinkPush(order)}
                      />
                      {order.qikinkError && (
                        <span
                          className="block max-w-xs line-clamp-2 text-destructive"
                          title={order.qikinkError}
                        >
                          {order.qikinkError}
                        </span>
                      )}
                      {order.trackingLink && (
                        <a
                          href={order.trackingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Truck className="h-3 w-3" aria-hidden /> Track
                        </a>
                      )}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => void openOrder(order)}
                        className="font-mono text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        VIEW <ArrowRight className="h-3 w-3" aria-hidden />
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
          <span>
            {filtered.length} ORDER{filtered.length === 1 ? "" : "S"}
          </span>
          <div className="flex gap-2">
            <button
              className="technical-border px-3 py-1.5 flex items-center gap-1 hover:border-foreground transition-all disabled:opacity-40"
              disabled
            >
              <ChevronLeft className="h-3 w-3" /> PREV
            </button>
            <button
              className="technical-border px-3 py-1.5 flex items-center gap-1 hover:border-foreground transition-all disabled:opacity-40"
              disabled
            >
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
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close order"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-8 flex-1">
                {/* Status history */}
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest mb-3">
                    Status History
                  </p>
                  <div className="space-y-2">
                    {selected.statusHistory.map((h, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <OrderStatusBadge status={h.status} />
                          {h.note && (
                            <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>
                          )}
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
                              <th
                                key={h}
                                className="p-2 font-mono text-[10px] text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selected.items.map((item, i) => (
                            <tr key={i} className="border-b border-border/30 last:border-b-0">
                              <td className="p-2 text-sm">
                                {item.name}{" "}
                                <span className="text-muted-foreground text-xs">
                                  {item.size}/{item.color}
                                </span>
                              </td>
                              <td className="p-2 font-mono text-[10px] text-muted-foreground">
                                {item.sku}
                                <span
                                  className={`block ${item.qikinkSku ? "" : "text-destructive"}`}
                                >
                                  QK: {item.qikinkSku || "not mapped"}
                                </span>
                              </td>
                              <td className="p-2 font-mono text-xs">{item.qty}</td>
                              <td className="p-2 font-mono text-xs">
                                {money(item.price, selected.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {(selected.discount ?? 0) > 0 && (
                      <div className="text-right mt-2 font-mono text-xs text-muted-foreground space-y-0.5">
                        <p>
                          Subtotal: {money(selected.subtotal ?? selected.total, selected.currency)}
                        </p>
                        <p className="text-secondary">
                          Coupon {selected.couponCode}: −
                          {money(selected.discount ?? 0, selected.currency)}
                        </p>
                      </div>
                    )}
                    <div className="text-right mt-2 font-mono text-sm">
                      Total:{" "}
                      <span className="font-bold">{money(selected.total, selected.currency)}</span>
                    </div>
                  </div>
                )}

                {/* Shipping */}
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest mb-2">Shipping</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {selected.client} · {selected.shippingCity}, {selected.shippingCountry}
                  </p>
                  {(selected.email || selected.phone) && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {[selected.email, selected.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {selected.customerId && (
                    <Link
                      href={`/admin/customers?id=${selected.customerId}`}
                      className="mt-1 inline-block font-mono text-[11px] text-primary hover:underline"
                    >
                      VIEW CUSTOMER →
                    </Link>
                  )}
                </div>

                {/* Qikink fulfilment */}
                <div className="p-4 technical-border bg-surface-container space-y-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest">
                    Qikink Fulfilment
                  </p>
                  <div className="font-mono text-[10px] text-muted-foreground space-y-0.5">
                    <p>ORDER_ID: {selected.qikinkOrderId || "—"}</p>
                    <div className="flex items-center gap-2">
                      STATUS:{" "}
                      <QikinkStatusBadge
                        status={selected.qikinkStatus}
                        awaiting={needsQikinkPush(selected)}
                      />
                    </div>
                    {(selected.courier || selected.awb) && (
                      <p>
                        SHIPMENT:{" "}
                        {[selected.courier, selected.awb && `AWB ${selected.awb}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <p>ATTEMPTS: {selected.qikinkAttempts ?? 0}</p>
                    <p>
                      LAST_SYNC:{" "}
                      {selected.qikinkSyncedAt
                        ? new Date(selected.qikinkSyncedAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  {selected.trackingLink && (
                    <a
                      href={selected.trackingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Truck className="h-3 w-3" aria-hidden /> OPEN TRACKING
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                  {selected.qikinkError && !notice && (
                    <p className="font-mono text-[11px] text-destructive">{selected.qikinkError}</p>
                  )}
                  {notice && (
                    <p
                      className={`font-mono text-[11px] ${notice.tone === "error" ? "text-destructive" : "text-primary"}`}
                    >
                      {notice.text}
                    </p>
                  )}
                  {needsQikinkPush(selected) && (
                    <button
                      onClick={handlePushToQikink}
                      disabled={isDemo || qikinkBusy !== null}
                      className="w-full bg-primary text-primary-foreground py-2 font-mono text-[11px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {qikinkBusy === "push" ? <Spinner /> : <Send className="h-3 w-3" />}
                      {qikinkBusy === "push" ? "PUSHING..." : "PUSH_TO_QIKINK"}
                    </button>
                  )}
                  {selected.qikinkOrderId && (
                    <button
                      onClick={handleSyncFromQikink}
                      disabled={isDemo || qikinkBusy !== null}
                      className="w-full technical-border py-2 font-mono text-[11px] flex items-center justify-center gap-2 hover:border-foreground transition-all disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${qikinkBusy === "sync" ? "animate-spin" : ""}`}
                      />
                      {qikinkBusy === "sync" ? "SYNCING..." : "SYNC_STATUS"}
                    </button>
                  )}
                  {!needsQikinkPush(selected) && !selected.qikinkOrderId && (
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Pushed automatically once the order is paid.
                    </p>
                  )}
                </div>

                {/* Status update */}
                <div className="p-4 technical-border bg-surface-container space-y-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest">Update Status</p>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as AdminOrder["status"])}
                    className="w-full bg-muted technical-border px-3 py-2 font-mono text-xs"
                  >
                    {(["pending", "paid", "shipped", "delivered", "cancelled"] as const).map(
                      (s) => (
                        <option key={s} value={s}>
                          {s.toUpperCase()}
                        </option>
                      ),
                    )}
                  </select>
                  {newStatus === "cancelled" && selected.qikinkOrderId && (
                    <p className="font-mono text-[10px] text-destructive">
                      Qikink has no cancel API — also cancel order {selected.qikinkOrderId} in the
                      Qikink dashboard.
                    </p>
                  )}
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full bg-muted technical-border px-3 py-2 font-mono text-xs"
                  />
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updatingId === selected.id}
                    className="w-full bg-secondary text-secondary-foreground py-2 font-mono text-[11px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {updatingId === selected.id ? <Spinner /> : <Save className="h-3 w-3" />}
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
