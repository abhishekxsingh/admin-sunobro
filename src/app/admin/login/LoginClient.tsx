"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Lock, Terminal, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/logo";
import { ApiError } from "@/lib/api/client";
import { adminAuthApi } from "@/lib/api/endpoints";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendUnreachable, setBackendUnreachable] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBackendUnreachable(false);

    try {
      // On success the backend responds with `Set-Cookie: sb_admin_session=...`
      // (httpOnly). The browser stores it automatically since the client
      // uses `credentials: "include"` — the /admin middleware then sees it
      // on the next navigation. No client-side token handling needed.
      await adminAuthApi.login({ email, password });
      const next = searchParams.get("next") ?? "/admin";
      router.push(next);
      router.refresh();
    } catch (err) {
      // status 0 = fetch never reached a server; 404 here means this same
      // Next.js app has no /api/admin/auth/login route yet, i.e. no backend
      // is wired up — both read as "not connected" from the user's side.
      if (err instanceof ApiError && (err.status === 0 || err.status === 404)) {
        setBackendUnreachable(true);
        setError(`Backend not reachable. Once it's live, sign-in will work here.`);
      } else if (err instanceof ApiError) {
        setError(err.status === 401 ? "Invalid email or password." : err.message);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="grid grid-cols-12 h-full w-full">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="col-span-1 border-r border-foreground" />
          ))}
          <div className="col-span-1" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight">SunoBro Admin</h1>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Technical Operations // Authenticate
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="technical-border bg-surface-container p-8 space-y-6"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@sunobro.com"
              className="w-full bg-surface-lowest technical-border p-4 font-mono text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface-lowest technical-border p-4 font-mono text-sm focus:border-primary focus:outline-none"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`flex items-start gap-3 p-4 text-sm technical-border ${
                backendUnreachable
                  ? "border-tertiary/40 bg-tertiary/5 text-tertiary"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              <TriangleAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {backendUnreachable && (
                  <p className="font-mono text-[10px] mt-2 opacity-70">
                    NEXT_PUBLIC_API_BASE_URL → POST /admin/auth/login
                  </p>
                )}
              </div>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-foreground text-background font-bold flex items-center justify-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Terminal className="h-4 w-4" />
            {loading ? "AUTHENTICATING..." : "SIGN IN"}
          </motion.button>
        </form>

        <p className="mt-8 text-center font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
          System Message: [Access Restricted to Ops Personnel]
        </p>
      </motion.div>
    </div>
  );
}
