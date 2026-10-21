"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { adminApi, adminProductsApi } from "@/lib/api/endpoints";
import type { AdminProduct, ProductVariant, QueueOrder } from "@/lib/api/types";

type Line = { productId: string; sku: string; qty: number };

const EMPTY_SHIPPING = {
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

const SHIPPING_FIELDS: { key: keyof typeof EMPTY_SHIPPING; label: string; required?: boolean }[] = [
  { key: "firstName", label: "First name", required: true },
  { key: "lastName", label: "Last name", required: true },
  { key: "phone", label: "Phone (courier calls this)", required: true },
  { key: "email", label: "Email (optional — gets confirmation)" },
  { key: "street", label: "Street address", required: true },
  { key: "city", label: "City", required: true },
  { key: "state", label: "State" },
  { key: "postalCode", label: "PIN code", required: true },
  { key: "country", label: "Country", required: true },
];

/**
 * Admin-created orders for sales outside the storefront (WhatsApp, Instagram,
 * phone). Uses the same server-side pricing as checkout and can push straight
 * to Qikink.
 */
export function NewOrderPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (order: QueueOrder) => void;
}) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, ProductVariant[]>>({});
  const [lines, setLines] = useState<Line[]>([{ productId: "", sku: "", qty: 1 }]);
  const [shipping, setShipping] = useState(EMPTY_SHIPPING);
  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod">("prepaid");
  const [pushToQikink, setPushToQikink] = useState(true);
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminProductsApi
      .list({ page: 1, limit: 100 })
      .then(setProducts)
      .catch(() => setError("Could not load products."));
  }, []);

  const loadVariants = async (productId: string) => {
    if (!productId || variantsByProduct[productId]) return;
    try {
      const full = await adminProductsApi.get(productId);
      setVariantsByProduct((m) => ({ ...m, [productId]: full.variants || [] }));
    } catch {
      setError("Could not load that product's variants.");
    }
  };

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const variantFor = (line: Line) =>
    variantsByProduct[line.productId]?.find((v) => v.sku === line.sku);

  const estimatedTotal = lines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    const variant = variantFor(line);
    const price = variant?.price ?? product?.price ?? 0;
    return sum + price * line.qty;
  }, 0);

  const unmappedLine = lines.find((line) => {
    const variant = variantFor(line);
    return variant && !variant.qikinkSku;
  });

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const items = lines.filter((l) => l.sku).map((l) => ({ sku: l.sku, qty: l.qty }));
    if (items.length === 0) {
      setError("Add at least one product variant.");
      return;
    }
    setSaving(true);
    try {
      const order = await adminApi.createOrder({
        items,
        shipping: {
          ...shipping,
          email: shipping.email.trim() || undefined,
          state: shipping.state.trim() || undefined,
        },
        paymentMethod,
        note: note.trim() || undefined,
        couponCode: couponCode.trim() || undefined,
        pushToQikink,
      });
      onCreated(order);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-6 technical-border bg-surface-lowest space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest">New Order</p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted-foreground uppercase">Items</p>
        {lines.map((line, i) => {
          const variants = variantsByProduct[line.productId] || [];
          return (
            <div key={i} className="grid grid-cols-[2fr_2fr_80px_auto] gap-2 items-center">
              <select
                value={line.productId}
                onChange={(e) => {
                  updateLine(i, { productId: e.target.value, sku: "" });
                  void loadVariants(e.target.value);
                }}
                className="bg-muted technical-border px-3 py-2 font-mono text-xs"
              >
                <option value="">Product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.status === "draft" ? " (draft)" : ""}
                  </option>
                ))}
              </select>
              <select
                value={line.sku}
                onChange={(e) => updateLine(i, { sku: e.target.value })}
                disabled={!line.productId}
                className="bg-muted technical-border px-3 py-2 font-mono text-xs disabled:opacity-50"
              >
                <option value="">Size / colour…</option>
                {variants.map((v) => (
                  <option key={v.sku} value={v.sku}>
                    {v.size} / {v.color}
                    {v.qikinkSku ? "" : " — NO QIKINK SKU"}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={100}
                value={line.qty}
                onChange={(e) =>
                  updateLine(i, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
                className="bg-muted technical-border px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setLines((rows) => rows.filter((_, idx) => idx !== i))}
                disabled={lines.length === 1}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                aria-label="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setLines((rows) => [...rows, { productId: "", sku: "", qty: 1 }])}
          className="font-mono text-[11px] text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> ADD ITEM
        </button>
      </div>

      {/* Shipping */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SHIPPING_FIELDS.map(({ key, label, required }) => (
          <div key={key} className={key === "street" ? "md:col-span-3" : ""}>
            <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
              {label}
            </label>
            <input
              required={required}
              value={shipping[key]}
              onChange={(e) => setShipping((s) => ({ ...s, [key]: e.target.value }))}
              className="w-full bg-muted px-3 py-2 text-sm technical-border"
            />
          </div>
        ))}
      </div>

      {/* Payment + Qikink */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">Payment</p>
          <div className="flex gap-2">
            {(
              [
                ["prepaid", "PREPAID (COLLECTED)"],
                ["cod", "CASH ON DELIVERY"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMethod(value)}
                className={`px-3 py-2 font-mono text-[11px] technical-border ${
                  paymentMethod === value
                    ? "bg-secondary/20 text-secondary border-secondary/40"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            {paymentMethod === "cod"
              ? "Order stays PENDING; Qikink collects cash on delivery."
              : "Order is marked PAID — use when money was already received (UPI, bank)."}
          </p>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-mono text-[11px]">
            <input
              type="checkbox"
              checked={pushToQikink}
              onChange={(e) => setPushToQikink(e.target.checked)}
            />
            PUSH TO QIKINK NOW
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note (e.g. WhatsApp order, UPI ref)"
            className="w-full bg-muted px-3 py-2 text-sm technical-border"
          />
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            aria-label="Coupon code"
            placeholder="Coupon code (optional) — same rules as checkout"
            className="w-full bg-muted px-3 py-2 font-mono text-sm technical-border"
          />
        </div>
      </div>

      {unmappedLine && pushToQikink && (
        <p className="font-mono text-[11px] text-destructive">
          A selected variant has no Qikink SKU — the push will fail until it is mapped in Products.
        </p>
      )}
      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="font-mono text-sm">
          Est. total: <span className="font-bold">₹{estimatedTotal.toLocaleString("en-IN")}</span>
          <span className="text-[10px] text-muted-foreground"> (server re-prices)</span>
        </p>
        <button
          type="submit"
          disabled={saving}
          className="bg-secondary text-secondary-foreground px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? "CREATING..." : pushToQikink ? "CREATE + PUSH" : "CREATE ORDER"}
        </button>
      </div>
    </form>
  );
}
