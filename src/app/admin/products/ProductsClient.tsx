"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, ImageOff, Plus, Trash2, Wand2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ApiError } from "@/lib/api/client";
import { adminAuthApi, adminProductsApi } from "@/lib/api/endpoints";
import type { AdminProduct, AdminUser } from "@/lib/api/types";
import { SheetImportPanel } from "./SheetImportPanel";

const DEMO_PRODUCTS: AdminProduct[] = [
  {
    id: "demo-p1",
    slug: "sunobro-technical-tee",
    name: "SunoBro Technical Tee",
    description: "Precision-cut technical tee for the developer environment.",
    price: 799,
    currency: "INR",
    images: [],
    sizes: ["S", "M", "L", "XL"],
    inStock: true,
    status: "active",
    trackInventory: false,
    variantCount: 8,
    mappedCount: 8,
    totalStock: 0,
    qikinkSynced: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-p2",
    slug: "circuit-hoodie",
    name: "Circuit Hoodie",
    description: "Fleece hoodie with front circuit print.",
    price: 1499,
    currency: "INR",
    images: [],
    sizes: ["M", "L"],
    inStock: true,
    status: "draft",
    trackInventory: false,
    variantCount: 4,
    mappedCount: 2,
    totalStock: 0,
    qikinkSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

type ProductForm = {
  name: string;
  slug: string;
  description: string;
  price: string;
  images: string;
  status: "active" | "draft";
  trackInventory: boolean;
};

type VariantRow = {
  size: string;
  color: string;
  sku: string;
  qikinkSku: string;
  price: string;
  stock: string;
  image: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  images: "",
  status: "draft",
  trackInventory: false,
};

const rowKey = (size: string, color: string) =>
  `${size.trim().toLowerCase()}|${color.trim().toLowerCase()}`;

const splitList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const money = (n: number, cur = "INR") =>
  `${cur === "INR" ? "₹" : "$"}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

function ProductThumb({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(!src);
  if (errored) {
    return (
      <div className="w-10 h-10 shrink-0 bg-muted flex items-center justify-center technical-border">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="w-10 h-10 shrink-0 object-cover technical-border bg-muted"
    />
  );
}

function MappingBadge({ mapped, total }: { mapped: number; total: number }) {
  const complete = total > 0 && mapped === total;
  return (
    <span
      className={`font-mono text-[10px] px-2 py-0.5 border ${
        complete
          ? "bg-secondary/10 text-secondary border-secondary/20"
          : "bg-destructive/10 text-destructive border-destructive/20"
      }`}
    >
      {complete ? "MAPPED" : "UNMAPPED"} {mapped}/{total}
    </span>
  );
}

export function ProductsClient() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [gridSizes, setGridSizes] = useState("S, M, L, XL");
  const [gridColors, setGridColors] = useState("Black");
  const [skuPattern, setSkuPattern] = useState("");
  const [colorCodes, setColorCodes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);

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

    adminProductsApi
      .list({ page: 1, limit: 100 })
      .then((liveProducts) => {
        if (cancelled) return;
        setProducts(liveProducts);
        setIsDemo(false);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts(DEMO_PRODUCTS);
        setIsDemo(true);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const mappedCount = variants.filter((v) => v.qikinkSku.trim()).length;
  const fullyMapped = variants.length > 0 && mappedCount === variants.length;

  const liveUnmapped = products.filter((p) => p.status === "active" && !p.qikinkSynced);

  const duplicateQikinkSkus = useMemo(() => {
    const counts = new Map<string, number>();
    variants.forEach((v) => {
      const sku = v.qikinkSku.trim();
      if (sku) counts.set(sku, (counts.get(sku) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([sku]) => sku));
  }, [variants]);

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

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setVariants([]);
    setGridSizes("S, M, L, XL");
    setGridColors("Black");
    setEditTarget(null);
    setFormError(null);
    setView("create");
  };

  const openEdit = async (p: AdminProduct) => {
    setFormError(null);
    setEditTarget(p);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: String(p.price),
      images: p.images.join("\n"),
      status: p.status,
      trackInventory: p.trackInventory,
    });
    setVariants([]);
    setView("edit");
    try {
      // The list payload has no variants — load them so the mapping is editable.
      const full = await adminProductsApi.get(p.id);
      const rows = (full.variants || []).map((v) => ({
        size: v.size,
        color: v.color,
        sku: v.sku,
        qikinkSku: v.qikinkSku || "",
        price: v.price != null ? String(v.price) : "",
        stock: String(v.stock ?? 0),
        image: v.image || "",
      }));
      setVariants(rows);
      setGridSizes([...new Set(rows.map((r) => r.size))].join(", "));
      setGridColors([...new Set(rows.map((r) => r.color))].join(", "));
    } catch (err) {
      setFormError(errorMessage(err, "Could not load this product's variants."));
    }
  };

  // Rebuild sizes × colours, keeping whatever was already entered per variant.
  const buildGrid = () => {
    const sizes = splitList(gridSizes);
    const colors = splitList(gridColors);
    const existing = new Map(variants.map((v) => [rowKey(v.size, v.color), v]));
    setVariants(
      colors.flatMap((color) =>
        sizes.map(
          (size) =>
            existing.get(rowKey(size, color)) || {
              size,
              color,
              sku: "",
              qikinkSku: "",
              price: "",
              stock: "0",
              image: "",
            },
        ),
      ),
    );
  };

  // Fill empty Qikink SKUs from a pattern like "MVnHs-{COLOR}-{SIZE}", with
  // optional colour codes such as "Black=Bk, White=Wh".
  const fillFromPattern = () => {
    if (!skuPattern.trim()) return;
    const codes = new Map(
      splitList(colorCodes)
        .map((pair) => pair.split("=").map((s) => s.trim()))
        .filter(([name, code]) => name && code)
        .map(([name, code]) => [name.toLowerCase(), code]),
    );
    setVariants((rows) =>
      rows.map((row) =>
        row.qikinkSku.trim()
          ? row
          : {
              ...row,
              qikinkSku: skuPattern
                .replaceAll("{COLOR}", codes.get(row.color.toLowerCase()) || row.color)
                .replaceAll("{SIZE}", row.size),
            },
      ),
    );
  };

  const updateRow = (index: number, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (variants.length === 0) {
      setFormError("Build the variant grid first — every product needs at least one size/colour.");
      return;
    }
    if (duplicateQikinkSkus.size > 0) {
      setFormError("Each variant needs its own Qikink SKU — fix the highlighted duplicates.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim(),
      price: parseFloat(form.price) || 0,
      currency: "INR",
      images: splitList(form.images),
      status: form.status,
      trackInventory: form.trackInventory,
      variants: variants.map((v) => ({
        size: v.size.trim(),
        color: v.color.trim(),
        sku: v.sku.trim() || undefined,
        qikinkSku: v.qikinkSku.trim() || undefined,
        price: v.price.trim() ? parseFloat(v.price) : undefined,
        stock: form.trackInventory ? parseInt(v.stock, 10) || 0 : undefined,
        image: v.image.trim(),
      })),
    };

    try {
      if (view === "edit" && editTarget) {
        const updated = await adminProductsApi.update(editTarget.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === editTarget.id ? updated : p)));
      } else {
        const created = await adminProductsApi.create(payload);
        setProducts((prev) => [created, ...prev]);
      }
      setView("list");
    } catch (err) {
      setFormError(errorMessage(err, "Save failed — is the API running?"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!window.confirm(`Delete ${product.name}? Past orders keep their line items.`)) return;
    setDeletingId(product.id);
    try {
      await adminProductsApi.remove(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      setNotice({ message: errorMessage(err, "Delete failed."), error: true });
    } finally {
      setDeletingId(null);
    }
  };

  const reloadProducts = async () => {
    try {
      setProducts(await adminProductsApi.list({ page: 1, limit: 100 }));
    } catch (err) {
      setNotice({ message: errorMessage(err, "Could not reload products."), error: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="products"
        adminName={adminUser?.name}
        adminRole={adminUser?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-mono text-[11px] text-primary uppercase tracking-widest">
              Products Catalog
            </p>
            {isDemo && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/30 uppercase tracking-widest">
                Demo Data
              </span>
            )}
          </div>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
              <h2 className="text-4xl font-bold">Product Catalog</h2>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                {products.length} PRODUCT{products.length === 1 ? "" : "S"} ·{" "}
                {products.filter((p) => p.status === "active").length} LIVE
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/SunoBro-Product-Sheet.xlsx"
                download
                className="technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all flex items-center gap-2"
              >
                <Download className="h-3.5 w-3.5" /> PRODUCT SHEET
              </a>
              <button
                onClick={() => setShowImport(true)}
                className="bg-muted technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all flex items-center gap-2"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> IMPORT SHEET
              </button>
              <button
                onClick={openCreate}
                className="bg-foreground text-background px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" /> ADD PRODUCT
              </button>
            </div>
          </div>
        </header>

        {/* How listing ↔ Qikink works */}
        <section className="mb-8 p-4 technical-border bg-surface-container font-mono text-[10px] text-muted-foreground grid md:grid-cols-4 gap-4">
          {[
            ["01 · DESIGN", "Create the product in dashboard.qikink.com → My Products."],
            [
              "02 · FILL THE SHEET",
              "One row per colour × size with its Store SKU (v-…) from Product Variations — not the Product SKU.",
            ],
            [
              "03 · IMPORT",
              "IMPORT SHEET → check the preview → APPLY. Re-upload any time to update.",
            ],
            [
              "04 · LIVE",
              "Products set to active go live once every variant has a Store SKU. Paid orders push to Qikink.",
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="text-primary mb-1">{title}</p>
              <p>{body}</p>
            </div>
          ))}
        </section>

        {liveUnmapped.length > 0 && (
          <div className="mb-6 p-4 technical-border border-destructive/40 bg-destructive/5 font-mono text-[11px] text-destructive">
            {liveUnmapped.length} LIVE PRODUCT{liveUnmapped.length === 1 ? " IS" : "S ARE"} MISSING
            QIKINK SKUS — paid orders for them cannot be printed. Map them (MAP SKUS) or switch them
            to DRAFT: {liveUnmapped.map((p) => p.name).join(", ")}.
          </div>
        )}

        {notice && (
          <p
            className={`mb-4 font-mono text-[11px] ${notice.error ? "text-destructive" : "text-secondary"}`}
          >
            {notice.message}
          </p>
        )}

        {showImport && (
          <SheetImportPanel onClose={() => setShowImport(false)} onApplied={reloadProducts} />
        )}

        {/* Create / Edit form */}
        {(view === "create" || view === "edit") && (
          <form
            onSubmit={handleSave}
            className="mb-8 p-6 technical-border bg-surface-lowest space-y-8"
          >
            <p className="font-mono text-[11px] uppercase tracking-widest">
              {view === "create" ? "New Product" : `Edit: ${editTarget?.name}`}
            </p>

            {/* Storefront listing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Slug (URL — auto from name if empty)
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Base price (INR)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Inventory
                </label>
                <label className="flex items-center gap-2 font-mono text-[11px] py-2">
                  <input
                    type="checkbox"
                    checked={form.trackInventory}
                    onChange={(e) => setForm((f) => ({ ...f, trackInventory: e.target.checked }))}
                  />
                  TRACK STOCK (leave off for print-on-demand — never sells out)
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Image URLs (one per line — first is the cover; Qikink mockup links work)
                </label>
                <textarea
                  value={form.images}
                  onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
                  rows={2}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border resize-y"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border resize-y"
                />
              </div>
            </div>

            {/* Variants ↔ Qikink */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-widest">
                  Variants → Qikink SKUs
                </p>
                <MappingBadge mapped={mappedCount} total={variants.length} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                    Sizes
                  </label>
                  <input
                    value={gridSizes}
                    onChange={(e) => setGridSizes(e.target.value)}
                    className="w-full bg-muted px-3 py-2 text-sm technical-border"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                    Colours
                  </label>
                  <input
                    value={gridColors}
                    onChange={(e) => setGridColors(e.target.value)}
                    className="w-full bg-muted px-3 py-2 text-sm technical-border"
                  />
                </div>
                <button
                  type="button"
                  onClick={buildGrid}
                  className="technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all"
                >
                  BUILD GRID
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                    Optional SKU pattern — {"{COLOR}"} and {"{SIZE}"} tokens
                  </label>
                  <input
                    value={skuPattern}
                    onChange={(e) => setSkuPattern(e.target.value)}
                    placeholder="MVnHs-{COLOR}-{SIZE}"
                    className="w-full bg-muted px-3 py-2 text-sm technical-border"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                    Qikink colour codes (optional)
                  </label>
                  <input
                    value={colorCodes}
                    onChange={(e) => setColorCodes(e.target.value)}
                    placeholder="Black=Bk, White=Wh"
                    className="w-full bg-muted px-3 py-2 text-sm technical-border"
                  />
                </div>
                <button
                  type="button"
                  onClick={fillFromPattern}
                  disabled={!skuPattern.trim() || variants.length === 0}
                  className="technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all flex items-center gap-2 disabled:opacity-40"
                >
                  <Wand2 className="h-3 w-3" /> FILL EMPTY
                </button>
              </div>

              <div className="technical-border overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/30">
                      {[
                        "Size",
                        "Colour",
                        "Qikink Store SKU (v-…)",
                        "Colour image URL",
                        "Price override",
                        ...(form.trackInventory ? ["Stock"] : []),
                        "Our SKU",
                        "",
                      ].map((h) => (
                        <th key={h} className="p-2 font-mono text-[10px] text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {variants.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-6 text-center font-mono text-[11px] text-muted-foreground"
                        >
                          ENTER SIZES + COLOURS, THEN BUILD GRID
                        </td>
                      </tr>
                    ) : (
                      variants.map((row, i) => {
                        const duplicate = duplicateQikinkSkus.has(row.qikinkSku.trim());
                        const missing = !row.qikinkSku.trim();
                        return (
                          <tr
                            key={rowKey(row.size, row.color) + i}
                            className="border-b border-border/30 last:border-b-0"
                          >
                            <td className="p-2 font-mono text-xs">{row.size}</td>
                            <td className="p-2 font-mono text-xs">{row.color}</td>
                            <td className="p-2">
                              <input
                                value={row.qikinkSku}
                                onChange={(e) => updateRow(i, { qikinkSku: e.target.value })}
                                placeholder="paste Store SKU (v-…)"
                                className={`w-full bg-muted px-2 py-1 font-mono text-xs technical-border ${
                                  duplicate || missing ? "border-destructive/60" : ""
                                }`}
                              />
                              {duplicate && (
                                <p className="font-mono text-[9px] text-destructive mt-0.5">
                                  USED BY ANOTHER VARIANT
                                </p>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                value={row.image}
                                onChange={(e) => updateRow(i, { image: e.target.value })}
                                placeholder="mockup link for this colour"
                                className="w-full min-w-40 bg-muted px-2 py-1 font-mono text-xs technical-border"
                              />
                            </td>
                            <td className="p-2 w-28">
                              <input
                                type="number"
                                min="0"
                                value={row.price}
                                onChange={(e) => updateRow(i, { price: e.target.value })}
                                placeholder={form.price || "base"}
                                className="w-full bg-muted px-2 py-1 font-mono text-xs technical-border"
                              />
                            </td>
                            {form.trackInventory && (
                              <td className="p-2 w-24">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.stock}
                                  onChange={(e) => updateRow(i, { stock: e.target.value })}
                                  className="w-full bg-muted px-2 py-1 font-mono text-xs technical-border"
                                />
                              </td>
                            )}
                            <td className="p-2 font-mono text-[10px] text-muted-foreground">
                              {row.sku || "auto"}
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setVariants((rows) => rows.filter((_, idx) => idx !== i))
                                }
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Remove ${row.size} ${row.color}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Publish */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-2">
                  Storefront status
                </label>
                <div className="flex gap-2">
                  {(["draft", "active"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={s === "active" && !fullyMapped}
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`px-4 py-2 font-mono text-[11px] technical-border transition-all disabled:opacity-40 ${
                        form.status === s
                          ? "bg-secondary/20 text-secondary border-secondary/40"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s === "active" ? "ACTIVE (LIVE)" : "DRAFT (HIDDEN)"}
                    </button>
                  ))}
                </div>
                {!fullyMapped && (
                  <p className="font-mono text-[10px] text-muted-foreground mt-1">
                    Map every variant to a Qikink SKU to publish.
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-4 py-2 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-secondary text-secondary-foreground px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving ? "SAVING..." : "SAVE PRODUCT"}
                </button>
              </div>
            </div>
            {formError && <p className="font-mono text-[11px] text-destructive">{formError}</p>}
          </form>
        )}

        {/* Products table */}
        <div className="technical-border bg-surface-lowest overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {["Product", "Status", "Price", "Variants", "Qikink", "Stock", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="p-4 font-mono text-[11px] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    NO PRODUCTS YET — ADD ONE OR IMPORT THE PRODUCT SHEET
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <ProductThumb src={product.images[0] || ""} alt={product.name} />
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            /products/{product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 border ${
                          product.status === "active"
                            ? "bg-secondary/10 text-secondary border-secondary/20"
                            : "border-border/40 text-muted-foreground"
                        }`}
                      >
                        {product.status === "active" ? "LIVE" : "DRAFT"}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-sm">
                      {money(product.price, product.currency)}
                    </td>
                    <td className="p-4 font-mono text-sm">{product.variantCount}</td>
                    <td className="p-4">
                      <MappingBadge mapped={product.mappedCount} total={product.variantCount} />
                    </td>
                    <td className="p-4 font-mono text-sm">
                      {product.trackInventory ? (
                        <>
                          {product.totalStock}{" "}
                          <span className="text-[10px] text-muted-foreground">units</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">ON DEMAND</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => void openEdit(product)}
                          className="font-mono text-[11px] text-primary hover:underline"
                        >
                          {product.qikinkSynced ? "EDIT" : "MAP SKUS"}
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                          className="font-mono text-[11px] text-destructive hover:underline disabled:opacity-50"
                        >
                          {deletingId === product.id ? "..." : "DELETE"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
