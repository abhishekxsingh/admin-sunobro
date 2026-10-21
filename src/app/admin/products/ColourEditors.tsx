"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Spinner } from "@/components/status";
import { ApiError } from "@/lib/api/client";
import { adminProductsApi } from "@/lib/api/endpoints";
import type { AdminProduct } from "@/lib/api/types";

export const SIZE_LADDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
export const COMMON_COLOURS = [
  "White",
  "Black",
  "Navy Blue",
  "Grey Melange",
  "Charcoal Melange",
  "Steel Grey",
  "Maroon",
  "Bottle Green",
  "Royal Blue",
  "Red",
  "Brick Red",
  "Coffee Brown",
  "Beige",
  "Lavender",
  "Light Baby Pink",
  "Baby Blue",
  "Mint",
  "Jade",
  "Mustard Yellow",
  "Olive Green",
];

const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

/** "XS - XXL" from the Qikink export → ["XS","S","M","L","XL","XXL"]. */
export function sizesFor(product: Pick<AdminProduct, "qikink" | "sizes"> | null): string[] {
  const range = product?.qikink?.sizeRange?.split("-").map((s) => s.trim().toUpperCase());
  if (range?.length === 2) {
    const from = SIZE_LADDER.indexOf(range[0]);
    const to = SIZE_LADDER.indexOf(range[1]);
    if (from !== -1 && to >= from) return SIZE_LADDER.slice(from, to + 1);
  }
  return product?.sizes.length ? product.sizes : SIZE_LADDER.slice(0, 6);
}

export type ColourEntry = {
  color: string;
  image?: string;
  sizes: { size: string; qikinkSku?: string }[];
};

/**
 * Manual entry for one colour: name, one image link, and a Store SKU per
 * size. Sizes start as the product's full Qikink size range; untick any the
 * colour doesn't come in. With `mergeExisting`, an existing colour's name adds
 * only the sizes it doesn't have yet.
 */
export function ColourEntryForm({
  idPrefix,
  sizes,
  existing,
  live,
  mergeExisting = false,
  startOpen,
  submitVerb = "ADD",
  onSubmit,
}: {
  idPrefix: string;
  sizes: string[];
  /** colour → sizes it already has */
  existing: Record<string, string[]>;
  live: boolean;
  mergeExisting?: boolean;
  startOpen: boolean;
  submitVerb?: string;
  onSubmit: (entry: ColourEntry) => Promise<void>;
}) {
  const existingColours = Object.keys(existing);
  const [open, setOpen] = useState(startOpen);
  const [colour, setColour] = useState("");
  const [image, setImage] = useState("");
  const [rows, setRows] = useState<Record<string, { on: boolean; sku: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const match = existingColours.find((c) => c.toLowerCase() === colour.trim().toLowerCase());
  const taken = Boolean(match) && !mergeExisting;
  const already = new Set(match ? existing[match] : []);
  const rowFor = (s: string) => rows[s] ?? { on: true, sku: "" };
  const chosen = sizes.filter((s) => !already.has(s) && rowFor(s).on);
  const missingSku = chosen.filter((s) => !rowFor(s).sku.trim());
  const wrongSku = chosen.filter(
    (s) => rowFor(s).sku.trim() && !rowFor(s).sku.trim().startsWith("v-"),
  );

  // Pasting a whole column of Store SKUs (one per line) into the first box
  // fills the sizes in order.
  const handlePaste = (size: string, text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return false;
    const start = chosen.indexOf(size);
    setRows((r) => {
      const next = { ...r };
      chosen.slice(start).forEach((s, i) => {
        if (lines[i]) next[s] = { ...rowFor(s), sku: lines[i] };
      });
      return next;
    });
    return true;
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        color: match || colour.trim(),
        image: image.trim() || undefined,
        sizes: chosen.map((size) => ({ size, qikinkSku: rowFor(size).sku.trim() || undefined })),
      });
      setColour("");
      setImage("");
      setRows({});
    } catch (err) {
      setError(errorText(err, "Could not add that colour."));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-28 p-3 technical-border border-dashed flex items-center justify-center gap-2 font-mono text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground"
      >
        <Plus className="h-4 w-4" /> ADD COLOUR
      </button>
    );
  }

  const label = colour.trim() ? (match || colour.trim()).toUpperCase() : "COLOUR";

  return (
    <div className="p-3 technical-border border-primary/40 bg-surface-lowest space-y-3 md:col-span-2 xl:col-span-3">
      <p className="font-mono text-[12px] uppercase tracking-widest">
        Add a colour{mergeExisting ? " (or sizes to an existing one)" : ""}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-colour`}
            className="block font-mono text-[11px] text-muted-foreground uppercase mb-1"
          >
            Colour (as named in Qikink)
            <span className="text-destructive"> *</span>
          </label>
          <input
            id={`${idPrefix}-colour`}
            list={`${idPrefix}-colour-names`}
            value={colour}
            // Pasting Qikink's Variation cell ("Black - S") keeps just the colour.
            onChange={(e) =>
              setColour(e.target.value.replace(/\s+-\s+(XS|S|M|L|XL|XXL|[2-5]XL)\s*$/i, ""))
            }
            placeholder="e.g. Black"
            className="w-full bg-muted px-3 py-2 text-sm technical-border"
          />
          <datalist id={`${idPrefix}-colour-names`}>
            {(mergeExisting ? existingColours : [])
              .concat(COMMON_COLOURS.filter((c) => !existingColours.includes(c)))
              .map((c) => (
                <option key={c} value={c} />
              ))}
          </datalist>
          {taken && (
            <p className="mt-1 font-mono text-[11px] text-tertiary">
              {colour} is already on this product — use + SIZE on its card instead.
            </p>
          )}
          {match && mergeExisting && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {match} is already here — this adds the sizes it doesn&apos;t have yet.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-image`}
            className="block font-mono text-[11px] text-muted-foreground uppercase mb-1"
          >
            Image link (Qikink mockup for this colour)
          </label>
          <input
            id={`${idPrefix}-image`}
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder={
              match ? "leave empty to keep its image" : "https://qikink-assets…/Front_1_c_2.jpg"
            }
            className="w-full bg-muted px-3 py-2 font-mono text-[12px] technical-border"
          />
        </div>
      </div>

      <div>
        <p className="font-mono text-[11px] text-muted-foreground uppercase mb-1">
          Sizes → Qikink Store SKU (starts with v-)<span className="text-destructive"> *</span> for
          every ticked size. Tip: paste the whole Store SKU column into the first box to fill them
          in order.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sizes.map((size, i) => {
            const row = rowFor(size);
            const has = already.has(size);
            const on = row.on && !has;
            return (
              <div key={size} className={`flex items-center gap-2 ${on ? "" : "opacity-50"}`}>
                <label className="flex w-16 shrink-0 items-center gap-1.5 font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={has}
                    onChange={(e) =>
                      setRows((r) => ({ ...r, [size]: { ...rowFor(size), on: e.target.checked } }))
                    }
                  />
                  {size}
                </label>
                <input
                  id={`${idPrefix}-sku-${i}`}
                  aria-label={`Store SKU for ${size}`}
                  value={has ? "" : row.sku}
                  disabled={!on}
                  onPaste={(e) => {
                    if (handlePaste(size, e.clipboardData.getData("text"))) e.preventDefault();
                  }}
                  onChange={(e) =>
                    setRows((r) => ({ ...r, [size]: { ...rowFor(size), sku: e.target.value } }))
                  }
                  placeholder={has ? "already on this colour" : "v-…"}
                  className={`min-w-0 flex-1 bg-muted px-2 py-1 font-mono text-[12px] technical-border ${
                    on && row.sku && !row.sku.trim().startsWith("v-") ? "border-destructive/60" : ""
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {chosen.some((sz) => rowFor(sz).sku.trim() && !rowFor(sz).sku.trim().startsWith("v-")) && (
        <p className="font-mono text-[11px] text-destructive">
          That looks like the Product SKU (MRnHs-…). Use the Store SKU — the code starting with v-
          in Qikink&apos;s Variations list.
        </p>
      )}
      {error && <p className="font-mono text-[12px] text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] text-muted-foreground">
          {chosen.length} size{chosen.length === 1 ? "" : "s"}
          {missingSku.length
            ? ` · add the Store SKU for ${missingSku.join(", ")} — or untick ${missingSku.length === 1 ? "it" : "them"}`
            : " · all mapped"}
        </p>
        <div className="flex gap-2">
          {existingColours.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 font-mono text-[12px] text-muted-foreground hover:text-foreground"
            >
              CANCEL
            </button>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            // Every ticked size must carry its Store SKU: without it the size
            // can't be ordered or printed.
            disabled={
              busy ||
              !colour.trim() ||
              taken ||
              chosen.length === 0 ||
              missingSku.length > 0 ||
              wrongSku.length > 0
            }
            className="inline-flex items-center gap-1.5 btn-primary px-4 py-1.5 font-mono text-[12px] font-bold hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Spinner /> : <Plus className="h-3 w-3" aria-hidden />}
            {busy ? "ADDING..." : `${submitVerb} ${label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ADD COLOUR in the catalog's expanded row — saves straight away. */
export function AddColourCard({
  product,
  existingColours,
  onAdded,
}: {
  product: AdminProduct;
  existingColours: string[];
  onAdded: (p: AdminProduct) => void;
}) {
  const existing = Object.fromEntries(existingColours.map((c) => [c, [] as string[]]));
  return (
    <ColourEntryForm
      idPrefix={`new-colour-${product.id}`}
      sizes={sizesFor(product)}
      existing={existing}
      live={product.status === "active"}
      startOpen={existingColours.length === 0}
      onSubmit={async (entry) => onAdded(await adminProductsApi.addVariants(product.id, entry))}
    />
  );
}

/** "+ SIZE" on a colour card: one size and its Store SKU. */
export function AddSizeInline({
  product,
  colour,
  existingSizes,
  onAdded,
}: {
  product: AdminProduct;
  colour: string;
  existingSizes: string[];
  onAdded: (p: AdminProduct) => void;
}) {
  const options = sizesFor(product)
    .concat(SIZE_LADDER)
    .filter((s, i, all) => all.indexOf(s) === i && !existingSizes.includes(s));
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(options[0] || "");
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 py-1 font-mono text-[11px] text-muted-foreground border border-dashed border-border/60 hover:text-foreground hover:border-foreground"
      >
        + SIZE
      </button>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onAdded(
        await adminProductsApi.addVariants(product.id, {
          color: colour,
          sizes: [{ size: size.trim(), qikinkSku: sku.trim() || undefined }],
        }),
      );
      setOpen(false);
      setSku("");
    } catch (err) {
      setError(errorText(err, "Could not add that size."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex gap-2">
        <input
          aria-label={`New size for ${colour}`}
          list={`size-options-${product.id}-${colour}`}
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-16 bg-muted px-2 py-1 font-mono text-[12px] technical-border"
        />
        <datalist id={`size-options-${product.id}-${colour}`}>
          {options.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <input
          aria-label={`Store SKU for ${colour} ${size}`}
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="Store SKU v-…"
          className="min-w-0 flex-1 bg-muted px-2 py-1 font-mono text-[12px] technical-border"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !size.trim()}
          className="inline-flex items-center gap-1 btn-primary px-2 py-1 font-mono text-[11px] font-bold disabled:opacity-40"
        >
          {busy ? <Spinner /> : <Plus className="h-3 w-3" aria-hidden />}
          ADD
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="px-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

/** Click a colour's thumbnail to change the image for all its sizes. */
export function ColourImageEditor({
  product,
  colour,
  current,
  onSaved,
  onClose,
}: {
  product: AdminProduct;
  colour: string;
  current: string;
  onSaved: (p: AdminProduct) => void;
  onClose: () => void;
}) {
  const [link, setLink] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (image: string) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await adminProductsApi.setColourImage(product.id, { color: colour, image }));
      onClose();
    } catch (err) {
      setError(errorText(err, "Could not save that image."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          autoFocus
          aria-label={`Image link for ${colour}`}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save(link.trim());
            if (e.key === "Escape") onClose();
          }}
          placeholder="https://qikink-assets…/Front_1_c_2.jpg"
          className="min-w-0 flex-1 bg-muted px-2 py-1 font-mono text-[12px] technical-border"
        />
        <button
          type="button"
          onClick={() => void save(link.trim())}
          disabled={busy}
          className="inline-flex items-center gap-1 btn-primary px-2 py-1 font-mono text-[11px] font-bold disabled:opacity-40"
        >
          {busy ? <Spinner /> : <Check className="h-3 w-3" aria-hidden />}
          SAVE
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="px-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
