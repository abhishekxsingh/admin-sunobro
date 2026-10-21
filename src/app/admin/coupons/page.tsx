import type { Metadata } from "next";
import { Suspense } from "react";
import { CouponsClient } from "./CouponsClient";

export const metadata: Metadata = {
  title: "Coupons | SunoBro Admin",
};

export default function CouponsPage() {
  return (
    <Suspense fallback={null}>
      <CouponsClient />
    </Suspense>
  );
}
