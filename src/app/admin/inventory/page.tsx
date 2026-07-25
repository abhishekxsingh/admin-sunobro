import type { Metadata } from "next";
import { Suspense } from "react";
import { InventoryClient } from "./InventoryClient";

export const metadata: Metadata = {
  title: "Inventory | SunoBro Admin",
};

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryClient />
    </Suspense>
  );
}
