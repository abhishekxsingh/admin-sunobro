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
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  size: string;
  imageUrl: string;
  price: number;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  sizes: string[];
  inStock: boolean;
  status: "active" | "draft";
  variantCount: number;
  totalStock: number;
  qikinkSynced: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price: number | null;
  qikinkSku: string | null;
};

export type OrderLineItem = {
  name: string;
  size: string;
  color: string;
  sku: string;
  price: number;
  qty: number;
};

export type StatusHistoryEntry = {
  status: string;
  note: string;
  createdAt: string;
};

export type AdminOrder = {
  id: string;
  reference: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  client: string;
  total: number;
  currency: string;
  items: OrderLineItem[];
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  shippingCity: string;
  shippingCountry: string;
};

export type QikinkSyncResult = {
  synced: number;
  message: string;
};

export type AdminProfileUpdatePayload = {
  name: string;
  email: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
