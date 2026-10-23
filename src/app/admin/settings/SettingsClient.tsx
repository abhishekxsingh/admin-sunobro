"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ApiError } from "@/lib/api/client";
import { adminAuthApi, paymentsApi, qikinkApi } from "@/lib/api/endpoints";
import type { AdminUser, PaymentGatewayId, PaymentSettings, QikinkStatus } from "@/lib/api/types";

export function SettingsClient() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [storeName, setStoreName] = useState("SunoBro");
  const [currency, setCurrency] = useState("INR");
  const [qikink, setQikink] = useState<QikinkStatus | null>(null);
  const [qikinkBusy, setQikinkBusy] = useState<"status" | "products" | "orders" | null>("status");
  const [qikinkLog, setQikinkLog] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentSettings | null>(null);
  const [paymentBusy, setPaymentBusy] = useState<PaymentGatewayId | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  const refreshQikink = async () => {
    setQikinkBusy("status");
    try {
      setQikink(await qikinkApi.status());
    } catch (err) {
      setQikink({
        connected: false,
        message: err instanceof ApiError ? err.message : "Could not reach the backend.",
      });
    } finally {
      setQikinkBusy(null);
    }
  };

  const runQikinkSync = async (kind: "products" | "orders") => {
    setQikinkBusy(kind);
    setQikinkLog(null);
    try {
      const result =
        kind === "products" ? await qikinkApi.syncProducts() : await qikinkApi.syncOrders();
      setQikinkLog(result.message);
    } catch (err) {
      setQikinkLog(err instanceof ApiError ? err.message : "Sync failed.");
    } finally {
      setQikinkBusy(null);
    }
  };

  const activateGateway = async (id: PaymentGatewayId) => {
    if (!payments || payments.activeGateway === id || paymentBusy) return;
    setPaymentBusy(id);
    setPaymentNotice(null);
    try {
      const next = await paymentsApi.update(id);
      setPayments(next);
      const label = next.gateways.find((item) => item.id === next.activeGateway)?.label || id;
      setPaymentNotice(`${label} is the checkout gateway.`);
    } catch (err) {
      setPaymentNotice(err instanceof ApiError ? err.message : "Could not switch the gateway.");
    } finally {
      setPaymentBusy(null);
    }
  };

  useEffect(() => {
    void refreshQikink();
    paymentsApi
      .get()
      .then(setPayments)
      .catch((err) => {
        setPaymentNotice(err instanceof ApiError ? err.message : "Could not load payment gateways.");
      });
  }, []);

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
          <p className="font-mono text-[12px] text-gradient uppercase tracking-widest w-fit mb-2">
            System Configuration
          </p>
          <h2 className="text-4xl font-bold">Settings</h2>
        </header>

        <div className="space-y-8 max-w-2xl">
          {/* Store Configuration */}
          <section className="technical-border bg-surface-lowest p-6 space-y-5">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-widest mb-0.5">
                Store Configuration
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                [DISPLAY ONLY — changes are not persisted to backend yet]
              </p>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted-foreground uppercase mb-1">
                Store Name
              </label>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-muted px-3 py-2 text-sm technical-border"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted-foreground uppercase mb-1">
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
                className="bg-muted technical-border px-6 py-2 font-mono text-[12px] opacity-50 cursor-not-allowed"
              >
                SAVE CHANGES — NOT CONNECTED TO BACKEND
              </button>
            </div>
          </section>

          <section className="technical-border bg-surface-lowest p-6 space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-0.5">
                Payment gateway
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                Checkout uses the active gateway. Razorpay, PayU, and Cashfree stay configured
                together.
              </p>
            </div>

            <div className="space-y-3">
              {(payments?.gateways || []).map((gateway) => {
                const active = payments?.activeGateway === gateway.id;
                return (
                  <button
                    key={gateway.id}
                    type="button"
                    onClick={() => activateGateway(gateway.id)}
                    disabled={paymentBusy !== null || !gateway.configured}
                    className={`flex w-full items-center justify-between gap-4 technical-border px-4 py-3 text-left transition-all disabled:opacity-50 ${
                      active ? "border-primary" : "hover:border-foreground"
                    }`}
                  >
                    <span>
                      <span className="block font-mono text-[12px]">{gateway.label}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground uppercase">
                        {gateway.mode}
                        {gateway.dummy ? " · dummy keys" : ""}
                        {!gateway.configured ? " · not configured" : ""}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                      {paymentBusy === gateway.id ? "SAVING..." : active ? "ACTIVE" : "ACTIVATE"}
                    </span>
                  </button>
                );
              })}
            </div>

            {paymentNotice && (
              <p className="font-mono text-[10px] text-muted-foreground">{paymentNotice}</p>
            )}
          </section>

          {/* Qikink Integration */}
          <section className="technical-border bg-surface-lowest p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[12px] uppercase tracking-widest mb-0.5">
                  Qikink Integration
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Print-on-demand fulfillment — paid orders push automatically
                </p>
              </div>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 border rounded-full ${
                  qikink?.connected
                    ? "bg-secondary/10 text-secondary border-secondary/20"
                    : "bg-tertiary/10 text-tertiary border-tertiary/20"
                }`}
              >
                {qikinkBusy === "status"
                  ? "CHECKING..."
                  : qikink?.connected
                    ? `CONNECTED${qikink.env ? ` · ${qikink.env.toUpperCase()}` : ""}`
                    : "OFFLINE"}
              </span>
            </div>

            <div className="p-4 bg-surface-container technical-border font-mono text-[11px] space-y-1">
              {qikink && (
                <p className={qikink.connected ? "text-secondary" : "text-tertiary"}>
                  [{qikink.connected ? "OK" : "WARN"}] {qikink.message}
                </p>
              )}
              <p className="text-muted-foreground">
                [INFO] Status &amp; tracking refresh every 15 min and on order views
              </p>
              <p className="text-muted-foreground">
                [INFO] Failed pushes auto-retry up to 3x within 24h, then need PUSH TO QIKINK
              </p>
              <p className="text-muted-foreground">
                [INFO] Qikink has no cancel API — cancel pushed orders in dashboard.qikink.com
              </p>
              {qikinkLog && <p className="text-primary break-words">[SYNC] {qikinkLog}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={refreshQikink}
                disabled={qikinkBusy !== null}
                className="technical-border py-2 font-mono text-[12px] hover:border-foreground transition-all disabled:opacity-50"
              >
                {qikinkBusy === "status" ? "CHECKING..." : "TEST_CONNECTION"}
              </button>
              <button
                onClick={() => runQikinkSync("products")}
                disabled={qikinkBusy !== null || !qikink?.connected}
                className="technical-border py-2 font-mono text-[12px] hover:border-foreground transition-all disabled:opacity-50"
              >
                {qikinkBusy === "products" ? "CHECKING..." : "CHECK_SKUS"}
              </button>
              <button
                onClick={() => runQikinkSync("orders")}
                disabled={qikinkBusy !== null || !qikink?.connected}
                className="technical-border py-2 font-mono text-[12px] hover:border-foreground transition-all disabled:opacity-50"
              >
                {qikinkBusy === "orders" ? "SYNCING..." : "SYNC_ORDERS"}
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="technical-border bg-surface-lowest p-6 border-destructive/20">
            <p className="font-mono text-[12px] uppercase tracking-widest text-destructive mb-2">
              Danger Zone
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              [RESERVED — FUTURE DESTRUCTIVE ACTIONS]
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
