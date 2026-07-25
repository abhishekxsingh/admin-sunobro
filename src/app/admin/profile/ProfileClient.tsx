"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { adminAuthApi, adminProfileApi } from "@/lib/api/endpoints";
import type { AdminUser } from "@/lib/api/types";

export function ProfileClient() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; error: boolean } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminAuthApi.me().then((user) => {
      if (!cancelled) {
        setAdminUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
      }
    }).catch(() => { /* backend offline */ });
    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await adminAuthApi.logout(); } catch { /* ignore */ }
    finally { router.push("/admin/login"); router.refresh(); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const updated = await adminProfileApi.update({ name: editName, email: editEmail });
      setAdminUser(updated);
      setSaveStatus({ message: "Profile updated.", error: false });
    } catch {
      setSaveStatus({ message: "[PUT /admin/profile — not wired yet] Changes not persisted.", error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ message: "New passwords do not match.", error: true });
      return;
    }
    setChangingPassword(true);
    setPasswordStatus(null);
    try {
      await adminProfileApi.changePassword({ currentPassword, newPassword });
      setPasswordStatus({ message: "Password changed.", error: false });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      setPasswordStatus({ message: "[PUT /admin/profile/password — not wired yet] Password not changed.", error: true });
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = adminUser?.name
    ? adminUser.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
    : "OP";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="profile"
        adminName={adminUser?.name}
        adminRole={adminUser?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-10">
          <p className="font-mono text-[11px] text-primary uppercase tracking-widest mb-2">
            Admin Profile
          </p>
          <h2 className="text-4xl font-bold">Identity</h2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
          {/* Identity card */}
          <section className="technical-border bg-surface-lowest p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="font-mono text-lg text-primary">{initials}</span>
              </div>
              <div>
                <p className="text-lg font-bold">{adminUser?.name || "—"}</p>
                <p className="text-sm text-muted-foreground">{adminUser?.email || "—"}</p>
                <span className="font-mono text-[10px] px-2 py-0.5 border border-primary/30 bg-primary/10 text-primary">
                  {adminUser?.role?.toUpperCase() || "ADMIN"}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-widest border-t border-border/30 pt-4">
                Edit Identity
              </p>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-muted px-3 py-2 text-sm technical-border"
                />
              </div>
              {saveStatus && (
                <p className={`font-mono text-[11px] ${saveStatus.error ? "text-destructive" : "text-secondary"}`}>
                  {saveStatus.message}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-secondary text-secondary-foreground py-2 font-mono text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </form>
          </section>

          {/* Security */}
          <section className="technical-border bg-surface-lowest p-6 space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-widest">Security</p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {[
                { label: "Current Password", value: currentPassword, set: setCurrentPassword },
                { label: "New Password", value: newPassword, set: setNewPassword },
                { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">{label}</label>
                  <input
                    type="password"
                    required
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-muted px-3 py-2 text-sm technical-border"
                  />
                </div>
              ))}

              {passwordStatus && (
                <p className={`font-mono text-[11px] ${passwordStatus.error ? "text-destructive" : "text-secondary"}`}>
                  {passwordStatus.message}
                </p>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full bg-muted technical-border py-2 font-mono text-[11px] hover:border-foreground transition-all disabled:opacity-50"
              >
                {changingPassword ? "CHANGING..." : "CHANGE PASSWORD"}
              </button>

              <p className="font-mono text-[10px] text-muted-foreground">
                [PUT /admin/profile/password — not wired yet]
              </p>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
