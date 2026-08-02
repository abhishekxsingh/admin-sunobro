import type { Product } from "@/lib/api/types";

export type CsvRow = Record<string, string>;

function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parses CSV text into row objects keyed by lowercased header name. */
export function parseCsv(text: string): CsvRow[] {
  const rows = splitCsvRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const record: CsvRow = {};
      headers.forEach((header, i) => {
        record[header] = (row[i] ?? "").trim();
      });
      return record;
    });
}

const NAME_ALIASES = ["name", "product", "product name", "title"];
const SIZE_ALIASES = ["size", "variant", "variant size"];
const IMAGE_ALIASES = ["image url", "imageurl", "image_url", "image", "img"];
const PRICE_ALIASES = ["price", "amount", "cost", "order price"];
const SKU_ALIASES = ["sku", "code", "product id", "id"];

function findHeader(headers: string[], aliases: string[]): string | undefined {
  return headers.find((h) => aliases.includes(h));
}

function parsePrice(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export type ParsedProductRow = Omit<Product, "id">;

/**
 * Maps CSV rows to product records. Column names are matched case-insensitively
 * against a handful of common aliases so exports from different sources
 * (e.g. "Image URL" vs "image_url") work without a fixed template.
 */
export function parseProductsCsv(text: string): ParsedProductRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const nameKey = findHeader(headers, NAME_ALIASES);
  const sizeKey = findHeader(headers, SIZE_ALIASES);
  const imageKey = findHeader(headers, IMAGE_ALIASES);
  const priceKey = findHeader(headers, PRICE_ALIASES);
  const skuKey = findHeader(headers, SKU_ALIASES);

  return rows
    .map((row) => ({
      sku: skuKey ? row[skuKey] : "",
      name: nameKey ? row[nameKey] : "",
      size: sizeKey ? row[sizeKey] : "",
      imageUrl: imageKey ? row[imageKey] : "",
      price: priceKey ? parsePrice(row[priceKey]) : 0,
    }))
    .filter((p) => p.name.length > 0);
}
