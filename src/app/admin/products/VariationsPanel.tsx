"use client";

import { useState } from "react";
import { ImageOff, Save, X } from "lucide-react";
import { Spinner } from "@/components/status";
import { ApiError } from "@/lib/api/client";
import { adminProductsApi } from "@/lib/api/endpoints";
import type { AdminProduct, VariationsResult } from "@/lib/api/types";

function Preview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="h-14 w-14 shrink-0 bg-muted technical-border flex items-center justify-center">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 object-cover technical-border bg-muted"
    />
  );
}

/**
 * Step 2 — paste the product's "Product Variations" table from Qikink, add
 * one image link per colour, check, save. Re-paste any time to update.
 */
export function VariationsPanel({
  product,
  onSaved,
  onClose,
}: {
  product: AdminProduct;
  onSaved: (p: AdminProduct) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<Record<string, string>>({});
  const [result, setResult] = useState<VariationsResult | null>(null);
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const q = product.qikink;

  const send = async (dryRun: boolean) => {
    setBusy(dryRun ? "read" : "save");
    setError(null);
    try {
      const next = await adminProductsApi.saveVariations(product.id, { text, images, dryRun });
      setResult(next);
      // Seed the image boxes from the table / existing images on first read.
      setImages((prev) => {
        const merged = { ...prev };
        next.colours.forEach((c) => {
          if (merged[c.colour] === undefined) merged[c.colour] = c.image || "";
        });
        return merged;
      });
      if (next.applied && next.doc) {
        setSaved(true);
        onSaved(next.doc);
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Could not read that table.",
      );
    } finally {
      setBusy(null);
    }
  };

  const problems = result?.problems ?? [];
  const missingImages = result?.colours.filter((c) => !(images[c.colour] || "").trim()) ?? [];

  return (
    <div className="p-5 technical-border bg-surface-container space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest">
            Step 2 · Variations for {product.name}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            {q?.productId
              ? `Qikink ${q.productId} · ${q.design ?? ""} · expects ${q.expectedVariants ?? "?"} variants (${q.colourCount ?? "?"} colours × ${q.sizeRange ?? "?"})`
              : "Not linked to a Qikink export — the table alone is used."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close variations"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label
          htmlFor={`variations-${product.id}`}
          className="block font-mono text-[10px] text-muted-foreground uppercase mb-1"
        >
          Paste the Product Variations table (Qikink → My Products → product → Variations → select
          all rows → copy). Include every page.
        </label>
        <textarea
          id={`variations-${product.id}`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          rows={6}
          placeholder={
            "Name\tVariation\tProduct SKU\tDesign SKU\tStore SKU\tImage\tProduct Cost\tSelling Cost\nUnisex Classic Crew T-Shirt\tWhite - S\tMRnHs-Wh-S\tshipfix\tv-9Rqh0i…\t\t265.87\t599"
          }
          className="w-full bg-muted px-3 py-2 font-mono text-[11px] technical-border resize-y"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => void send(true)}
            disabled={busy !== null || !text.trim()}
            className="technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all disabled:opacity-40"
          >
            {busy === "read" ? "READING..." : "READ TABLE"}
          </button>
        </div>
      </div>

      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
      {problems.length > 0 && (
        <ul className="p-3 technical-border border-destructive/40 bg-destructive/5 font-mono text-[11px] text-destructive list-disc pl-7 space-y-0.5">
          {problems.map((p, i) => (
            <li key={i}>
              <span className="opacity-70">{p.where}:</span> {p.message}
            </li>
          ))}
        </ul>
      )}
      {result?.warnings.map((w) => (
        <p key={w} className="font-mono text-[11px] text-tertiary">
          {w}
        </p>
      ))}

      {result && result.colours.length > 0 && (
        <div className="space-y-3">
          <p className="font-mono text-[11px]">
            {result.variants} variants · {result.colours.length} colours
            {result.expected ? ` · export expects ${result.expected}` : ""} · one image per colour
            (Qikink mockup → right-click → copy image address)
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {result.colours.map((c) => (
              <div key={c.colour} className="flex gap-3 p-3 technical-border bg-surface-lowest">
                <Preview src={images[c.colour] || ""} alt={`${product.name} in ${c.colour}`} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {c.colour}{" "}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {c.sizes.join(" · ")}
                      {c.cost != null ? ` · cost ₹${c.cost}` : ""}
                    </span>
                  </p>
                  <input
                    id={`image-${product.id}-${c.colour}`}
                    aria-label={`Image link for ${c.colour}`}
                    value={images[c.colour] ?? ""}
                    onChange={(e) => setImages((m) => ({ ...m, [c.colour]: e.target.value }))}
                    placeholder="https://qikink-assets…/Front_1_c_1.jpg"
                    className="w-full bg-muted px-2 py-1 font-mono text-[11px] technical-border"
                  />
                </div>
              </div>
            ))}
          </div>
          {missingImages.length > 0 && (
            <p className="font-mono text-[10px] text-muted-foreground">
              No image yet for {missingImages.map((c) => c.colour).join(", ")} — the website will
              show the cover and say “photo shows another colour”. You can add links later by
              re-pasting.
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="font-mono text-[11px] text-secondary">
                Saved — review it, then PUBLISH.
              </span>
            )}
            <button
              type="button"
              onClick={() => void send(false)}
              disabled={busy !== null || problems.length > 0}
              className="bg-secondary text-secondary-foreground px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {busy === "save" ? <Spinner /> : <Save className="h-3 w-3" aria-hidden />}
              {busy === "save" ? "SAVING..." : `SAVE ${result.variants} VARIATIONS`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
