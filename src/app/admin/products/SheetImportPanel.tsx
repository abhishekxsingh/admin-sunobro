"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { adminProductsApi } from "@/lib/api/endpoints";
import type { SheetImportResult } from "@/lib/api/types";

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });

/**
 * Upload SunoBro-Product-Sheet.xlsx → server preview (nothing written) →
 * Apply import. Products are matched by slug or name, so re-uploading an
 * edited sheet updates them in place.
 */
export function SheetImportPanel({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<SheetImportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError(null);
    setPreview(null);
    setFileName(picked.name);
    setBusy("preview");
    try {
      const base64 = await readAsBase64(picked);
      setFile(base64);
      setPreview(await adminProductsApi.importSheet({ file: base64, dryRun: true }));
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Preview failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setBusy("apply");
    setError(null);
    try {
      const result = await adminProductsApi.importSheet({ file, dryRun: false });
      setPreview(result);
      if (result.applied) onApplied();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  };

  const problems = preview?.problems ?? [];
  const failed = preview?.results?.filter((r) => !r.ok) ?? [];

  return (
    <section className="mb-8 p-6 technical-border bg-surface-lowest space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Import product sheet
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close import"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="bg-muted technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all cursor-pointer flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" />
          {busy === "preview"
            ? "READING..."
            : fileName
              ? "CHOOSE ANOTHER FILE"
              : "CHOOSE .XLSX FILE"}
          <input
            id="sheet-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFile}
            disabled={busy !== null}
          />
        </label>
        {fileName && (
          <span className="font-mono text-[11px] text-muted-foreground">{fileName}</span>
        )}
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">
        Nothing is saved until you click APPLY IMPORT. Products already on the site are updated in
        place; variants removed from the sheet are removed from the product.
      </p>

      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}

      {problems.length > 0 && (
        <div className="p-4 technical-border border-destructive/40 bg-destructive/5 space-y-1">
          <p className="font-mono text-[11px] text-destructive">
            FIX {problems.length} PROBLEM{problems.length === 1 ? "" : "S"} IN THE SHEET, THEN
            UPLOAD IT AGAIN:
          </p>
          <ul className="font-mono text-[11px] text-destructive list-disc pl-5 space-y-0.5">
            {problems.map((p, i) => (
              <li key={i}>
                <span className="opacity-70">{p.where}:</span> {p.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && preview.products.length > 0 && (
        <div className="technical-border overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {[
                  "Product",
                  "Change",
                  "Status",
                  "Price",
                  "Colours × sizes",
                  "Store SKUs",
                  "Variants",
                ].map((h) => (
                  <th key={h} className="p-2 font-mono text-[10px] text-muted-foreground uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.products.map((p) => (
                <tr key={p.name} className="border-b border-border/30 last:border-b-0">
                  <td className="p-2 text-sm">{p.name}</td>
                  <td className="p-2 font-mono text-[10px]">
                    {p.action === "create" ? "NEW" : "UPDATE"}
                  </td>
                  <td className="p-2 font-mono text-[10px]">
                    {p.status === "active" ? "LIVE" : p.status === "review" ? "IN REVIEW" : "DRAFT"}
                  </td>
                  <td className="p-2 font-mono text-xs">₹{p.price.toLocaleString("en-IN")}</td>
                  <td className="p-2 font-mono text-[10px] text-muted-foreground">
                    {p.colours.join(", ")} × {p.sizes.join(", ")}
                  </td>
                  <td
                    className={`p-2 font-mono text-[10px] ${p.mapped === p.variants ? "text-secondary" : "text-destructive"}`}
                  >
                    {p.mapped}/{p.variants}
                  </td>
                  <td className="p-2 font-mono text-[10px] text-muted-foreground">
                    {p.action === "create"
                      ? `+${p.added}`
                      : `+${p.added} new · −${p.removed} removed · ${p.kept} kept`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview?.applied && (
        <p
          className={`font-mono text-[11px] ${failed.length ? "text-destructive" : "text-secondary"}`}
        >
          {failed.length
            ? `Imported with ${failed.length} error(s): ${failed.map((f) => `${f.name} — ${f.errors?.join("; ")}`).join(" | ")}`
            : `Imported ${preview.results?.length ?? 0} product(s). The site is updated.`}
        </p>
      )}

      {preview && !preview.applied && (
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy !== null || problems.length > 0 || preview.products.length === 0}
            className="bg-secondary text-secondary-foreground px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-40"
          >
            {busy === "apply" ? "IMPORTING..." : `APPLY IMPORT (${preview.products.length})`}
          </button>
        </div>
      )}
    </section>
  );
}
