import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsClient } from "./ProductsClient";

export const metadata: Metadata = {
  title: "Products | SunoBro Admin",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsClient />
    </Suspense>
  );
}
