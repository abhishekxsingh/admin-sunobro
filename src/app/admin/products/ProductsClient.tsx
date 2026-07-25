"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Plus, RefreshCw, Upload } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { adminAuthApi, adminProductsApi } from "@/lib/api/endpoints";
import { parseProductsCsv } from "@/lib/csv";
import type { AdminProduct, AdminUser } from "@/lib/api/types";

const DEMO_PRODUCTS: AdminProduct[] = [
  {
    id: "demo-p1",
    slug: "sunobro-technical-tee",
    name: "SunoBro Technical Tee",
    description: "Precision-cut technical tee for the developer environment.",
    price: 4150,
    currency: "INR",
    images: [],
    sizes: ["S", "M", "L", "XL"],
    inStock: true,
    status: "active",
    variantCount: 4,
    totalStock: 240,
    qikinkSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-p2",
    slug: "circuit-cap",
    name: "Circuit Cap",
    description: "6-panel structured cap with embroidered circuit logo.",
    price: 2800,
    currency: "INR",
    images: [],
    sizes: ["One Size"],
    inStock: true,
    status: "active",
    variantCount: 2,
    totalStock: 80,
    qikinkSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

type ProductForm = { name: string; slug: string; description: string; price: string; currency: string; images: string; sizes: string; status: "active" | "draft" };
const EMPTY_FORM: ProductForm = { name: "", slug: "", description: "", price: "", currency: "INR", images: "", sizes: "", status: "active" };

const money = (n: number, cur = "INR") =>
  `${cur === "INR" ? "₹" : "$"}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

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
    <img src={src} alt={alt} onError={() => setErrored(true)} className="w-10 h-10 shrink-0 object-cover technical-border bg-muted" />
  );
}

export function ProductsClient() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>(DEMO_PRODUCTS);
  const [isDemo, setIsDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: string; message: string } | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvStatus, setCsvStatus] = useState<{ message: string; error?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminAuthApi.me().then((user) => {
      if (!cancelled) setAdminUser(user);
    }).catch(() => { /* backend offline */ });

    adminProductsApi.list().then((liveProducts) => {
      if (cancelled) return;
      setProducts(liveProducts);
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

  const openCreate = () => { setForm(EMPTY_FORM); setEditTarget(null); setView("create"); };
  const openEdit = (p: AdminProduct) => {
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: String(p.price),
      currency: p.currency,
      images: p.images.join(", "),
      sizes: p.sizes.join(", "),
      status: p.status,
    });
    setEditTarget(p);
    setView("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim(),
      price: parseFloat(form.price) || 0,
      currency: form.currency,
      images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      status: form.status,
    };

    try {
      if (view === "edit" && editTarget) {
        const updated = await adminProductsApi.update(editTarget.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === editTarget.id ? updated : p)));
      } else {
        const created = await adminProductsApi.create(payload);
        setProducts((prev) => [created, ...prev]);
      }
    } catch {
      if (view === "create") {
        const local: AdminProduct = {
          ...payload,
          id: crypto.randomUUID(),
          slug: payload.slug || payload.name.toLowerCase().replace(/\s+/g, "-"),
          inStock: true,
          variantCount: 0,
          totalStock: 0,
          qikinkSynced: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProducts((prev) => [local, ...prev]);
      }
    } finally {
      setSaving(false);
      setView("list");
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    setDeletingId(product.id);
    try {
      await adminProductsApi.remove(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSync = async (product: AdminProduct) => {
    setSyncingId(product.id);
    setSyncResult(null);
    try {
      const result = await adminProductsApi.syncQikink(product.id);
      setSyncResult({ id: product.id, message: result.message });
    } catch {
      setSyncResult({ id: product.id, message: "Qikink sync not yet configured — see Settings." });
    } finally {
      setSyncingId(null);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCsv(true);
    setCsvStatus(null);
    try {
      const text = await file.text();
      const rows = parseProductsCsv(text);
      if (rows.length === 0) {
        setCsvStatus({ message: "No rows found — check CSV headers (name, size, image url, price).", error: true });
        return;
      }
      try {
        const { created } = await adminProductsApi.bulkCreate(
          rows.map((r) => ({ name: r.name, price: r.price, images: r.imageUrl ? [r.imageUrl] : [], sizes: r.size ? [r.size] : [] }))
        );
        setProducts((prev) => [...created, ...prev]);
      } catch {
        setProducts((prev) => [
          ...rows.map((r) => ({
            id: crypto.randomUUID(), slug: r.name.toLowerCase().replace(/\s+/g, "-"),
            name: r.name, description: "", price: r.price, currency: "INR",
            images: r.imageUrl ? [r.imageUrl] : [], sizes: r.size ? [r.size] : [],
            inStock: true, status: "active" as const,
            variantCount: 0, totalStock: 0, qikinkSynced: false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          })),
          ...prev,
        ]);
      }
      setCsvStatus({ message: `Imported ${rows.length} product${rows.length === 1 ? "" : "s"}.` });
    } catch {
      setCsvStatus({ message: "Could not read that CSV file.", error: true });
    } finally {
      setUploadingCsv(false);
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
                {products.length} PRODUCT{products.length === 1 ? "" : "S"} LISTED
              </p>
            </div>
            <div className="flex gap-3">
              <label className="bg-muted technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all cursor-pointer flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" />
                {uploadingCsv ? "UPLOADING..." : "UPLOAD CSV"}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} disabled={uploadingCsv} />
              </label>
              <button
                onClick={openCreate}
                className="bg-foreground text-background px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" /> ADD PRODUCT
              </button>
            </div>
          </div>
        </header>

        {csvStatus && (
          <p className={`mb-4 font-mono text-[11px] ${csvStatus.error ? "text-destructive" : "text-secondary"}`}>
            {csvStatus.message}
          </p>
        )}

        {/* Create / Edit form */}
        {(view === "create" || view === "edit") && (
          <form onSubmit={handleSave} className="mb-8 p-6 technical-border bg-surface-lowest">
            <p className="font-mono text-[11px] uppercase tracking-widest mb-4">
              {view === "create" ? "New Product" : `Edit: ${editTarget?.name}`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Name", key: "name", required: true },
                { label: "Slug (auto-generated if empty)", key: "slug" },
                { label: "Price", key: "price", type: "number", required: true },
                { label: "Currency", key: "currency" },
                { label: "Images (comma-separated URLs)", key: "images" },
                { label: "Sizes (comma-separated)", key: "sizes" },
              ].map(({ label, key, required, type }) => (
                <div key={key} className={key === "images" ? "md:col-span-2" : ""}>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">{label}</label>
                  <input
                    required={required}
                    type={type || "text"}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-muted px-3 py-2 text-sm technical-border"
                  />
                </div>
              ))}
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border resize-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-2">Status</label>
                <div className="flex gap-2">
                  {(["active", "draft"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`px-4 py-2 font-mono text-[11px] technical-border transition-all ${
                        form.status === s ? "bg-secondary/20 text-secondary border-secondary/40" : "text-muted-foreground"
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button type="button" onClick={() => setView("list")} className="px-4 py-2 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                CANCEL
              </button>
              <button type="submit" disabled={saving} className="bg-secondary text-secondary-foreground px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? "SAVING..." : "SAVE PRODUCT"}
              </button>
            </div>
          </form>
        )}

        {/* Products table */}
        <div className="technical-border bg-surface-lowest overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {["Product", "Status", "Price", "Stock", "Qikink", "Actions"].map((h) => (
                  <th key={h} className="p-4 font-mono text-[11px] text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-mono text-xs text-muted-foreground">
                    NO PRODUCTS YET — ADD ONE OR UPLOAD A CSV
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <ProductThumb src={product.images[0] || ""} alt={product.name} />
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`font-mono text-[10px] px-2 py-0.5 border ${
                        product.status === "active"
                          ? "bg-secondary/10 text-secondary border-secondary/20"
                          : "border-border/40 text-muted-foreground"
                      }`}>
                        {product.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-sm">{money(product.price, product.currency)}</td>
                    <td className="p-4 font-mono text-sm">
                      {product.totalStock} <span className="text-[10px] text-muted-foreground">units</span>
                    </td>
                    <td className="p-4">
                      {syncResult?.id === product.id ? (
                        <p className="font-mono text-[10px] text-tertiary max-w-[120px] truncate" title={syncResult.message}>
                          {syncResult.message}
                        </p>
                      ) : (
                        <button
                          onClick={() => handleSync(product)}
                          disabled={syncingId === product.id}
                          className="bg-tertiary/10 text-tertiary border border-tertiary/20 font-mono text-[10px] px-2 py-0.5 hover:bg-tertiary/20 transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <RefreshCw className={`h-2.5 w-2.5 ${syncingId === product.id ? "animate-spin" : ""}`} />
                          {syncingId === product.id ? "SYNCING..." : "SYNC_QIKINK"}
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="font-mono text-[11px] text-primary hover:underline"
                        >
                          EDIT
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
