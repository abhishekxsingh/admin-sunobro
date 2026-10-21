"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Contact,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Search,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { EmptyState, OrderStatusBadge, Spinner } from "@/components/status";
import { ApiError } from "@/lib/api/client";
import { adminAuthApi, adminCustomersApi } from "@/lib/api/endpoints";
import type { AdminCustomer, AdminCustomerDetail, AdminUser } from "@/lib/api/types";

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

function Avatar({ customer }: { customer: Pick<AdminCustomer, "name" | "avatarUrl"> }) {
  const initials = customer.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return customer.avatarUrl ? (
    <img
      src={customer.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className="h-9 w-9 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center font-mono text-[11px] text-primary">
      {initials || "?"}
    </div>
  );
}

const SIGN_IN: Record<AdminCustomer["authMethod"], string> = {
  google: "GOOGLE",
  password: "EMAIL",
  both: "GOOGLE + EMAIL",
};

function CustomerDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminCustomersApi
      .get(id)
      .then(setDetail)
      .catch((err) => setError(errorText(err, "Could not load this customer.")));
  }, [id]);

  if (error) return <p className="font-mono text-[11px] text-destructive">{error}</p>;
  if (!detail) {
    return (
      <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <Spinner /> LOADING…
      </p>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-widest">Contact</p>
        <p className="flex items-center gap-2 text-sm">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <a href={`mailto:${detail.email}`} className="hover:text-primary">
            {detail.email}
          </a>
        </p>
        <p className="flex items-center gap-2 text-sm">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          {detail.phone ? (
            <a href={`tel:${detail.phone}`} className="hover:text-primary">
              {detail.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">no phone yet</span>
          )}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-widest pt-2">
          Saved addresses · {detail.addresses.length}
        </p>
        {detail.addresses.length === 0 && (
          <p className="font-mono text-[10px] text-muted-foreground">None saved.</p>
        )}
        {detail.addresses.map((a) => (
          <div key={a.id} className="flex gap-2 text-sm">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p>
                {a.firstName} {a.lastName}
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  {a.label}
                  {a.isDefault ? " · default" : ""}
                </span>
              </p>
              <p className="text-muted-foreground">
                {a.street}, {a.city}
                {a.state ? `, ${a.state}` : ""} {a.postalCode}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">{a.phone}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-widest">
          Orders · {detail.orders.length}
        </p>
        {detail.orders.length === 0 ? (
          <EmptyState icon={ReceiptText}>NO ORDERS YET</EmptyState>
        ) : (
          <table className="w-full text-left border-collapse">
            <tbody>
              {detail.orders.map((o) => (
                <tr key={o.id} className="border-b border-border/30 last:border-b-0 align-top">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/admin/orders?q=${encodeURIComponent(o.reference)}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {o.reference}
                    </Link>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {day(o.createdAt)}
                    </p>
                  </td>
                  <td className="py-2 pr-3 text-sm">
                    {o.items.map((i, n) => (
                      <p key={n}>
                        {i.name}{" "}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {i.color} / {i.size} × {i.qty}
                        </span>
                      </p>
                    ))}
                  </td>
                  <td className="py-2 pr-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="py-2 font-mono text-xs whitespace-nowrap">
                    {money(o.total)}
                    {o.couponCode && (
                      <span className="block text-[10px] text-secondary">{o.couponCode}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function CustomersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  // ?id= (from an order's "View customer") opens that customer.
  const [open, setOpen] = useState<string | null>(() => searchParams.get("id"));

  useEffect(() => {
    adminAuthApi
      .me()
      .then(setMe)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const term = query.trim() || searchParams.get("id") || "";
    setSearching(true);
    const timer = setTimeout(
      () => {
        adminCustomersApi
          .list(term)
          .then((rows) => {
            setCustomers(rows);
            setError(null);
          })
          .catch((err) => setError(errorText(err, "Could not load customers.")))
          .finally(() => setSearching(false));
      },
      query ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [query, searchParams]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="customers"
        adminName={me?.name}
        adminRole={me?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-8">
          <p className="font-mono text-[11px] text-primary uppercase tracking-widest mb-2">
            People
          </p>
          <h2 className="text-4xl font-bold">Customers</h2>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            {customers
              ? `${customers.length}${customers.length === 100 ? "+" : ""} ${query.trim() ? "MATCHING" : "SHOWN"} · NEWEST FIRST`
              : "ACCOUNTS THAT SIGNED UP OR SIGNED IN WITH GOOGLE"}
          </p>
        </header>

        <div className="relative mb-6 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(null);
            }}
            aria-label="Search customers"
            placeholder="Search name, email, phone, city or PIN…"
            className="w-full bg-surface-lowest technical-border py-2 pl-9 pr-9 text-sm"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Spinner />
            </span>
          )}
        </div>

        <div className="technical-border bg-surface-lowest overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {[
                  "",
                  "Customer",
                  "Phone",
                  "Sign-in",
                  "Orders",
                  "Spent",
                  "Last order",
                  "Joined",
                ].map((h, i) => (
                  <th
                    key={h || i}
                    className="p-4 font-mono text-[11px] text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!customers ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    {error || (
                      <span className="inline-flex items-center gap-2">
                        <Spinner /> LOADING CUSTOMERS…
                      </span>
                    )}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState icon={Contact}>
                      {query.trim() ? `NO CUSTOMER MATCHES “${query.trim()}”` : "NO CUSTOMERS YET"}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isOpen = open === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        onClick={() => setOpen(isOpen ? null : c.id)}
                        className="cursor-pointer border-b border-border/30 hover:bg-muted/40 align-top"
                      >
                        <td className="p-4 w-10">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Hide" : "Show"} ${c.name}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar customer={c} />
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {c.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px]">
                          {c.phone || <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-4 font-mono text-[10px] text-muted-foreground">
                          {SIGN_IN[c.authMethod]}
                        </td>
                        <td className="p-4 font-mono text-[11px]">
                          {c.purchasedOrders}
                          <span className="text-muted-foreground"> / {c.orders}</span>
                          <p className="text-[10px] text-muted-foreground">paid / all</p>
                        </td>
                        <td className="p-4 font-mono text-sm">{money(c.totalSpent)}</td>
                        <td className="p-4 font-mono text-[11px] text-muted-foreground">
                          {day(c.lastOrderAt)}
                        </td>
                        <td className="p-4 font-mono text-[11px] text-muted-foreground">
                          {day(c.createdAt)}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-border/30 bg-muted/20">
                          <td />
                          <td colSpan={7} className="p-4">
                            <CustomerDetail id={c.id} />
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
        <p className="mt-4 font-mono text-[10px] text-muted-foreground">
          Orders placed before accounts were required (guest checkout) don&apos;t belong to a
          customer — find them in Orders by email or phone.
        </p>
      </main>
    </div>
  );
}
