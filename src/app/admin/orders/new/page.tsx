import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateOrderClient } from "./CreateOrderClient";

export const metadata: Metadata = {
  title: "Create order | SunoBro Admin",
};

export default function CreateOrderPage() {
  return (
    <Suspense fallback={null}>
      <CreateOrderClient />
    </Suspense>
  );
}
