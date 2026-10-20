"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { adminProductsApi } from "@/lib/api/endpoints";
import type { AdminProduct } from "@/lib/api/types";

const SIZE_LADDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const COMMON_COLOURS = [
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
export function sizesFor(product: AdminProduct): string[] {
  const range = product.qikink?.sizeRange?.split("-").map((s) => s.trim().toUpperCase());
  if (range?.length === 2) {
    const from = SIZE_LADDER.indexOf(range[0]);
    const to = SIZE_LADDER.indexOf(range[1]);
    if (from !== -1 && to >= from) return SIZE_LADDER.slice(from, to + 1);
  }
  return product.sizes.length ? product.sizes : SIZE_LADDER.slice(0, 6);
}

/**
 * Manual entry for one colour: name, one image link, and a Store SKU per
 * size. Sizes start as the product's full Qikink size range; untick any the
 * colour doesn't come in.
 */
export function AddColourCard({
  product,
  existingColours,
  onAdded,
}: {
  product: AdminProduct;
  existingColours: string[];
  onAdded: (p: AdminProduct) => void;
}) {
  const sizes = useMemo(() => sizesFor(product), [product]);
  const [open, setOpen] = useState(existingColours.length === 0);
  const [colour, setColour] = useState("");
  const [image, setImage] = useState("");
  const [rows, setRows] = useState<Record<string, { on: boolean; sku: string }>>(() =>
    Object.fromEntries(sizes.map((s) => [s, { on: true, sku: "" }])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = sizes.filter((s) => rows[s]?.on);
  const missingSku = chosen.filter((s) => !rows[s].sku.trim());

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
        if (lines[i]) next[s] = { ...next[s], sku: lines[i] };
      });
      return next;
    });
    return true;
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await adminProductsApi.addVariants(product.id, {
        color: colour.trim(),
        image: image.trim() || undefined,
        sizes: chosen.map((size) => ({ size, qikinkSku: rows[size].sku.trim() || undefined })),
      });
      onAdded(updated);
      setColour("");
      setImage("");
      setRows(Object.fromEntries(sizes.map((s) => [s, { on: true, sku: "" }])));
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
        className="min-h-28 p-3 technical-border border-dashed flex items-center justify-center gap-2 font-mono text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground"
      >
        <Plus className="h-4 w-4" /> ADD COLOUR
      </button>
    );
  }

  const taken = existingColours.some((c) => c.toLowerCase() === colour.trim().toLowerCase());

  return (
    <div className="p-3 technical-border border-primary/40 bg-surface-lowest space-y-3 md:col-span-2 xl:col-span-3">
      <p className="font-mono text-[11px] uppercase tracking-widest">Add a colour</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor={`new-colour-${product.id}`}
            className="block font-mono text-[10px] text-muted-foreground uppercase mb-1"
          >
            Colour (as named in Qikink)
          </label>
          <input
            id={`new-colour-${product.id}`}
            list={`colour-names-${product.id}`}
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            placeholder="e.g. Black"
            className="w-full bg-muted px-3 py-2 text-sm technical-border"
          />
          <datalist id={`colour-names-${product.id}`}>
            {COMMON_COLOURS.filter((c) => !existingColours.includes(c)).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {taken && (
            <p className="mt-1 font-mono text-[10px] text-tertiary">
              {colour} is already on this product — use + SIZE on its card instead.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`new-colour-image-${product.id}`}
            className="block font-mono text-[10px] text-muted-foreground uppercase mb-1"
          >
            Image link (Qikink mockup for this colour)
          </label>
          <input
            id={`new-colour-image-${product.id}`}
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://qikink-assets…/Front_1_c_2.jpg"
            className="w-full bg-muted px-3 py-2 font-mono text-[11px] technical-border"
          />
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">
          Sizes → Qikink Store SKU (starts with v-). Tip: paste the whole Store SKU column into the
          first box to fill them in order.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sizes.map((size, i) => {
            const row = rows[size];
            return (
              <div key={size} className={`flex items-center gap-2 ${row.on ? "" : "opacity-50"}`}>
                <label className="flex w-16 shrink-0 items-center gap-1.5 font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={row.on}
                    onChange={(e) =>
                      setRows((r) => ({ ...r, [size]: { ...r[size], on: e.target.checked } }))
                    }
                  />
                  {size}
                </label>
                <input
                  id={`new-colour-${product.id}-sku-${i}`}
                  aria-label={`Store SKU for ${size}`}
                  value={row.sku}
                  disabled={!row.on}
                  onPaste={(e) => {
                    if (handlePaste(size, e.clipboardData.getData("text"))) e.preventDefault();
                  }}
                  onChange={(e) =>
                    setRows((r) => ({ ...r, [size]: { ...r[size], sku: e.target.value } }))
                  }
                  placeholder="v-…"
                  className={`min-w-0 flex-1 bg-muted px-2 py-1 font-mono text-[11px] technical-border ${
                    row.on && row.sku && !row.sku.trim().startsWith("v-")
                      ? "border-destructive/60"
                      : ""
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-muted-foreground">
          {chosen.length} size{chosen.length === 1 ? "" : "s"}
          {missingSku.length ? ` · ${missingSku.length} without a Store SKU` : " · all mapped"}
          {product.status === "active" && missingSku.length ? " — needed, the product is live" : ""}
        </p>
        <div className="flex gap-2">
          {existingColours.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              CANCEL
            </button>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !colour.trim() || taken || chosen.length === 0}
            className="bg-secondary text-secondary-foreground px-4 py-1.5 font-mono text-[11px] font-bold hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "ADDING..." : `ADD ${colour.trim() ? colour.trim().toUpperCase() : "COLOUR"}`}
          </button>
        </div>
      </div>
    </div>
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
        className="px-2 py-1 font-mono text-[10px] text-muted-foreground border border-dashed border-border/60 hover:text-foreground hover:border-foreground"
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
          className="w-16 bg-muted px-2 py-1 font-mono text-[11px] technical-border"
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
          className="min-w-0 flex-1 bg-muted px-2 py-1 font-mono text-[11px] technical-border"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !size.trim()}
          className="bg-secondary text-secondary-foreground px-2 py-1 font-mono text-[10px] font-bold disabled:opacity-40"
        >
          {busy ? "…" : "ADD"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {error && <p className="font-mono text-[10px] text-destructive">{error}</p>}
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
          className="min-w-0 flex-1 bg-muted px-2 py-1 font-mono text-[11px] technical-border"
        />
        <button
          type="button"
          onClick={() => void save(link.trim())}
          disabled={busy}
          className="bg-secondary text-secondary-foreground px-2 py-1 font-mono text-[10px] font-bold disabled:opacity-40"
        >
          SAVE
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {error && <p className="font-mono text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
