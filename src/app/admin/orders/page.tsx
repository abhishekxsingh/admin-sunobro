import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersClient } from "./OrdersClient";

export const metadata: Metadata = {
  title: "Orders | SunoBro Admin",
};

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersClient />
    </Suspense>
  );
}
