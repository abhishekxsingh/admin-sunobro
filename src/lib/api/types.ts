export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "ops";
};

export type AdminLoginPayload = {
  email: string;
  password: string;
};

export type AdminStats = {
  grossRevenue24h: number;
  revenueChangePct: number;
  activeOrders: number;
  conversionRatePct: number;
  conversionChangePct: number;
};

export type InventoryItem = {
  sku: string;
  name: string;
  stock: number;
  status: "OPTIMAL" | "CRITICAL" | "LOW";
};

export type QueueOrder = {
  ref: string;
  client: string;
  value: number;
  currency: string;
  status: "FULFILLED" | "PENDING";
};
