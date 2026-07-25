"use client";

import Link from "next/link";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sun,
  User,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useTheme } from "@/hooks/use-theme";

export type AdminSidebarPage =
  | "dashboard"
  | "orders"
  | "products"
  | "inventory"
  | "settings"
  | "profile";

type NavItem = {
  label: string;
  href: string;
  page: AdminSidebarPage;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", page: "dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", page: "orders", icon: ShoppingCart },
  { label: "Products", href: "/admin/products", page: "products", icon: ShoppingBag },
  { label: "Inventory", href: "/admin/inventory", page: "inventory", icon: Boxes },
  { label: "Settings", href: "/admin/settings", page: "settings", icon: Settings },
  { label: "Profile", href: "/admin/profile", page: "profile", icon: User },
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
    : "OP";

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-lowest border-r border-border/30 flex flex-col p-2 space-y-4 z-50">
      <div className="px-4 py-6 flex items-center gap-3">
        <Logo size="sm" />
        <div>
          <h1 className="text-xl font-bold leading-tight">SunoBro Admin</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase opacity-70">
            Technical Operations
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ label, href, page, icon: Icon }) => {
          const isActive = activePage === page;
          return (
            <Link
              key={page}
              href={href}
              className={`flex items-center px-4 py-3 rounded-lg transition-all group ${
                isActive
                  ? "bg-secondary/15 text-secondary font-bold translate-x-1"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 mr-3 ${isActive ? "" : "opacity-70 group-hover:opacity-100"}`}
              />
              <span className="font-mono text-[11px]">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border/30 pt-4 px-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="font-mono text-[11px] text-primary">{initials}</span>
          </div>
          <div>
            <p className="font-mono text-[11px] leading-none">{adminName || "Ops_Lead"}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {adminRole || "v2.4.1-stable"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? "SIGNING_OUT..." : "SIGN_OUT"}
          </button>
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors px-2 py-1 technical-border hover:bg-muted"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
