import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "Profile | SunoBro Admin",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileClient />
    </Suspense>
  );
}
