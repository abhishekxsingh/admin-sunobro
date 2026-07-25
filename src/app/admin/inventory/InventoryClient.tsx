"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Cable, CircuitBoard, MemoryStick, RefreshCw } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { adminApi, adminAuthApi } from "@/lib/api/endpoints";
import type { AdminUser, InventoryItem } from "@/lib/api/types";

const DEMO_INVENTORY: InventoryItem[] = [
  { sku: "SB-CORE-01", name: "Titanium Modular Chassis", stock: 1240, status: "OPTIMAL" },
  { sku: "SB-LINK-X", name: "High-Density Optical Array", stock: 42, status: "CRITICAL" },
  { sku: "SB-PROC-Z1", name: "Cryo-Cooled Logic Unit", stock: 812, status: "OPTIMAL" },
  { sku: "SB-TEE-BLK-M", name: "Technical Tee / Black / M", stock: 8, status: "LOW" },
  { sku: "SB-CAP-WHT-OS", name: "Circuit Cap / White / One Size", stock: 3, status: "CRITICAL" },
];

const INVENTORY_ICONS = [MemoryStick, Cable, CircuitBoard, Boxes, MemoryStick];

const statusTone = (status: InventoryItem["status"]) =>
  status === "OPTIMAL"
    ? "bg-secondary/10 text-secondary border-secondary/20"
    : status === "CRITICAL"
      ? "bg-tertiary/10 text-tertiary border-tertiary/20"
      : "bg-destructive/10 text-destructive border-destructive/20";

type SortKey = "stock" | "status" | "sku";

export function InventoryClient() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>(DEMO_INVENTORY);
  const [isDemo, setIsDemo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("stock");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await adminApi.inventory();
      setInventory(data);
      setIsDemo(false);
    } catch {
      setIsDemo(true);
    }
  };

  useEffect(() => {
    let cancelled = false;

    adminAuthApi.me().then((user) => {
      if (!cancelled) setAdminUser(user);
    }).catch(() => { /* backend offline */ });

    load();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await adminAuthApi.logout(); } catch { /* ignore */ }
    finally { router.push("/admin/login"); router.refresh(); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sorted = [...inventory].sort((a, b) => {
    if (sortBy === "stock") return a.stock - b.stock;
    if (sortBy === "status") return a.status.localeCompare(b.status);
    return a.sku.localeCompare(b.sku);
  });

  const critical = inventory.filter((i) => i.status === "CRITICAL").length;
  const low = inventory.filter((i) => i.status === "LOW").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="inventory"
        adminName={adminUser?.name}
        adminRole={adminUser?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-mono text-[11px] text-primary uppercase tracking-widest">
              System Inventory
            </p>
            {isDemo && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/30 uppercase tracking-widest">
                Demo Data
              </span>
            )}
          </div>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <h2 className="text-4xl font-bold">Stock Monitor</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-muted technical-border px-4 py-2 font-mono text-[11px] hover:border-foreground transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "REFRESHING..." : "REFRESH"}
            </button>
          </div>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total SKUs", value: inventory.length, color: "text-foreground" },
            { label: "Critical Stock", value: critical, color: "text-tertiary" },
            { label: "Low Stock", value: low, color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <div key={label} className="technical-border bg-surface-lowest p-4">
              <p className="font-mono text-[11px] text-muted-foreground uppercase mb-2">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex gap-2 mb-4">
          {(["stock", "status", "sku"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`font-mono text-[11px] px-3 py-1.5 border transition-all ${
                sortBy === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              BY {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Inventory table */}
        <div className="technical-border bg-surface-lowest overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase">SKU / Product</th>
                <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase text-right">Stock Level</th>
                <th className="p-4 font-mono text-[11px] text-muted-foreground uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => {
                const Icon = INVENTORY_ICONS[i % INVENTORY_ICONS.length];
                return (
                  <tr key={item.sku} className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted flex items-center justify-center technical-border">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-mono text-sm">{item.sku}</p>
                          <p className="text-xs text-muted-foreground">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono">
                      {item.stock.toLocaleString()} <span className="text-xs text-muted-foreground">units</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-mono text-[10px] px-2 py-0.5 border ${statusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
