import {
  BadgeIndianRupee,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  Clock,
  EyeOff,
  Globe,
  LoaderCircle,
  PackageCheck,
  ScanSearch,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { AdminOrder, AdminProduct } from "@/lib/api/types";

type Tone = { icon: LucideIcon; label: string; className: string };

const badgeBase =
  "inline-flex items-center gap-1 whitespace-nowrap font-mono text-[10px] px-2 py-0.5 border";

export const ORDER_STATUS: Record<AdminOrder["status"], Tone> = {
  pending: {
    icon: Clock,
    label: "PENDING",
    className: "bg-tertiary/10 text-tertiary border-tertiary/20",
  },
  paid: {
    icon: BadgeIndianRupee,
    label: "PAID",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  shipped: {
    icon: Truck,
    label: "SHIPPED",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  delivered: {
    icon: PackageCheck,
    label: "DELIVERED",
    className: "bg-secondary/10 text-secondary border-secondary/20",
  },
  cancelled: {
    icon: CircleX,
    label: "CANCELLED",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export const PRODUCT_STATUS: Record<AdminProduct["status"], Tone> = {
  review: {
    icon: ScanSearch,
    label: "REVIEW",
    className: "bg-tertiary/10 text-tertiary border-tertiary/30",
  },
  active: {
    icon: Globe,
    label: "LIVE",
    className: "bg-secondary/10 text-secondary border-secondary/20",
  },
  draft: { icon: EyeOff, label: "DRAFT", className: "border-border/40 text-muted-foreground" },
};

const QIKINK_STATUS: Record<string, Tone> = {
  created: {
    icon: CircleCheck,
    label: "ON QIKINK",
    className: "text-secondary border-secondary/20",
  },
  submitting: { icon: LoaderCircle, label: "PUSHING", className: "text-primary border-primary/20" },
  error: {
    icon: TriangleAlert,
    label: "PUSH FAILED",
    className: "text-destructive border-destructive/30",
  },
  skipped: {
    icon: CircleSlash,
    label: "SKIPPED",
    className: "text-muted-foreground border-border/40",
  },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const tone = ORDER_STATUS[status as AdminOrder["status"]];
  if (!tone) return <span className={`${badgeBase} border-border/30`}>{status.toUpperCase()}</span>;
  const Icon = tone.icon;
  return (
    <span className={`${badgeBase} ${tone.className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {tone.label}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: AdminProduct["status"] }) {
  const tone = PRODUCT_STATUS[status];
  const Icon = tone.icon;
  return (
    <span className={`${badgeBase} ${tone.className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {tone.label}
    </span>
  );
}

/** Qikink push state; "awaiting" when a paid/COD order hasn't been pushed yet. */
export function QikinkStatusBadge({
  status,
  awaiting,
}: {
  status?: string | null;
  awaiting?: boolean;
}) {
  const tone = status
    ? QIKINK_STATUS[status]
    : awaiting
      ? {
          icon: CircleDashed,
          label: "NOT ON QIKINK",
          className: "text-destructive border-destructive/30",
        }
      : null;
  if (!tone)
    return <span className="font-mono text-[10px] text-muted-foreground">{status || "—"}</span>;
  const Icon = tone.icon;
  return (
    <span className={`${badgeBase} ${tone.className}`}>
      <Icon className={`h-3 w-3 ${status === "submitting" ? "animate-spin" : ""}`} aria-hidden />
      {tone.label}
    </span>
  );
}

export function Spinner({ className = "h-3 w-3" }: { className?: string }) {
  return <LoaderCircle className={`${className} animate-spin`} aria-hidden />;
}

export function EmptyState({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center font-mono text-xs text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" strokeWidth={1.5} aria-hidden />
      {children}
    </div>
  );
}
