"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleCheck,
  Minus,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  Trash2,
  Truck,
  UserPlus,
  UserRound,
  UserSearch,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { EmptyState, OrderStatusBadge, Spinner } from "@/components/status";
import { ApiError } from "@/lib/api/client";
import { adminApi, adminAuthApi, adminCustomersApi } from "@/lib/api/endpoints";
import type {
  AdminCustomer,
  AdminCustomerDetail,
  AdminUser,
  CatalogProduct,
  OrderQuote,
  QueueOrder,
} from "@/lib/api/types";

type Mode = "existing" | "new" | "guest";
type AddressField = [keyof typeof EMPTY_ADDRESS, string, string];

type CartLine = {
  sku: string;
  qty: number;
  name: string;
  color: string;
  size: string;
  image: string | null;
  price: number;
};

const REASONS = [
  "Payment failed on website",
  "WhatsApp order",
  "Instagram order",
  "Phone order",
  "Replacement / exchange",
  "Wholesale / bulk",
  "Other",
];
const PAY_METHODS = ["UPI", "Cash", "Bank transfer", "Payment link", "Card"];

const EMPTY_ADDRESS = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;
const input = "w-full bg-muted px-3 py-2 text-sm technical-border";
const label = "block text-[12px] font-medium text-muted-foreground mb-1";

function Section({
  step,
  title,
  hint,
  icon: Icon,
  done,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  icon: LucideIcon;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="technical-border bg-surface-lowest p-5 md:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
            done ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary"
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : step}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Icon className="h-4 w-4 text-muted-foreground" /> {title}
          </h3>
          {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; icon: LucideIcon }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
      {options.map(({ key, label: text, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors ${
            value === key
              ? "bg-surface-lowest font-semibold text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-3.5 w-3.5" /> {text}
        </button>
      ))}
    </div>
  );
}

function Thumb({ src, size = "h-12 w-12" }: { src: string | null; size?: string }) {
  return src ? (
    <img src={src} alt="" className={`${size} shrink-0 rounded-lg object-cover bg-muted`} />
  ) : (
    <div className={`${size} shrink-0 rounded-lg bg-muted flex items-center justify-center`}>
      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

/* ───────────────────────── Customer ───────────────────────── */

function CustomerSearch({ onPick }: { onPick: (c: AdminCustomer) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminCustomer[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) {
      setRows([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(() => {
      adminCustomersApi
        .list(q)
        .then((r) => setRows(r.slice(0, 8)))
        .catch(() => setRows([]))
        .finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search customers"
          placeholder="Name, email or phone…"
          className={`${input} pl-9`}
        />
        {busy && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner />
          </span>
        )}
      </div>
      {rows.length > 0 && (
        <ul className="technical-border divide-y divide-border/40 overflow-hidden">
          {rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {c.email}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </p>
                </div>
                <span className="text-[12px] text-muted-foreground">
                  {c.orders} order{c.orders === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !busy && rows.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          No customer matches “{q}”. Switch to <b>New customer</b> to add them.
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Products ───────────────────────── */

function ProductPicker({
  catalog,
  onAdd,
}: {
  catalog: CatalogProduct[] | null;
  onAdd: (line: CartLine) => void;
}) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const shown = (catalog || []).filter((p) => {
    const t = q.trim().toLowerCase();
    return (
      !t ||
      p.name.toLowerCase().includes(t) ||
      (p.qikinkProductId || "").includes(t) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(t) || v.color.toLowerCase().includes(t))
    );
  });
  const open = shown.find((p) => p.id === openId) || (catalog || []).find((p) => p.id === openId);
  const colours = open ? [...new Set(open.variants.map((v) => v.color))] : [];
  const sizes = open ? open.variants.filter((v) => v.color === color) : [];
  const picked = sizes.find((v) => v.size === size);

  const choose = (p: CatalogProduct) => {
    setOpenId(p.id === openId ? null : p.id);
    const first = p.variants[0]?.color ?? null;
    setColor(first);
    setSize(null);
    setQty(1);
  };

  if (!catalog) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Loading products…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
          placeholder="Search product, colour, SKU or Qikink ID…"
          className={`${input} pl-9`}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shown.slice(0, 12).map((p) => {
          const unmapped = p.variants.some((v) => !v.mapped);
          const active = p.id === openId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p)}
              className={`flex items-center gap-3 p-2.5 text-left technical-border transition-colors ${
                active ? "border-primary/60 bg-primary/8" : "hover:bg-muted/60"
              }`}
            >
              <Thumb src={p.image} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {money(p.price)} · {p.variants.length} options
                </p>
                <div className="mt-0.5 flex gap-1">
                  {p.status === "review" && (
                    <span className="rounded-full bg-tertiary/15 px-1.5 text-[10px] font-medium text-tertiary">
                      In review
                    </span>
                  )}
                  {unmapped && (
                    <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-medium text-destructive">
                      Some unmapped
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && (
        <EmptyState icon={ShoppingBag}>NO PRODUCT MATCHES “{q.trim()}”</EmptyState>
      )}
      {shown.length > 12 && (
        <p className="text-[12px] text-muted-foreground">
          Showing 12 of {shown.length} — search to narrow down.
        </p>
      )}

      {open && (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{open.name}</p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpenId(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <p className={label}>Colour</p>
            <div className="flex flex-wrap gap-2">
              {colours.map((c) => {
                const img = open.variants.find((v) => v.color === c)?.image ?? null;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      setSize(null);
                    }}
                    className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] ${
                      color === c
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border/60 hover:border-foreground"
                    }`}
                  >
                    <Thumb src={img} size="h-6 w-6 !rounded-full" />
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className={label}>Size</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((v) => (
                <button
                  key={v.sku}
                  type="button"
                  onClick={() => setSize(v.size)}
                  title={v.mapped ? v.sku : "No Qikink Store SKU — can't be printed yet"}
                  className={`min-w-11 border px-3 py-1.5 text-[13px] font-medium ${
                    size === v.size
                      ? "border-primary bg-primary text-primary-foreground"
                      : v.mapped
                        ? "border-border/60 hover:border-foreground"
                        : "border-destructive/50 text-destructive"
                  }`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`${label} mb-0`}>Qty</span>
              <div className="flex items-center rounded-lg border border-border/60">
                <button
                  type="button"
                  aria-label="Less"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  className="px-2 py-1.5"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center font-mono text-sm">{qty}</span>
                <button
                  type="button"
                  aria-label="More"
                  onClick={() => setQty((n) => Math.min(100, n + 1))}
                  className="px-2 py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {picked && (
                <span className="font-mono text-sm text-muted-foreground">
                  {money(picked.price * qty)}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={!picked}
              onClick={() => {
                if (!picked) return;
                onAdd({
                  sku: picked.sku,
                  qty,
                  name: open.name,
                  color: picked.color,
                  size: picked.size,
                  image: picked.image,
                  price: picked.price,
                });
                setSize(null);
                setQty(1);
              }}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              {picked ? `Add ${color} / ${size}` : "Pick a size"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function CreateOrderClient() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null);

  const [mode, setMode] = useState<Mode>("existing");
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [addressId, setAddressId] = useState<string | "new">("new");
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoting, setQuoting] = useState(false);

  const [payment, setPayment] = useState<"prepaid" | "cod">("prepaid");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payRef, setPayRef] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [push, setPush] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<QueueOrder | null>(null);

  useEffect(() => {
    adminAuthApi
      .me()
      .then(setMe)
      .catch(() => {});
    adminApi
      .orderCatalog()
      .then(setCatalog)
      .catch((err) => setError(errorText(err, "Could not load products.")));
  }, []);

  // Live price + coupon suggestions from the server.
  const shopperEmail = mode === "existing" ? customer?.email : address.email.trim();
  const cartKey = JSON.stringify(cart.map((l) => [l.sku, l.qty]));
  useEffect(() => {
    if (cart.length === 0) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    const t = setTimeout(() => {
      adminApi
        .quoteOrder({
          items: cart.map((l) => ({ sku: l.sku, qty: l.qty })),
          customerId: mode === "existing" ? customer?.id : undefined,
          email: shopperEmail || undefined,
          couponCode: couponCode || undefined,
        })
        .then(setQuote)
        .catch((err) => setError(errorText(err, "Could not price the order.")))
        .finally(() => setQuoting(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, customer?.id, mode, shopperEmail, couponCode]);

  const pickCustomer = async (row: AdminCustomer) => {
    const detail = await adminCustomersApi.get(row.id).catch(() => null);
    if (!detail) return;
    setCustomer(detail);
    const preferred = detail.addresses.find((a) => a.isDefault) || detail.addresses[0];
    const [first, ...rest] = detail.name.split(" ");
    if (preferred) {
      setAddressId(preferred.id);
      setAddress({ ...preferred, email: detail.email, state: preferred.state || "" });
    } else {
      setAddressId("new");
      setAddress({
        ...EMPTY_ADDRESS,
        firstName: first || "",
        lastName: rest.join(" "),
        phone: detail.phone || "",
        email: detail.email,
      });
    }
  };

  const addLine = (line: CartLine) =>
    setCart((prev) => {
      const at = prev.findIndex((l) => l.sku === line.sku);
      if (at === -1) return [...prev, line];
      return prev.map((l, i) => (i === at ? { ...l, qty: Math.min(100, l.qty + line.qty) } : l));
    });

  const setLineQty = (sku: string, qty: number) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.sku !== sku)
        : prev.map((l) => (l.sku === sku ? { ...l, qty } : l)),
    );

  const addressReady =
    address.firstName.trim() &&
    address.lastName.trim() &&
    address.street.trim() &&
    address.city.trim() &&
    address.postalCode.trim() &&
    /^[0-9+ -]{10,15}$/.test(address.phone.trim());

  const blockers = useMemo(() => {
    const list: string[] = [];
    if (mode === "existing" && !customer) list.push("Pick a customer (or switch to New / Guest).");
    if (mode === "new" && !/^\S+@\S+\.\S+$/.test(address.email.trim()))
      list.push("Add the customer's email.");
    if (cart.length === 0) list.push("Add at least one product.");
    if (!addressReady) list.push("Complete the delivery address and a 10-digit phone.");
    if (couponCode && quote?.couponError) list.push("Remove the coupon that doesn't apply.");
    if (push && quote?.lines.some((l) => !l.mapped))
      list.push("An item has no Qikink Store SKU — map it or turn off “Send to Qikink”.");
    return list;
  }, [mode, customer, address.email, cart.length, addressReady, couponCode, quote, push]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const order = await adminApi.createOrder({
        items: cart.map((l) => ({ sku: l.sku, qty: l.qty })),
        shipping: {
          firstName: address.firstName.trim(),
          lastName: address.lastName.trim(),
          street: address.street.trim(),
          city: address.city.trim(),
          state: address.state.trim() || undefined,
          postalCode: address.postalCode.trim(),
          country: address.country.trim() || "India",
          email: (mode === "existing" ? customer?.email : address.email.trim()) || undefined,
          phone: address.phone.trim(),
        },
        paymentMethod: payment,
        couponCode: couponCode || undefined,
        pushToQikink: push,
        customerId: mode === "existing" ? customer?.id : undefined,
        createCustomer: mode === "new",
        saveAddress: mode !== "guest" && addressId === "new" && saveAddress,
        paymentReference:
          payment === "prepaid" ? [payMethod, payRef.trim()].filter(Boolean).join(" ") : undefined,
        reason,
        note: note.trim() || undefined,
      });
      setCreated(order);
    } catch (err) {
      setError(errorText(err, "Could not create the order."));
    } finally {
      setSubmitting(false);
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

  const reset = () => {
    setCreated(null);
    setCart([]);
    setCouponCode("");
    setCouponInput("");
    setPayRef("");
    setNote("");
    setCustomer(null);
    setAddress(EMPTY_ADDRESS);
    setAddressId("new");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="orders"
        adminName={me?.name}
        adminRole={me?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
      <main className="ml-64 min-h-screen p-6 md:p-10 xl:p-14">
        <header className="mb-8">
          <Link
            href="/admin/orders"
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Orders
          </Link>
          <h2 className="text-4xl font-bold">Create order</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            For WhatsApp/phone orders, failed website payments or replacements. Priced by the
            server, exactly like checkout.
          </p>
        </header>

        {created ? (
          <section className="mx-auto max-w-xl technical-border bg-surface-lowest p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15">
              <CircleCheck className="h-7 w-7 text-secondary" />
            </div>
            <h3 className="text-2xl font-bold">Order {created.ref} created</h3>
            <div className="flex justify-center gap-2">
              <OrderStatusBadge status={created.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {money(created.value)} · {created.client}
              {created.qikinkOrderId ? ` · on Qikink #${created.qikinkOrderId}` : ""}
              {created.qikinkError ? ` · Qikink: ${created.qikinkError}` : ""}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href={`/admin/orders?q=${encodeURIComponent(created.ref)}`}
                className="technical-border px-4 py-2 text-[13px] font-medium hover:bg-muted"
              >
                View order
              </Link>
              <button
                type="button"
                onClick={reset}
                className="btn-primary px-4 py-2 text-[13px] font-semibold"
              >
                Create another
              </button>
            </div>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              {/* 1 · Customer */}
              <Section
                step={1}
                title="Customer"
                icon={UserRound}
                hint="Linking a customer puts the order in their account and unlocks coupons issued to them."
                done={
                  mode === "existing"
                    ? Boolean(customer)
                    : Boolean(address.firstName && address.phone)
                }
              >
                <Segmented
                  value={mode}
                  onChange={(m) => {
                    setMode(m);
                    setCustomer(null);
                    setAddressId("new");
                  }}
                  options={[
                    { key: "existing", label: "Existing customer", icon: UserSearch },
                    { key: "new", label: "New customer", icon: UserPlus },
                    { key: "guest", label: "Guest", icon: UserRound },
                  ]}
                />
                {mode === "existing" &&
                  (customer ? (
                    <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand font-semibold text-primary-foreground">
                        {customer.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {customer.email}
                          {customer.phone ? ` · ${customer.phone}` : ""} · {customer.orders.length}{" "}
                          past order{customer.orders.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomer(null)}
                        className="text-[13px] font-medium text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <CustomerSearch onPick={(c) => void pickCustomer(c)} />
                  ))}
                {mode === "new" && (
                  <p className="text-[13px] text-muted-foreground">
                    An account is created from the email below — they can sign in later with Google
                    on that email and see this order.
                  </p>
                )}
                {mode === "guest" && (
                  <p className="text-[13px] text-muted-foreground">
                    No account: the order isn&apos;t linked to anyone. Email is optional (used for
                    the confirmation).
                  </p>
                )}
              </Section>

              {/* 2 · Products */}
              <Section
                step={2}
                title="Products"
                icon={ShoppingBag}
                hint="Pick a product, a colour and a size. Live and in-review products are listed."
                done={cart.length > 0}
              >
                <ProductPicker catalog={catalog} onAdd={addLine} />
              </Section>

              {/* 3 · Delivery */}
              <Section
                step={3}
                title="Delivery address"
                icon={Truck}
                hint="Qikink needs a reachable phone number for the courier."
                done={Boolean(addressReady)}
              >
                {mode === "existing" && customer && customer.addresses.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {customer.addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setAddressId(a.id);
                          setAddress({ ...a, email: customer.email, state: a.state || "" });
                        }}
                        className={`p-3 text-left technical-border ${
                          addressId === a.id
                            ? "border-primary/60 bg-primary/8"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {addressId === a.id && <CircleCheck className="h-4 w-4 text-primary" />}
                          {a.firstName} {a.lastName}
                          <span className="rounded-full bg-muted px-2 text-[11px] text-muted-foreground">
                            {a.label}
                            {a.isDefault ? " · default" : ""}
                          </span>
                        </p>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          {a.street}, {a.city} {a.postalCode}
                        </p>
                        <p className="text-[12px] text-muted-foreground">{a.phone}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAddressId("new");
                        setAddress((cur) => ({
                          ...EMPTY_ADDRESS,
                          email: cur.email,
                          firstName: cur.firstName,
                          lastName: cur.lastName,
                          phone: cur.phone,
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 border border-dashed p-3 text-[13px] ${
                        addressId === "new"
                          ? "border-primary/60 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Plus className="h-4 w-4" /> New address
                    </button>
                  </div>
                )}

                {(addressId === "new" || mode !== "existing") && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["firstName", "First name", "Riya"],
                        ["lastName", "Last name", "Sharma"],
                        ["phone", "Phone", "9876543210"],
                        ...(mode !== "existing"
                          ? [
                              [
                                "email",
                                mode === "new" ? "Email (for their account)" : "Email (optional)",
                                "riya@gmail.com",
                              ],
                            ]
                          : []),
                        ["street", "House / street / area", "12, MG Road, Indiranagar"],
                        ["city", "City", "Bengaluru"],
                        ["state", "State", "Karnataka"],
                        ["postalCode", "PIN code", "560038"],
                      ] as AddressField[]
                    ).map(([key, text, ph]) => (
                      <div key={key} className={key === "street" ? "sm:col-span-2" : ""}>
                        <label htmlFor={`addr-${key}`} className={label}>
                          {text}
                        </label>
                        <input
                          id={`addr-${key}`}
                          value={address[key]}
                          onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                          placeholder={ph}
                          inputMode={
                            key === "phone" || key === "postalCode" ? "numeric" : undefined
                          }
                          className={input}
                        />
                      </div>
                    ))}
                    {mode !== "guest" && (
                      <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                        />
                        Save this address to the customer&apos;s account
                      </label>
                    )}
                  </div>
                )}
              </Section>

              {/* 4 · Payment */}
              <Section
                step={4}
                title="Payment & reason"
                icon={Wallet}
                done={payment === "cod" || Boolean(payRef.trim()) || payMethod === "Cash"}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      [
                        "prepaid",
                        "Paid already",
                        "Collected via UPI, cash, bank or a link — order starts as paid.",
                      ],
                      [
                        "cod",
                        "Cash on delivery",
                        "Qikink's courier collects the amount at the door.",
                      ],
                    ] as const
                  ).map(([key, title, hint]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPayment(key)}
                      className={`p-3 text-left technical-border ${
                        payment === key ? "border-primary/60 bg-primary/8" : "hover:bg-muted/60"
                      }`}
                    >
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {payment === key && <CircleCheck className="h-4 w-4 text-primary" />}
                        {title}
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>
                    </button>
                  ))}
                </div>
                {payment === "prepaid" && (
                  <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                    <div>
                      <label htmlFor="pay-method" className={label}>
                        Collected via
                      </label>
                      <select
                        id="pay-method"
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className={input}
                      >
                        {PAY_METHODS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="pay-ref" className={label}>
                        Reference (UTR / transaction id)
                      </label>
                      <input
                        id="pay-ref"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="e.g. 4815 1623 4201"
                        className={input}
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
                  <div>
                    <label htmlFor="reason" className={label}>
                      Why a manual order?
                    </label>
                    <select
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={input}
                    >
                      {REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="note" className={label}>
                      Internal note (optional)
                    </label>
                    <input
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Old order SB-XXXX failed at PayU"
                      className={input}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={push}
                    onChange={(e) => setPush(e.target.checked)}
                  />
                  Send to Qikink for printing right away
                </label>
              </Section>
            </div>

            {/* Summary */}
            <aside className="lg:sticky lg:top-6 space-y-4">
              <div className="technical-border bg-surface-lowest p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Order summary</h3>
                  {quoting && <Spinner />}
                </div>

                {cart.length === 0 ? (
                  <EmptyState icon={ShoppingBag}>ADD PRODUCTS TO START</EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {cart.map((l) => {
                      const priced = quote?.lines.find((q) => q.sku === l.sku);
                      return (
                        <li key={l.sku} className="flex gap-3">
                          <Thumb src={l.image} size="h-14 w-14" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{l.name}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {l.color} · {l.size}
                              {priced && !priced.mapped && (
                                <span className="ml-1 text-destructive">· unmapped</span>
                              )}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex items-center rounded-md border border-border/60">
                                <button
                                  type="button"
                                  aria-label={`Less ${l.name}`}
                                  onClick={() => setLineQty(l.sku, l.qty - 1)}
                                  className="px-1.5 py-0.5"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center font-mono text-[12px]">
                                  {l.qty}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`More ${l.name}`}
                                  onClick={() => setLineQty(l.sku, l.qty + 1)}
                                  className="px-1.5 py-0.5"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${l.name}`}
                                onClick={() => setLineQty(l.sku, 0)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="font-mono text-sm">
                            {money(priced?.lineTotal ?? l.price * l.qty)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Coupon */}
                <div className="space-y-2 border-t border-border/40 pt-4">
                  {couponCode ? (
                    <div
                      className={`flex items-center gap-2 rounded-lg p-2.5 text-[13px] ${
                        quote?.couponError ? "bg-destructive/10" : "bg-secondary/10"
                      }`}
                    >
                      <TicketPercent
                        className={`h-4 w-4 ${quote?.couponError ? "text-destructive" : "text-secondary"}`}
                      />
                      <span className="flex-1">
                        <b className="font-mono">{couponCode}</b>{" "}
                        {quote?.couponError ? (
                          <span className="text-destructive">{quote.couponError}</span>
                        ) : quote?.coupon ? (
                          <span className="text-secondary">saves {money(quote.discount)}</span>
                        ) : (
                          "checking…"
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label="Remove coupon"
                        onClick={() => setCouponCode("")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (couponInput.trim()) setCouponCode(couponInput.trim().toUpperCase());
                        setCouponInput("");
                      }}
                    >
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        aria-label="Coupon code"
                        placeholder="Coupon code"
                        className={`${input} font-mono`}
                      />
                      <button
                        type="submit"
                        disabled={!couponInput.trim() || cart.length === 0}
                        className="technical-border px-3 text-[13px] font-medium hover:bg-muted disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </form>
                  )}
                  {quote && quote.offers.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Coupons for this order
                      </p>
                      {quote.offers.slice(0, 6).map((o, i) => (
                        <button
                          key={o.code}
                          type="button"
                          disabled={!o.eligible || couponCode === o.code}
                          onClick={() => setCouponCode(o.code)}
                          className={`flex w-full items-start gap-2 rounded-lg border border-dashed p-2 text-left text-[12px] ${
                            o.eligible
                              ? "border-primary/40 hover:bg-primary/5"
                              : "border-border/50 opacity-60"
                          } ${couponCode === o.code ? "bg-primary/10" : ""}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="font-mono font-bold">{o.code}</span>
                            {o.personal && (
                              <span className="ml-1.5 rounded-full bg-brand-pink/15 px-1.5 text-[10px] text-brand-pink">
                                for them
                              </span>
                            )}
                            {i === 0 && o.eligible && (
                              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                                best
                              </span>
                            )}
                            <span className="block text-muted-foreground">
                              {o.eligible ? o.summary : o.reason}
                            </span>
                          </span>
                          {o.eligible && (
                            <span className="font-mono font-semibold text-secondary">
                              −{money(o.saving)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <dl className="space-y-1.5 border-t border-border/40 pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-mono">{money(quote?.subtotal ?? 0)}</dd>
                  </div>
                  {(quote?.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-secondary">
                      <dt>Coupon {quote?.coupon?.code}</dt>
                      <dd className="font-mono">−{money(quote?.discount ?? 0)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="font-mono">Free</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-border/40 pt-2">
                    <dt className="font-semibold">
                      {payment === "cod" ? "To collect on delivery" : "Total paid"}
                    </dt>
                    <dd className="font-mono text-xl font-bold">{money(quote?.total ?? 0)}</dd>
                  </div>
                </dl>

                {(blockers.length > 0 || (quote?.problems.length ?? 0) > 0) && (
                  <ul className="space-y-1 rounded-lg bg-tertiary/10 p-3 text-[12px]">
                    {[
                      ...blockers,
                      ...(quote?.problems ?? []).filter((p) => !push || !/Store SKU/.test(p)),
                    ].map((b) => (
                      <li key={b} className="flex gap-1.5">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" /> {b}
                      </li>
                    ))}
                  </ul>
                )}
                {error && <p className="text-[13px] text-destructive">{error}</p>}

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting || blockers.length > 0 || quoting}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <CircleCheck className="h-4 w-4" />
                  )}
                  {submitting
                    ? "Creating…"
                    : `Create order${quote ? ` · ${money(quote.total)}` : ""}`}
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
