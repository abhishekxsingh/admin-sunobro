import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamClient } from "./TeamClient";

export const metadata: Metadata = {
  title: "Team | SunoBro Admin",
};

export default function TeamPage() {
  return (
    <Suspense fallback={null}>
      <TeamClient />
    </Suspense>
  );
}
