"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AdminProduct } from "@/lib/api/types";

/**
 * Which Qikink product this is: product ID (copyable — it's what My Products
 * search finds), the design file name, and colours × sizes from the export.
 */
export function QikinkIdentity({ product }: { product: AdminProduct }) {
  const [copied, setCopied] = useState(false);
  const q = product.qikink;
  if (!q?.productId && !q?.design) {
    return (
      <p className="font-mono text-[10px] text-muted-foreground/70">
        Not linked to a Qikink product
      </p>
    );
  }
  const details = [
    q.colourCount ? `${q.colourCount} colours` : null,
    q.sizeRange ? q.sizeRange.replace(/\s+/g, "") : null,
    q.expectedVariants ? `${q.expectedVariants} variants` : null,
  ].filter(Boolean);

  return (
    <div className="mt-1 space-y-0.5 font-mono text-[10px]">
      {q.productId && (
        <p className="flex items-center gap-1.5">
          <span className="bg-primary/10 px-1.5 py-0.5 text-primary">QIKINK #{q.productId}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(q.productId || "").then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              });
            }}
            title="Copy the Qikink product ID — search it in Qikink → My Products"
            aria-label={`Copy Qikink product ID ${q.productId}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3 text-secondary" /> : <Copy className="h-3 w-3" />}
          </button>
        </p>
      )}
      {q.design && (
        <p className="max-w-72 truncate text-muted-foreground" title={`Design file: ${q.design}`}>
          design · {q.design}
        </p>
      )}
      {details.length > 0 && <p className="text-muted-foreground">{details.join(" · ")}</p>}
    </div>
  );
}
