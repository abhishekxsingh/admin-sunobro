import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomersClient } from "./CustomersClient";

export const metadata: Metadata = {
  title: "Customers | SunoBro Admin",
};

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersClient />
    </Suspense>
  );
}
