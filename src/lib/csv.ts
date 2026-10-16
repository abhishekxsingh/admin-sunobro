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

/**
 * Catalog CSV: one row per variant (size × colour). Rows that share a slug (or
 * product name when slug is empty) become one product; product-level columns
 * are read from that product's first row.
 */
export const CATALOG_CSV_HEADERS = [
  "product_name",
  "slug",
  "description",
  "price",
  "images",
  "status",
  "track_inventory",
  "size",
  "color",
  "qikink_sku",
  "variant_price",
  "stock",
] as const;

export const CATALOG_CSV_TEMPLATE = [
  CATALOG_CSV_HEADERS.join(","),
  "SunoBro Logo Tee,sunobro-logo-tee,Heavyweight cotton tee,799,https://cdn.example.com/tee-front.jpg|https://cdn.example.com/tee-back.jpg,active,no,M,Black,MVnHs-Bk-M,,",
  "SunoBro Logo Tee,sunobro-logo-tee,,,,,,L,Black,MVnHs-Bk-L,,",
  "SunoBro Logo Tee,sunobro-logo-tee,,,,,,M,White,MVnHs-Wh-M,849,",
].join("\n");

export type CatalogVariantInput = {
  size: string;
  color: string;
  qikinkSku?: string;
  price?: number;
  stock?: number;
};

export type CatalogProductInput = {
  name: string;
  slug?: string;
  description: string;
  price: number;
  currency: "INR";
  images: string[];
  status?: "active" | "draft";
  trackInventory: boolean;
  variants: CatalogVariantInput[];
};

const num = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined;
  const value = parseFloat(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(value) ? value : undefined;
};

const pick = (row: CsvRow, ...keys: string[]) =>
  keys.map((k) => row[k]).find((v) => v !== undefined && v !== "") ?? "";

export function parseCatalogCsv(text: string): {
  products: CatalogProductInput[];
  problems: string[];
} {
  const rows = parseCsv(text).map((row) => {
    // Accept "Product Name" / "qikink sku" style headers too.
    const normalized: CsvRow = {};
    Object.entries(row).forEach(([k, v]) => {
      normalized[k.replace(/[\s-]+/g, "_")] = v;
    });
    return normalized;
  });

  const problems: string[] = [];
  const byKey = new Map<string, CatalogProductInput>();

  rows.forEach((row, i) => {
    const line = i + 2;
    const name = pick(row, "product_name", "name", "title");
    const slug = pick(row, "slug");
    const key = slug || name;
    if (!key) {
      problems.push(`Row ${line}: product_name or slug is required.`);
      return;
    }

    let product = byKey.get(key);
    if (!product) {
      const status = pick(row, "status").toLowerCase();
      product = {
        name: name || slug,
        slug: slug || undefined,
        description: pick(row, "description"),
        price: num(pick(row, "price")) ?? 0,
        currency: "INR",
        images: pick(row, "images", "image_url", "image")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean),
        status: status === "active" || status === "draft" ? status : undefined,
        trackInventory: ["yes", "true", "1"].includes(pick(row, "track_inventory").toLowerCase()),
        variants: [],
      };
      if (!product.price) problems.push(`Row ${line}: ${product.name} has no price.`);
      byKey.set(key, product);
    }

    const size = pick(row, "size");
    const color = pick(row, "color", "colour");
    if (!size || !color) {
      problems.push(`Row ${line}: size and color are required for every variant.`);
      return;
    }
    product.variants.push({
      size,
      color,
      qikinkSku: pick(row, "qikink_sku") || undefined,
      price: num(pick(row, "variant_price")),
      stock: num(pick(row, "stock")),
    });
  });

  return { products: [...byKey.values()].filter((p) => p.variants.length > 0), problems };
}
