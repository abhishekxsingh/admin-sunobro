import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | SunoBro Admin",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsClient />
    </Suspense>
  );
}
