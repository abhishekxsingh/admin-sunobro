"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarX,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CirclePause,
  Copy,
  LayoutGrid,
  Plus,
  ReceiptText,
  SquarePen,
  TicketPercent,
  TicketX,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { EmptyState, OrderStatusBadge, Spinner } from "@/components/status";
import { ApiError } from "@/lib/api/client";
import { adminAuthApi, adminCouponsApi } from "@/lib/api/endpoints";
import type { AdminUser, Coupon, CouponRedemption, CouponState } from "@/lib/api/types";
import { CouponForm, KINDS } from "./CouponForm";

type Filter = "all" | "live" | "scheduled" | "ended";

const STATE: Record<CouponState, { label: string; icon: LucideIcon; className: string }> = {
  live: {
    label: "LIVE",
    icon: CircleCheck,
    className: "bg-secondary/10 text-secondary border-secondary/20",
  },
  scheduled: {
    label: "SCHEDULED",
    icon: CalendarClock,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  expired: {
    label: "EXPIRED",
    icon: CalendarX,
    className: "border-border/40 text-muted-foreground",
  },
  "used-up": {
    label: "USED UP",
    icon: TicketX,
    className: "border-border/40 text-muted-foreground",
  },
  disabled: {
    label: "OFF",
    icon: CirclePause,
    className: "border-border/40 text-muted-foreground",
  },
};

const TABS: [Filter, string, LucideIcon][] = [
  ["all", "ALL", LayoutGrid],
  ["live", "LIVE", CircleCheck],
  ["scheduled", "SCHEDULED", CalendarClock],
  ["ended", "ENDED / OFF", CirclePause],
];

const inFilter = (c: Coupon, f: Filter) =>
  f === "all" || (f === "ended" ? !["live", "scheduled"].includes(c.state) : c.state === f);

const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      title="Copy code"
      aria-label={`Copy ${code}`}
      className="text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-secondary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function Redemptions({ coupon }: { coupon: Coupon }) {
  const [rows, setRows] = useState<CouponRedemption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminCouponsApi
      .redemptions(coupon.id)
      .then(setRows)
      .catch((err) => setError(errorText(err, "Could not load orders.")));
  }, [coupon.id]);

  if (error) return <p className="font-mono text-[11px] text-destructive">{error}</p>;
  if (!rows) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground flex items-center gap-2">
        <Spinner /> LOADING ORDERS…
      </p>
    );
  }
  if (rows.length === 0) {
    return <EmptyState icon={ReceiptText}>NO ORDERS HAVE USED {coupon.code} YET</EmptyState>;
  }
  const saved = rows.filter((r) => r.counted).reduce((s, r) => s + r.discount, 0);
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] text-muted-foreground">
        {rows.filter((r) => r.counted).length} redeemed · {money(saved)} given as discount · unpaid
        and cancelled orders don&apos;t count
      </p>
      <table className="w-full text-left border-collapse">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/30 last:border-b-0">
              <td className="py-1.5 pr-4 font-mono text-xs text-primary">{r.reference}</td>
              <td className="py-1.5 pr-4 text-sm">
                {r.client}
                {r.email && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {r.email}
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-4">
                <OrderStatusBadge status={r.status} />
              </td>
              <td className="py-1.5 pr-4 font-mono text-xs">
                −{money(r.discount)} → {money(r.total)}
              </td>
              <td className="py-1.5 font-mono text-[10px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CouponsClient() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    adminAuthApi
      .me()
      .then(setAdminUser)
      .catch(() => {});
    adminCouponsApi
      .list()
      .then(setCoupons)
      .catch((err) => setLoadError(errorText(err, "Could not load coupons.")));
  }, []);

  const counts = useMemo(() => {
    const list = coupons || [];
    return Object.fromEntries(
      TABS.map(([key]) => [key, list.filter((c) => inFilter(c, key)).length]),
    );
  }, [coupons]);
  const visible = (coupons || []).filter((c) => inFilter(c, filter));

  const upsert = (saved: Coupon) =>
    setCoupons((prev) => {
      const list = prev || [];
      return list.some((c) => c.id === saved.id)
        ? list.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...list];
    });

  const toggleActive = async (c: Coupon) => {
    setBusyId(c.id);
    setRowError(null);
    try {
      upsert(await adminCouponsApi.update(c.id, { active: !c.active }));
    } catch (err) {
      setRowError({ id: c.id, message: errorText(err, "Could not update.") });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete ${c.code}? Customers will no longer be able to use it.`)) return;
    setBusyId(c.id);
    setRowError(null);
    try {
      await adminCouponsApi.remove(c.id);
      setCoupons((prev) => (prev || []).filter((x) => x.id !== c.id));
    } catch (err) {
      setRowError({ id: c.id, message: errorText(err, "Could not delete.") });
    } finally {
      setBusyId(null);
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

  const live = (coupons || []).filter((c) => c.state === "live").length;
  const scheduled = (coupons || []).filter((c) => c.state === "scheduled").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="coupons"
        adminName={adminUser?.name}
        adminRole={adminUser?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-10">
          <p className="font-mono text-[11px] text-primary uppercase tracking-widest mb-2">
            Promotions
          </p>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
              <h2 className="text-4xl font-bold">Coupons</h2>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                {(coupons || []).length} COUPON{(coupons || []).length === 1 ? "" : "S"} · {live}{" "}
                LIVE
                {scheduled ? ` · ${scheduled} SCHEDULED` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="bg-foreground text-background px-4 py-2 font-mono text-[11px] font-bold flex items-center gap-2 hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> NEW COUPON
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-3 md:grid-cols-4">
          {KINDS.map(({ key, label, hint, icon: Icon }) => (
            <div key={key} className="p-4 technical-border bg-surface-lowest">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest">
                <Icon className="h-3.5 w-3.5" /> {label}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{hint}</p>
              <p className="mt-2 font-mono text-[11px]">
                {(coupons || []).filter((c) => c.kind === key && c.state === "live").length} live
              </p>
            </div>
          ))}
        </section>

        {editing && (
          <CouponForm
            key={editing === "new" ? "new" : editing.id}
            coupon={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              upsert(saved);
              setEditing(null);
            }}
          />
        )}

        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter coupons">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`font-mono text-[11px] px-3 py-1.5 border transition-all flex items-center gap-1.5 ${
                filter === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {label} · {counts[key] ?? 0}
            </button>
          ))}
        </div>

        <div className="technical-border bg-surface-lowest overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {["", "Code", "Type", "Discount", "Valid", "Used", "Status", "Actions"].map(
                  (h, i) => (
                    <th
                      key={h || i}
                      className="p-4 font-mono text-[11px] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {!coupons ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    {loadError || (
                      <span className="inline-flex items-center gap-2">
                        <Spinner /> LOADING COUPONS…
                      </span>
                    )}
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState icon={TicketPercent}>
                      {coupons.length === 0
                        ? "NO COUPONS YET — CREATE A FESTIVAL, SEASONAL OR CUSTOMER COUPON"
                        : "NOTHING IN THIS LIST"}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                visible.map((c) => {
                  const kind = KINDS.find((k) => k.key === c.kind) ?? KINDS[2];
                  const KindIcon = kind.icon;
                  const state = STATE[c.state];
                  const StateIcon = state.icon;
                  const open = expanded === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr className="border-b border-border/30 hover:bg-muted/40 align-top">
                        <td className="p-4 w-10">
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} orders that used ${c.code}`}
                            onClick={() => setExpanded(open ? null : c.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {open ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold tracking-wider">
                              {c.code}
                            </span>
                            <CopyCode code={c.code} />
                          </div>
                          {c.name && <p className="text-xs text-muted-foreground">{c.name}</p>}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                            <KindIcon className="h-3.5 w-3.5" /> {kind.label.toUpperCase()}
                          </span>
                          {c.kind === "customer" && (
                            <p
                              className="mt-0.5 max-w-48 truncate font-mono text-[10px] text-muted-foreground"
                              title={c.customers.map((x) => x.email || x.id).join(", ")}
                            >
                              {c.customers.map((x) => x.name || x.email || x.id).join(", ")}
                            </p>
                          )}
                          {c.showAtCheckout && c.kind !== "customer" && (
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              shown at checkout
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-sm max-w-56">
                          {c.summary}
                          {c.firstOrderOnly && (
                            <p className="font-mono text-[10px] text-muted-foreground">
                              first order only
                            </p>
                          )}
                        </td>
                        <td className="p-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {date(c.startsAt) || "now"}
                          <br />→ {date(c.endsAt) || "no end"}
                        </td>
                        <td className="p-4 font-mono text-[11px]">
                          {c.usedCount}/{c.usageLimit ?? "∞"}
                          <p className="text-[10px] text-muted-foreground">
                            {c.perCustomerLimit
                              ? `${c.perCustomerLimit} per customer`
                              : "no per-customer limit"}
                          </p>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 whitespace-nowrap font-mono text-[10px] px-2 py-0.5 border ${state.className}`}
                          >
                            <StateIcon className="h-3 w-3" aria-hidden /> {state.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <button
                              type="button"
                              onClick={() => void toggleActive(c)}
                              disabled={busyId === c.id}
                              className={`inline-flex items-center gap-1 font-mono text-[11px] hover:underline disabled:opacity-50 ${
                                c.active ? "text-muted-foreground" : "font-bold text-secondary"
                              }`}
                            >
                              {busyId === c.id ? (
                                <Spinner />
                              ) : c.active ? (
                                <CirclePause className="h-3 w-3" />
                              ) : (
                                <CircleCheck className="h-3 w-3" />
                              )}
                              {c.active ? "SWITCH OFF" : "SWITCH ON"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(c)}
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                            >
                              <SquarePen className="h-3 w-3" /> EDIT
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(c)}
                              disabled={busyId === c.id}
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-destructive hover:underline disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" /> DELETE
                            </button>
                          </div>
                          {rowError?.id === c.id && (
                            <p className="mt-2 max-w-xs font-mono text-[10px] text-destructive">
                              {rowError.message}
                            </p>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-border/30 bg-muted/20">
                          <td />
                          <td colSpan={7} className="p-4">
                            <Redemptions coupon={c} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
