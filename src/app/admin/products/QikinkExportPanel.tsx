"use client";

import { useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { Spinner } from "@/components/status";
import { ApiError } from "@/lib/api/client";
import { adminProductsApi } from "@/lib/api/endpoints";
import type { QikinkExportResult } from "@/lib/api/types";

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });

/**
 * Step 1 — upload Qikink's My Products export. Each Qikink product becomes a
 * product in review; re-uploads update the Qikink details of products already
 * here and never touch their name, price, status or variants.
 */
export function QikinkExportPanel({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const [file, setFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<QikinkExportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (payloadFile: string, dryRun: boolean) => {
    setBusy(dryRun ? "preview" : "apply");
    setError(null);
    try {
      const next = await adminProductsApi.importQikinkExport({ file: payloadFile, dryRun });
      setResult(next);
      if (next.applied) onApplied();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setFileName(picked.name);
    setResult(null);
    const base64 = await readAsBase64(picked);
    setFile(base64);
    await run(base64, true);
  };

  const created = result?.products.filter((p) => p.action === "create").length ?? 0;

  return (
    <section className="mb-8 p-6 technical-border bg-surface-lowest space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest">
            Step 1 · Upload the Qikink export
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            dashboard.qikink.com → My Products → Export. Each Qikink product arrives here in review;
            then add its variations (step 2).
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Qikink export"
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
              : "CHOOSE .CSV FILE"}
          <input
            id="qikink-export-file"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
            disabled={busy !== null}
          />
        </label>
        {fileName && (
          <span className="font-mono text-[11px] text-muted-foreground">{fileName}</span>
        )}
      </div>

      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
      {result && result.problems.length > 0 && (
        <ul className="p-4 technical-border border-destructive/40 bg-destructive/5 font-mono text-[11px] text-destructive list-disc pl-8 space-y-0.5">
          {result.problems.map((p, i) => (
            <li key={i}>
              <span className="opacity-70">{p.where}:</span> {p.message}
            </li>
          ))}
        </ul>
      )}

      {result && result.products.length > 0 && (
        <div className="technical-border overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                {[
                  "Qikink ID",
                  "Name here",
                  "Change",
                  "Design",
                  "Colours × sizes",
                  "Variants",
                  "Price",
                ].map((h) => (
                  <th key={h} className="p-2 font-mono text-[10px] text-muted-foreground uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.products.map((p) => (
                <tr key={p.productId} className="border-b border-border/30 last:border-b-0">
                  <td className="p-2 font-mono text-[10px] text-muted-foreground">{p.productId}</td>
                  <td className="p-2 text-sm">{p.name}</td>
                  <td className="p-2 font-mono text-[10px]">
                    {p.action === "create" ? "NEW · IN REVIEW" : "ALREADY HERE · UPDATE DETAILS"}
                  </td>
                  <td
                    className="p-2 font-mono text-[10px] text-muted-foreground max-w-48 truncate"
                    title={p.design}
                  >
                    {p.design}
                  </td>
                  <td className="p-2 font-mono text-[10px] text-muted-foreground">
                    {p.colourCount ?? "?"} × {p.sizeRange ?? "?"}
                  </td>
                  <td className="p-2 font-mono text-[10px]">
                    {p.variants}/{p.expectedVariants ?? "?"}
                  </td>
                  <td className="p-2 font-mono text-xs">₹{p.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result?.applied && (
        <p className="font-mono text-[11px] text-secondary">
          Done — {result.results?.filter((r) => r.action === "create").length ?? 0} new product(s)
          are in the IN REVIEW tab. Use ADD VARIATIONS on each to finish them.
        </p>
      )}

      {result && !result.applied && result.products.length > 0 && (
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
            onClick={() => file && void run(file, false)}
            disabled={busy !== null || result.problems.length > 0}
            className="bg-secondary text-secondary-foreground px-4 py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {busy === "apply" ? <Spinner /> : <Check className="h-3 w-3" aria-hidden />}
            {busy === "apply"
              ? "ADDING..."
              : `ADD ${created} NEW · UPDATE ${result.products.length - created}`}
          </button>
        </div>
      )}
    </section>
  );
}
