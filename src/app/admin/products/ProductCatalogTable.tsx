"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ImageOff, Pencil } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { adminProductsApi } from "@/lib/api/endpoints";
import type { AdminProduct, ProductVariant } from "@/lib/api/types";
import { VariationsPanel } from "./VariationsPanel";

type Status = AdminProduct["status"];
type Filter = "all" | Status;

const STATUS_LABEL: Record<Status, string> = { review: "REVIEW", active: "LIVE", draft: "DRAFT" };
const STATUS_TONE: Record<Status, string> = {
  review: "bg-tertiary/10 text-tertiary border-tertiary/30",
  active: "bg-secondary/10 text-secondary border-secondary/20",
  draft: "border-border/40 text-muted-foreground",
};

const money = (n: number, cur = "INR") =>
  `${cur === "INR" ? "₹" : "$"}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

function Thumb({ src, alt, size = "h-10 w-10" }: { src: string; alt: string; size?: string }) {
  const [errored, setErrored] = useState(!src);
  if (errored) {
    return (
      <div
        className={`${size} shrink-0 bg-muted flex items-center justify-center technical-border`}
      >
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={`${size} shrink-0 object-cover technical-border bg-muted`}
    />
  );
}

function Toggle({
  on,
  label,
  disabled,
  onChange,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 rounded-full border transition-colors disabled:opacity-40 ${
        on ? "bg-secondary/80 border-secondary" : "bg-muted border-border/60"
      }`}
    >
      <span
        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-all ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/** Colours → sizes for one product, each switchable on/off. */
function ProductOptions({
  product,
  onUpdated,
}: {
  product: AdminProduct;
  onUpdated: (p: AdminProduct) => void;
}) {
  const [variants, setVariants] = useState<ProductVariant[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminProductsApi
      .get(product.id)
      .then((full) => {
        if (!cancelled) setVariants(full.variants || []);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, "Could not load options."));
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const colours = useMemo(() => {
    const byColour = new Map<string, ProductVariant[]>();
    (variants || []).forEach((v) => byColour.set(v.color, [...(byColour.get(v.color) || []), v]));
    return [...byColour.entries()];
  }, [variants]);

  const toggle = async (color: string, size: string | undefined, enabled: boolean) => {
    const key = `${color}|${size ?? "*"}`;
    setBusy(key);
    setError(null);
    try {
      const updated = await adminProductsApi.setAvailability(product.id, { color, size, enabled });
      setVariants(updated.variants || []);
      onUpdated(updated);
    } catch (err) {
      setError(errorText(err, "Could not change that option."));
    } finally {
      setBusy(null);
    }
  };

  if (!variants) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        {error || "LOADING COLOURS + SIZES…"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] text-muted-foreground">
        Switched-off colours or sizes disappear from the website and can&apos;t be ordered. They
        stay off when you re-import the sheet.
      </p>
      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {colours.map(([color, rows]) => {
          const anyOn = rows.some((v) => v.enabled !== false);
          const image = rows.find((v) => v.image)?.image || product.images[0] || "";
          return (
            <div
              key={color}
              className={`p-3 technical-border bg-surface-container space-y-3 ${anyOn ? "" : "opacity-60"}`}
            >
              <div className="flex items-center gap-3">
                <Thumb src={image} alt={`${product.name} in ${color}`} size="h-12 w-12" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{color}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {rows.filter((v) => v.enabled !== false).length}/{rows.length} sizes on
                  </p>
                </div>
                <Toggle
                  on={anyOn}
                  label={`${anyOn ? "Switch off" : "Switch on"} ${color}`}
                  disabled={busy !== null}
                  onChange={(next) => void toggle(color, undefined, next)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {rows.map((v) => {
                  const on = v.enabled !== false;
                  return (
                    <button
                      key={v.size}
                      type="button"
                      aria-pressed={on}
                      title={v.qikinkSku ? `Store SKU ${v.qikinkSku}` : "No Qikink Store SKU"}
                      disabled={busy !== null}
                      onClick={() => void toggle(color, v.size, !on)}
                      className={`px-2.5 py-1 font-mono text-[11px] border transition-all disabled:opacity-50 ${
                        on
                          ? "border-secondary/50 text-foreground"
                          : "border-border/40 text-muted-foreground line-through"
                      } ${v.qikinkSku ? "" : "border-destructive/60"}`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductCatalogTable({
  products,
  onProductChange,
  onEdit,
  onDelete,
  deletingId,
}: {
  products: AdminProduct[];
  onProductChange: (p: AdminProduct) => void;
  onEdit: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
  deletingId: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [variationsFor, setVariationsFor] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: products.length,
      review: products.filter((p) => p.status === "review").length,
      active: products.filter((p) => p.status === "active").length,
      draft: products.filter((p) => p.status === "draft").length,
    }),
    [products],
  );
  const visible = filter === "all" ? products : products.filter((p) => p.status === filter);

  const save = async (product: AdminProduct, patch: { name?: string; status?: Status }) => {
    setBusyId(product.id);
    setRowError(null);
    try {
      onProductChange(await adminProductsApi.update(product.id, patch));
      return true;
    } catch (err) {
      setRowError({ id: product.id, message: errorText(err, "Could not save.") });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const commitRename = async (product: AdminProduct) => {
    const name = renaming?.value.trim();
    if (!name || name === product.name) {
      setRenaming(null);
      return;
    }
    if (await save(product, { name })) setRenaming(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter products by status">
        {(
          [
            ["all", "ALL"],
            ["review", "IN REVIEW"],
            ["active", "LIVE"],
            ["draft", "DRAFT"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`font-mono text-[11px] px-3 py-1.5 border transition-all ${
              filter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/40 text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {label} · {counts[key]}
          </button>
        ))}
      </div>

      <div className="technical-border bg-surface-lowest overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/30 bg-muted/30">
              {["", "Product", "Status", "Price", "Colours", "Qikink", "Actions"].map((h, i) => (
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
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center font-mono text-xs text-muted-foreground">
                  {products.length === 0
                    ? "NO PRODUCTS YET — ADD ONE OR IMPORT THE PRODUCT SHEET"
                    : "NOTHING IN THIS LIST"}
                </td>
              </tr>
            ) : (
              visible.map((product) => {
                const open = expanded === product.id;
                const enabled = product.enabledCount ?? product.variantCount;
                const mappedOk = enabled > 0 && product.mappedCount >= enabled;
                return (
                  <Fragment key={product.id}>
                    <tr className="border-b border-border/30 hover:bg-muted/40 transition-colors align-top">
                      <td className="p-4 w-10">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`${open ? "Hide" : "Show"} colours and sizes of ${product.name}`}
                          onClick={() => setExpanded(open ? null : product.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 min-w-64">
                        <div className="flex items-center gap-3">
                          <Thumb src={product.images[0] || ""} alt={product.name} />
                          <div className="min-w-0 flex-1">
                            {renaming?.id === product.id ? (
                              <input
                                id={`rename-${product.id}`}
                                autoFocus
                                value={renaming.value}
                                onChange={(e) =>
                                  setRenaming({ id: product.id, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void commitRename(product);
                                  if (e.key === "Escape") setRenaming(null);
                                }}
                                onBlur={() => void commitRename(product)}
                                disabled={busyId === product.id}
                                aria-label="Product name"
                                className="w-full bg-muted px-2 py-1 text-sm technical-border"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRenaming({ id: product.id, value: product.name })}
                                title="Rename"
                                className="group flex items-center gap-2 text-left text-sm font-medium hover:text-primary"
                              >
                                {product.name}
                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60" />
                              </button>
                            )}
                            <p className="font-mono text-[10px] text-muted-foreground">
                              /products/{product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 border ${STATUS_TONE[product.status]}`}
                        >
                          {STATUS_LABEL[product.status]}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-sm">
                        {money(product.price, product.currency)}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-muted-foreground">
                        {product.variantCount === 0 ? (
                          <span className="text-tertiary">
                            0/{product.qikink?.expectedVariants ?? "?"} · add variations
                          </span>
                        ) : (
                          <>
                            {enabled}/{product.variantCount} on
                            {product.qikink?.expectedVariants &&
                            product.qikink.expectedVariants !== product.variantCount ? (
                              <span className="block text-tertiary">
                                Qikink has {product.qikink.expectedVariants}
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        {product.variantCount === 0 ? (
                          <span className="font-mono text-[10px] px-2 py-0.5 border border-border/40 text-muted-foreground">
                            NO VARIANTS
                          </span>
                        ) : (
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 border ${
                              mappedOk
                                ? "bg-secondary/10 text-secondary border-secondary/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            {mappedOk ? "MAPPED" : "UNMAPPED"} {product.mappedCount}/{enabled}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                          {product.status === "active" ? (
                            <button
                              onClick={() => void save(product, { status: "draft" })}
                              disabled={busyId === product.id}
                              className="font-mono text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                              UNPUBLISH
                            </button>
                          ) : (
                            <button
                              onClick={() => void save(product, { status: "active" })}
                              disabled={busyId === product.id}
                              className="font-mono text-[11px] font-bold text-secondary hover:underline disabled:opacity-50"
                            >
                              {busyId === product.id ? "…" : "PUBLISH"}
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setVariationsFor(variationsFor === product.id ? null : product.id)
                            }
                            className={`font-mono text-[11px] hover:underline ${
                              product.variantCount === 0
                                ? "font-bold text-tertiary"
                                : "text-primary"
                            }`}
                          >
                            {product.variantCount === 0 ? "ADD VARIATIONS" : "VARIATIONS"}
                          </button>
                          <button
                            onClick={() => onEdit(product)}
                            className="font-mono text-[11px] text-primary hover:underline"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => onDelete(product)}
                            disabled={deletingId === product.id}
                            className="font-mono text-[11px] text-destructive hover:underline disabled:opacity-50"
                          >
                            {deletingId === product.id ? "…" : "DELETE"}
                          </button>
                        </div>
                        {rowError?.id === product.id && (
                          <p className="mt-2 max-w-xs font-mono text-[10px] text-destructive">
                            {rowError.message}
                          </p>
                        )}
                      </td>
                    </tr>
                    {variationsFor === product.id && (
                      <tr className="border-b border-border/30 bg-muted/20">
                        <td />
                        <td colSpan={6} className="p-4">
                          <VariationsPanel
                            product={product}
                            onSaved={onProductChange}
                            onClose={() => setVariationsFor(null)}
                          />
                        </td>
                      </tr>
                    )}
                    {open && (
                      <tr className="border-b border-border/30 bg-muted/20">
                        <td />
                        <td colSpan={6} className="p-4">
                          <ProductOptions product={product} onUpdated={onProductChange} />
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
    </div>
  );
}
