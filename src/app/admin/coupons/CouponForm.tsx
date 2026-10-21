"use client";

import { useEffect, useState } from "react";
import {
  CalendarRange,
  Dices,
  IndianRupee,
  Percent,
  Save,
  Search,
  Sparkles,
  Tag,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { adminCouponsApi } from "@/lib/api/endpoints";
import type { Coupon, CouponCustomer, CouponKind, CouponPayload } from "@/lib/api/types";
import { Spinner } from "@/components/status";

export const KINDS: { key: CouponKind; label: string; hint: string; icon: LucideIcon }[] = [
  {
    key: "festival",
    label: "Festival",
    hint: "Diwali, Holi, Eid… — suggested on the website",
    icon: Sparkles,
  },
  {
    key: "seasonal",
    label: "Seasonal",
    hint: "Summer, monsoon, end-of-season sales",
    icon: CalendarRange,
  },
  {
    key: "general",
    label: "General",
    hint: "Any code you share — Instagram, influencers",
    icon: Tag,
  },
  {
    key: "customer",
    label: "For customers",
    hint: "Issued to particular customer accounts",
    icon: UserRound,
  },
];

const PREFIX: Record<CouponKind, string> = {
  festival: "FEST",
  seasonal: "SEASON",
  general: "SUNO",
  customer: "FORYOU",
};

const randomCode = (kind: CouponKind) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tail = Array.from(
    { length: 5 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  );
  return `${PREFIX[kind]}${tail.join("")}`;
};

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

type FormState = {
  kind: CouponKind;
  code: string;
  name: string;
  description: string;
  discountType: "percent" | "flat";
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  firstOrderOnly: boolean;
  showAtCheckout: boolean;
  active: boolean;
  customers: CouponCustomer[];
};

const fromCoupon = (c: Coupon | null, kind: CouponKind = "festival"): FormState =>
  c
    ? {
        kind: c.kind,
        code: c.code,
        name: c.name,
        description: c.description,
        discountType: c.discountType,
        value: String(c.value),
        maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : "",
        minOrderValue: c.minOrderValue ? String(c.minOrderValue) : "",
        startsAt: toLocalInput(c.startsAt),
        endsAt: toLocalInput(c.endsAt),
        usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
        perCustomerLimit: c.perCustomerLimit != null ? String(c.perCustomerLimit) : "",
        firstOrderOnly: c.firstOrderOnly,
        showAtCheckout: c.showAtCheckout,
        active: c.active,
        customers: c.customers,
      }
    : {
        kind,
        code: randomCode(kind),
        name: "",
        description: "",
        discountType: "percent",
        value: "10",
        maxDiscount: "",
        minOrderValue: "",
        startsAt: "",
        endsAt: "",
        usageLimit: "",
        perCustomerLimit: "1",
        firstOrderOnly: false,
        showAtCheckout: kind === "festival" || kind === "seasonal",
        active: true,
        customers: [],
      };

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const preview = (f: FormState) => {
  const value = Number(f.value) || 0;
  let text =
    f.discountType === "percent"
      ? `${value}% off${f.maxDiscount ? ` (up to ${money(Number(f.maxDiscount))})` : ""}`
      : `${money(value)} off`;
  if (f.minOrderValue) text += ` on orders over ${money(Number(f.minOrderValue))}`;
  const fmt = (v: string) =>
    new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (f.startsAt || f.endsAt) {
    text += ` · ${f.startsAt ? fmt(f.startsAt) : "now"} → ${f.endsAt ? fmt(f.endsAt) : "no end"}`;
  }
  if (f.kind === "customer") {
    text += ` · ${f.customers.length} customer${f.customers.length === 1 ? "" : "s"}`;
  }
  return text;
};

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-[11px] text-muted-foreground uppercase mb-1"
    >
      {children}
    </label>
  );
}

const input = "w-full bg-muted px-3 py-2 text-sm technical-border";

function CustomerPicker({
  selected,
  onChange,
}: {
  selected: CouponCustomer[];
  onChange: (next: CouponCustomer[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CouponCustomer[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      adminCouponsApi
        .searchCustomers(term)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const chosen = new Set(selected.map((c) => c.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="coupon-customer-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers by name, email, phone or paste a customer id"
          className={`${input} pl-9`}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Spinner />
          </span>
        )}
      </div>
      {results.length > 0 && (
        <ul className="technical-border bg-surface-lowest divide-y divide-border/30 max-h-56 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={chosen.has(c.id)}
                onClick={() => {
                  onChange([...selected, c]);
                  setQ("");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-40 flex items-center gap-2"
              >
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{c.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {c.email}
                  {c.phone ? ` · ${c.phone}` : ""}
                </span>
                {chosen.has(c.id) && <span className="ml-auto font-mono text-[11px]">ADDED</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="font-mono text-[11px] text-muted-foreground">No customer matches “{q}”.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {selected.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 technical-border bg-surface-container px-2 py-1 text-xs"
          >
            <UserRound className="h-3 w-3" />
            {c.name || c.id}
            {c.email && (
              <span className="font-mono text-[11px] text-muted-foreground">{c.email}</span>
            )}
            <button
              type="button"
              aria-label={`Remove ${c.name || c.id}`}
              onClick={() => onChange(selected.filter((s) => s.id !== c.id))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function CouponForm({
  coupon,
  onSaved,
  onCancel,
}: {
  coupon: Coupon | null;
  onSaved: (c: Coupon) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<FormState>(() => fromCoupon(coupon));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));
  const locked = Boolean(coupon && coupon.usedCount > 0);

  const pickKind = (kind: CouponKind) =>
    setF((prev) => ({
      ...prev,
      kind,
      // New coupons follow the preset; an existing code is never regenerated.
      code: coupon ? prev.code : randomCode(kind),
      showAtCheckout: kind === "festival" || kind === "seasonal",
      perCustomerLimit: kind === "customer" ? "1" : prev.perCustomerLimit,
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload: CouponPayload = {
      kind: f.kind,
      code: f.code.trim(),
      name: f.name.trim(),
      description: f.description.trim(),
      discountType: f.discountType,
      value: Number(f.value),
      maxDiscount: f.discountType === "percent" ? numberOrNull(f.maxDiscount) : null,
      minOrderValue: Number(f.minOrderValue) || 0,
      startsAt: fromLocalInput(f.startsAt),
      endsAt: fromLocalInput(f.endsAt),
      usageLimit: numberOrNull(f.usageLimit),
      perCustomerLimit: numberOrNull(f.perCustomerLimit),
      firstOrderOnly: f.firstOrderOnly,
      showAtCheckout: f.showAtCheckout,
      active: f.active,
      // Only customer coupons are restricted; switching type drops the list.
      customerIds: f.kind === "customer" ? f.customers.map((c) => c.id) : [],
    };
    try {
      const saved = coupon
        ? await adminCouponsApi.update(coupon.id, payload)
        : await adminCouponsApi.create(payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-8 p-6 technical-border bg-surface-lowest space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-widest">
            {coupon ? `Edit ${coupon.code}` : "New coupon"}
          </p>
          <p className="font-mono text-[12px] text-secondary mt-1">{preview(f)}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close coupon form"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Purpose */}
      <div
        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
        role="radiogroup"
        aria-label="Coupon type"
      >
        {KINDS.map(({ key, label, hint, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={f.kind === key}
            onClick={() => pickKind(key)}
            className={`p-3 text-left technical-border transition-all ${
              f.kind === key
                ? "border-secondary/60 bg-secondary/10"
                : "hover:border-foreground text-muted-foreground"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4" /> {label}
            </span>
            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>

      {/* Code + copy */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="coupon-code">Code (customers type this)</Label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              required
              value={f.code}
              disabled={locked}
              onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
              className={`${input} font-mono tracking-wider`}
            />
            {!locked && (
              <button
                type="button"
                onClick={() => set("code", randomCode(f.kind))}
                title="Generate a code"
                aria-label="Generate a code"
                className="technical-border px-3 hover:border-foreground"
              >
                <Dices className="h-4 w-4" />
              </button>
            )}
          </div>
          {locked && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Used {coupon?.usedCount}× — the code can no longer change.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="coupon-name">Name (shown with the offer)</Label>
          <input
            id="coupon-name"
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={
              f.kind === "festival"
                ? "Diwali Sale"
                : f.kind === "seasonal"
                  ? "Summer Drop"
                  : "Thank-you discount"
            }
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="coupon-description">Description (optional)</Label>
          <input
            id="coupon-description"
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Auto: e.g. 20% off on orders over ₹999"
            className={input}
          />
        </div>
      </div>

      {/* Discount */}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Label>Discount</Label>
          <div className="flex technical-border w-fit">
            {(
              [
                ["percent", "PERCENT", Percent],
                ["flat", "FLAT ₹", IndianRupee],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={f.discountType === key}
                onClick={() => set("discountType", key)}
                className={`flex items-center gap-1.5 px-3 py-2 font-mono text-[12px] ${
                  f.discountType === key
                    ? "bg-secondary/20 text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="coupon-value">
            {f.discountType === "percent" ? "Percent off" : "₹ off"}
          </Label>
          <input
            id="coupon-value"
            type="number"
            required
            min="1"
            max={f.discountType === "percent" ? 100 : undefined}
            step="any"
            value={f.value}
            onChange={(e) => set("value", e.target.value)}
            className={input}
          />
        </div>
        {f.discountType === "percent" && (
          <div>
            <Label htmlFor="coupon-max">Max discount ₹ (optional)</Label>
            <input
              id="coupon-max"
              type="number"
              min="1"
              value={f.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              placeholder="no cap"
              className={input}
            />
          </div>
        )}
        <div>
          <Label htmlFor="coupon-min">Minimum order ₹</Label>
          <input
            id="coupon-min"
            type="number"
            min="0"
            value={f.minOrderValue}
            onChange={(e) => set("minOrderValue", e.target.value)}
            placeholder="0"
            className={input}
          />
        </div>
      </div>

      {/* Schedule + limits */}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="coupon-start">Starts (blank = now)</Label>
          <input
            id="coupon-start"
            type="datetime-local"
            value={f.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="coupon-end">Ends (blank = never)</Label>
          <input
            id="coupon-end"
            type="datetime-local"
            value={f.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="coupon-usage">Total uses (blank = unlimited)</Label>
          <input
            id="coupon-usage"
            type="number"
            min="1"
            value={f.usageLimit}
            onChange={(e) => set("usageLimit", e.target.value)}
            placeholder="unlimited"
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="coupon-per-customer">Uses per customer (blank = unlimited)</Label>
          <input
            id="coupon-per-customer"
            type="number"
            min="1"
            value={f.perCustomerLimit}
            onChange={(e) => set("perCustomerLimit", e.target.value)}
            placeholder="unlimited"
            className={input}
          />
        </div>
      </div>

      {/* Customers */}
      {f.kind === "customer" && (
        <div>
          <Label htmlFor="coupon-customer-search">
            Customers who can use it (they must be logged in at checkout)
          </Label>
          <CustomerPicker selected={f.customers} onChange={(next) => set("customers", next)} />
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px]">
        {f.kind !== "customer" && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={f.showAtCheckout}
              onChange={(e) => set("showAtCheckout", e.target.checked)}
            />
            SUGGEST ON THE WEBSITE (offer pop-up, product pages, checkout) — otherwise only people
            with the code can use it
          </label>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={f.firstOrderOnly}
            onChange={(e) => set("firstOrderOnly", e.target.checked)}
          />
          FIRST ORDER ONLY
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          ACTIVE
        </label>
      </div>
      {f.kind === "customer" && (
        <p className="font-mono text-[11px] text-muted-foreground -mt-3">
          Customer coupons are always suggested to those customers when they are logged in (offer
          pop-up, product pages, checkout); other shoppers never see them.
        </p>
      )}

      {error && <p className="font-mono text-[12px] text-destructive">{error}</p>}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 font-mono text-[12px] text-muted-foreground hover:text-foreground"
        >
          CANCEL
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-4 py-2 font-mono text-[12px] font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Spinner /> : <Save className="h-3 w-3" aria-hidden />}
          {saving ? "SAVING..." : coupon ? "SAVE COUPON" : "CREATE COUPON"}
        </button>
      </div>
    </form>
  );
}
