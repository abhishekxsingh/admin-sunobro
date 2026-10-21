"use client";

import Link from "next/link";
import {
  CircleUser,
  Contact,
  LayoutDashboard,
  LogOut,
  Moon,
  ReceiptText,
  Settings,
  Shirt,
  Sun,
  TicketPercent,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useTheme } from "@/hooks/use-theme";

export type AdminSidebarPage =
  | "dashboard"
  | "orders"
  | "products"
  | "customers"
  | "inventory"
  | "coupons"
  | "team"
  | "settings"
  | "profile";

type NavItem = {
  label: string;
  href: string;
  page: AdminSidebarPage;
  icon: React.ElementType;
};

// Grouped by job: what sells, what runs the shop, who runs it.
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", page: "dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Sell",
    items: [
      { label: "Orders", href: "/admin/orders", page: "orders", icon: ReceiptText },
      { label: "Products", href: "/admin/products", page: "products", icon: Shirt },
      { label: "Customers", href: "/admin/customers", page: "customers", icon: Contact },
      { label: "Coupons", href: "/admin/coupons", page: "coupons", icon: TicketPercent },
    ],
  },
  {
    title: "Operate",
    items: [{ label: "Inventory", href: "/admin/inventory", page: "inventory", icon: Warehouse }],
  },
  {
    title: "Admin",
    items: [
      { label: "Team", href: "/admin/team", page: "team", icon: UsersRound },
      { label: "Settings", href: "/admin/settings", page: "settings", icon: Settings },
      { label: "Profile", href: "/admin/profile", page: "profile", icon: CircleUser },
    ],
  },
];

type Props = {
  activePage: AdminSidebarPage;
  adminName?: string;
  adminRole?: string;
  onLogout: () => void;
  loggingOut: boolean;
};

export function AdminSidebar({ activePage, adminName, adminRole, onLogout, loggingOut }: Props) {
  const { theme, toggle } = useTheme();

  const initials = adminName
    ? adminName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SB";

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-50 flex flex-col border-r border-border/40 bg-surface-lowest/85 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="rounded-xl bg-gradient-brand p-[1.5px] shadow-lg shadow-primary/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-lowest">
            <Logo size="sm" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight tracking-tight">
            SunoBro <span className="text-gradient">Admin</span>
          </p>
          <p className="text-[11px] text-muted-foreground">Store operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Admin">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, page, icon: Icon }) => {
                const isActive = activePage === page;
                return (
                  <Link
                    key={page}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                      isActive
                        ? "bg-primary/12 font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-brand" />
                    )}
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        isActive ? "text-primary" : "opacity-75 group-hover:opacity-100"
                      }`}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-border/50 bg-surface-container/70 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[12px] font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{adminName || "Admin"}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{adminRole || "—"}</p>
          </div>
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-3 flex w-full items-center justify-center gap-2 border border-border/60 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
