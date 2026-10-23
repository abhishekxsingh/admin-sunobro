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
  /** ON_DEMAND = print-on-demand variant; stock is not enforced. */
  status: "OPTIMAL" | "CRITICAL" | "LOW" | "ON_DEMAND";
  tracked?: boolean;
  qikinkSku?: string | null;
};

export type QueueOrder = {
  id: string;
  ref: string;
  client: string;
  value: number;
  currency: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  shippingCity?: string;
  shippingCountry?: string;
  items?: OrderLineItem[];
  qikinkOrderId?: string | null;
  qikinkStatus?: string | null;
  qikinkError?: string | null;
  trackingLink?: string | null;
  awb?: string | null;
  courier?: string | null;
  qikinkAttempts?: number;
  qikinkSyncedAt?: string | null;
  paymentGateway?: "razorpay" | "manual" | "cod" | string;
  source?: "storefront" | "admin";
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
  /** Off for print-on-demand: stock is never decremented or enforced. */
  trackInventory: boolean;
  variantCount: number;
  /** Variants that have a Qikink SKU. Publishing requires mappedCount === variantCount. */
  mappedCount: number;
  totalStock: number;
  qikinkSynced: boolean;
  variants?: ProductVariant[];
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
  /** The Qikink "My Products" SKU this line was (or will be) sent as. */
  qikinkSku?: string | null;
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
  qikinkOrderId?: string | null;
  qikinkStatus?: string | null;
  qikinkError?: string | null;
  trackingLink?: string | null;
  awb?: string | null;
  courier?: string | null;
  qikinkAttempts?: number;
  qikinkSyncedAt?: string | null;
  paymentGateway?: "razorpay" | "manual" | "cod" | string;
  source?: "storefront" | "admin";
};

export type QikinkSyncResult = {
  synced: number;
  message: string;
};

export type AdminCreateOrderPayload = {
  items: { sku: string; qty: number }[];
  shipping: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    email?: string;
    phone: string;
  };
  paymentMethod: "prepaid" | "cod";
  note?: string;
  pushToQikink?: boolean;
};

export type PaymentGatewayId = "razorpay" | "payu" | "cashfree";

export type PaymentGatewayStatus = {
  id: PaymentGatewayId;
  label: string;
  mode: string;
  configured: boolean;
  dummy: boolean;
};

export type PaymentSettings = {
  activeGateway: PaymentGatewayId;
  gateways: PaymentGatewayStatus[];
};

export type QikinkStatus = {
  connected: boolean;
  env?: string;
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
