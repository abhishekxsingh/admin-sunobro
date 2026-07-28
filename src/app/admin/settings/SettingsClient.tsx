"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { adminAuthApi } from "@/lib/api/endpoints";
import type { AdminUser } from "@/lib/api/types";

export function SettingsClient() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [storeName, setStoreName] = useState("SunoBro");
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    let cancelled = false;
    adminAuthApi
      .me()
      .then((user) => {
        if (!cancelled) setAdminUser(user);
      })
      .catch(() => {
        /* backend offline */
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await adminAuthApi.logout();
    } catch {
      /* ignore */
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="settings"
        adminName={adminUser?.name}
        adminRole={adminUser?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-10">
          <p className="font-mono text-[11px] text-primary uppercase tracking-widest mb-2">
            System Configuration
          </p>
          <h2 className="text-4xl font-bold">Settings</h2>
        </header>

        <div className="space-y-8 max-w-2xl">
          {/* Store Configuration */}
          <section className="technical-border bg-surface-lowest p-6 space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-0.5">
                Store Configuration
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                [DISPLAY ONLY — changes are not persisted to backend yet]
              </p>
            </div>

            <div>
              <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                Store Name
              </label>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-muted px-3 py-2 text-sm technical-border"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-muted px-3 py-2 font-mono text-sm technical-border"
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                disabled
                title="Backend endpoint not wired yet"
                className="bg-muted technical-border px-6 py-2 font-mono text-[11px] opacity-50 cursor-not-allowed"
              >
                SAVE CHANGES — NOT CONNECTED TO BACKEND
              </button>
            </div>
          </section>

          {/* Qikink Integration */}
          <section className="technical-border bg-surface-lowest p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest mb-0.5">
                  Qikink Integration
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Print-on-demand fulfillment
                </p>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 border bg-tertiary/10 text-tertiary border-tertiary/20">
                NOT CONFIGURED
              </span>
            </div>

            <div className="p-4 bg-surface-container technical-border font-mono text-[10px] space-y-1">
              <p className="text-tertiary">
                [WARN] QIKINK_NOT_WIRED — configure credentials in .env
              </p>
              <p className="text-muted-foreground">
                [TODO] QIKINK_CLIENT_ID=&lt;your-client-id&gt;
              </p>
              <p className="text-muted-foreground">
                [TODO] QIKINK_CLIENT_SECRET=&lt;your-secret&gt;
              </p>
              <p className="text-muted-foreground">
                [SEE] server/services/admin/qikink.js for setup instructions
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Client ID
                </label>
                <input
                  type="password"
                  disabled
                  placeholder="Not configured"
                  className="w-full bg-muted px-3 py-2 text-sm technical-border opacity-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  disabled
                  placeholder="Not configured"
                  className="w-full bg-muted px-3 py-2 text-sm technical-border opacity-50 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              disabled
              className="w-full bg-tertiary/10 text-tertiary border border-tertiary/20 py-2 font-mono text-[11px] cursor-not-allowed opacity-60"
            >
              CONNECT QIKINK — COMING_SOON
            </button>
          </section>

          {/* Danger Zone */}
          <section className="technical-border bg-surface-lowest p-6 border-destructive/20">
            <p className="font-mono text-[11px] uppercase tracking-widest text-destructive mb-2">
              Danger Zone
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              [RESERVED — FUTURE DESTRUCTIVE ACTIONS]
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
