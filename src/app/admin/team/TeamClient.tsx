"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleCheck,
  CirclePause,
  Copy,
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { EmptyState, Spinner } from "@/components/status";
import { ApiError } from "@/lib/api/client";
import { adminAuthApi, adminMembersApi } from "@/lib/api/endpoints";
import type { AdminUser, TeamCredentials, TeamMember } from "@/lib/api/types";

type Role = TeamMember["role"];

const ROLES: { key: Role; label: string; hint: string; icon: LucideIcon }[] = [
  {
    key: "admin",
    label: "Admin",
    hint: "Everything, including adding and removing team members",
    icon: ShieldCheck,
  },
  {
    key: "ops",
    label: "Ops",
    hint: "Orders, products, coupons, inventory — can't manage the team",
    icon: Wrench,
  },
];

const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const when = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "never";

const input = "w-full bg-muted px-3 py-2 text-sm technical-border";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };
  return { copied, copy };
}

/** Shown once after adding a member or resetting a password. */
function CredentialsCard({ creds, onClose }: { creds: TeamCredentials; onClose: () => void }) {
  const { copied, copy } = useCopy();
  const loginUrl =
    typeof window !== "undefined" ? `${window.location.origin}/admin/login` : "/admin/login";
  const message = [
    `SunoBro admin access for ${creds.member.name}`,
    `Sign in: ${loginUrl}`,
    `Email: ${creds.member.email}`,
    creds.temporaryPassword ? `One-time password: ${creds.temporaryPassword}` : null,
    "Please change the password from Profile after you sign in.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section className="mb-8 p-5 technical-border border-secondary/40 bg-secondary/5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-widest text-secondary">
          <KeyRound className="h-3.5 w-3.5" /> Login details for {creds.member.name}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login details"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[auto_1fr] font-mono text-xs">
        <span className="text-muted-foreground">EMAIL</span>
        <span>{creds.member.email}</span>
        {creds.temporaryPassword && (
          <>
            <span className="text-muted-foreground">ONE-TIME PASSWORD</span>
            <span className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 text-sm tracking-wider">
                {creds.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={() => copy("pw", creds.temporaryPassword || "")}
                aria-label="Copy password"
                className="text-muted-foreground hover:text-foreground"
              >
                {copied === "pw" ? (
                  <Check className="h-3.5 w-3.5 text-secondary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </span>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => copy("all", message)}
          className="btn-primary px-3 py-1.5 font-mono text-[12px] font-bold flex items-center gap-2 hover:opacity-90"
        >
          {copied === "all" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied === "all" ? "COPIED" : "COPY LOGIN MESSAGE"}
        </button>
        <p className="font-mono text-[11px] text-muted-foreground">
          {creds.temporaryPassword
            ? "This password is shown only now — share it privately (WhatsApp, in person)."
            : "They sign in with the password you set."}
        </p>
      </div>
    </section>
  );
}

function AddMemberForm({
  onAdded,
  onCancel,
}: {
  onAdded: (creds: TeamCredentials) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("ops");
  const [setOwn, setSetOwn] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      onAdded(
        await adminMembersApi.create({
          name: name.trim(),
          email: email.trim(),
          role,
          password: setOwn ? password : undefined,
        }),
      );
    } catch (err) {
      setError(errorText(err, "Could not add that member."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-8 p-6 technical-border bg-surface-lowest space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[12px] uppercase tracking-widest">Add a team member</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="member-name"
            className="block font-mono text-[11px] text-muted-foreground uppercase mb-1"
          >
            Name
          </label>
          <input
            id="member-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Riya Sharma"
            className={input}
          />
        </div>
        <div>
          <label
            htmlFor="member-email"
            className="block font-mono text-[11px] text-muted-foreground uppercase mb-1"
          >
            Email (they sign in with this)
          </label>
          <input
            id="member-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="riya@sunobro.com"
            className={input}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Role">
        {ROLES.map(({ key, label, hint, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={role === key}
            onClick={() => setRole(key)}
            className={`p-3 text-left technical-border ${
              role === key
                ? "border-secondary/60 bg-secondary/10"
                : "text-muted-foreground hover:border-foreground"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4" /> {label}
            </span>
            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 font-mono text-[12px]">
          <input type="checkbox" checked={setOwn} onChange={(e) => setSetOwn(e.target.checked)} />
          SET THEIR PASSWORD MYSELF (otherwise a one-time password is generated)
        </label>
        {setOwn && (
          <input
            type="password"
            aria-label="Password"
            minLength={12}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            className={`${input} max-w-sm`}
          />
        )}
      </div>

      {error && <p className="font-mono text-[12px] text-destructive">{error}</p>}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 font-mono text-[12px] text-muted-foreground hover:text-foreground"
        >
          CANCEL
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-4 py-2 font-mono text-[12px] font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Spinner /> : <UserPlus className="h-3 w-3" />}
          {saving ? "ADDING..." : "ADD MEMBER"}
        </button>
      </div>
    </form>
  );
}

export function TeamClient() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState<TeamCredentials | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    adminAuthApi
      .me()
      .then(setMe)
      .catch(() => {});
    adminMembersApi
      .list()
      .then(setMembers)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setLoadError(errorText(err, "Could not load the team."));
      });
  }, []);

  const replace = (m: TeamMember) =>
    setMembers((prev) => (prev || []).map((x) => (x.id === m.id ? m : x)));

  const act = async (m: TeamMember, key: string, run: () => Promise<void>) => {
    setBusy(`${m.id}:${key}`);
    setRowError(null);
    try {
      await run();
    } catch (err) {
      setRowError({ id: m.id, message: errorText(err, "That didn't work.") });
    } finally {
      setBusy(null);
    }
  };

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

  const activeCount = (members || []).filter((m) => m.active).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        activePage="team"
        adminName={me?.name}
        adminRole={me?.role}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="ml-64 p-8 md:p-16 min-h-screen">
        <header className="mb-10">
          <p className="font-mono text-[12px] text-gradient uppercase tracking-widest w-fit mb-2">
            Access
          </p>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
              <h2 className="text-4xl font-bold">Team</h2>
              <p className="font-mono text-[11px] text-muted-foreground mt-1">
                {members
                  ? `${members.length} MEMBER${members.length === 1 ? "" : "S"} · ${activeCount} ACTIVE`
                  : "WHO CAN SIGN IN TO THIS ADMIN PANEL"}
              </p>
            </div>
            {members && (
              <button
                type="button"
                onClick={() => {
                  setAdding(true);
                  setCreds(null);
                }}
                className="btn-primary px-4 py-2 font-mono text-[12px] font-bold flex items-center gap-2 hover:opacity-90"
              >
                <UserPlus className="h-3.5 w-3.5" /> ADD MEMBER
              </button>
            )}
          </div>
        </header>

        {forbidden ? (
          <div className="p-8 technical-border bg-surface-lowest">
            <EmptyState icon={Lock}>
              ONLY ADMINS CAN MANAGE THE TEAM — ASK AN ADMIN TO ADD OR CHANGE MEMBERS
            </EmptyState>
          </div>
        ) : (
          <>
            {creds && <CredentialsCard creds={creds} onClose={() => setCreds(null)} />}
            {adding && (
              <AddMemberForm
                onCancel={() => setAdding(false)}
                onAdded={(c) => {
                  setMembers((prev) => [...(prev || []), c.member]);
                  setCreds(c);
                  setAdding(false);
                }}
              />
            )}

            <div className="technical-border bg-surface-lowest overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/30">
                    {["Member", "Role", "Status", "Last sign-in", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="p-4 font-mono text-[12px] text-muted-foreground uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!members ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center font-mono text-xs text-muted-foreground"
                      >
                        {loadError || (
                          <span className="inline-flex items-center gap-2">
                            <Spinner /> LOADING TEAM…
                          </span>
                        )}
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8">
                        <EmptyState icon={UsersRound}>NO MEMBERS</EmptyState>
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr
                        key={m.id}
                        className={`border-b border-border/30 last:border-b-0 hover:bg-muted/40 align-top ${
                          m.active ? "" : "opacity-60"
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center font-mono text-[12px] text-primary">
                              {initials(m.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {m.name}
                                {m.isYou && (
                                  <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary">
                                    YOU
                                  </span>
                                )}
                              </p>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                {m.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            aria-label={`Role for ${m.name}`}
                            value={m.role}
                            disabled={m.isYou || busy !== null}
                            title={m.isYou ? "Another admin has to change your role" : undefined}
                            onChange={(e) =>
                              void act(m, "role", async () =>
                                replace(
                                  await adminMembersApi.update(m.id, {
                                    role: e.target.value as Role,
                                  }),
                                ),
                              )
                            }
                            className="bg-muted technical-border px-2 py-1 font-mono text-[12px] disabled:opacity-60"
                          >
                            {ROLES.map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 border rounded-full ${
                              m.active
                                ? "bg-secondary/10 text-secondary border-secondary/20"
                                : "border-border/40 text-muted-foreground"
                            }`}
                          >
                            {m.active ? (
                              <CircleCheck className="h-3 w-3" />
                            ) : (
                              <CirclePause className="h-3 w-3" />
                            )}
                            {m.active ? "ACTIVE" : "DEACTIVATED"}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                          {when(m.lastLoginAt)}
                          <p className="text-[11px]">added {when(m.createdAt).split(",")[0]}</p>
                        </td>
                        <td className="p-4">
                          {m.isYou ? (
                            <p className="font-mono text-[11px] text-muted-foreground">
                              Change your password in Profile.
                            </p>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() =>
                                  void act(m, "reset", async () => {
                                    if (
                                      !window.confirm(
                                        `Give ${m.name} a new one-time password? Their current password stops working.`,
                                      )
                                    )
                                      return;
                                    const c = await adminMembersApi.resetPassword(m.id);
                                    replace(c.member);
                                    setCreds(c);
                                  })
                                }
                                className="inline-flex items-center gap-1 font-mono text-[12px] text-primary hover:underline disabled:opacity-50"
                              >
                                {busy === `${m.id}:reset` ? (
                                  <Spinner />
                                ) : (
                                  <KeyRound className="h-3 w-3" />
                                )}
                                RESET PASSWORD
                              </button>
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() =>
                                  void act(m, "active", async () =>
                                    replace(
                                      await adminMembersApi.update(m.id, { active: !m.active }),
                                    ),
                                  )
                                }
                                className={`inline-flex items-center gap-1 font-mono text-[12px] hover:underline disabled:opacity-50 ${
                                  m.active ? "text-muted-foreground" : "font-bold text-secondary"
                                }`}
                              >
                                {busy === `${m.id}:active` ? (
                                  <Spinner />
                                ) : m.active ? (
                                  <CirclePause className="h-3 w-3" />
                                ) : (
                                  <CircleCheck className="h-3 w-3" />
                                )}
                                {m.active ? "DEACTIVATE" : "REACTIVATE"}
                              </button>
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() =>
                                  void act(m, "remove", async () => {
                                    if (
                                      !window.confirm(
                                        `Remove ${m.name} from the team? They are signed out immediately.`,
                                      )
                                    )
                                      return;
                                    await adminMembersApi.remove(m.id);
                                    setMembers((prev) => (prev || []).filter((x) => x.id !== m.id));
                                  })
                                }
                                className="inline-flex items-center gap-1 font-mono text-[12px] text-destructive hover:underline disabled:opacity-50"
                              >
                                {busy === `${m.id}:remove` ? (
                                  <Spinner />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                REMOVE
                              </button>
                            </div>
                          )}
                          {rowError?.id === m.id && (
                            <p className="mt-2 max-w-xs font-mono text-[11px] text-destructive">
                              {rowError.message}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">
              Deactivating or removing someone signs them out at once. Role changes apply to their
              open session straight away. There must always be at least one active admin.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
