import type { Metadata } from "next";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Technical Operations | SunoBro Admin",
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
