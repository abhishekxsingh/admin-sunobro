export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "ops";
  active?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string | null;
};

export type TeamMember = AdminUser & { active: boolean; isYou: boolean };

export type TeamCredentials = { member: TeamMember; temporaryPassword: string | null };

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
  customerId?: string | null;
  email?: string | null;
  phone?: string | null;
  subtotal?: number;
  discount?: number;
  couponCode?: string | null;
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
  /** review = new, waiting for an admin; active = on the website; draft = hidden. */
  status: "review" | "active" | "draft";
  /** Off for print-on-demand: stock is never decremented or enforced. */
  trackInventory: boolean;
  variantCount: number;
  /** Switched-on variants that have a Qikink Store SKU. Publishing needs all of them mapped. */
  mappedCount: number;
  /** Variants switched on (shown on the website). */
  enabledCount?: number;
  totalStock: number;
  qikinkSynced: boolean;
  variants?: ProductVariant[];
  /** Details from the Qikink My Products export (step 1). */
  qikink?: {
    productId: string | null;
    design: string | null;
    printSize: string | null;
    colourCount: number | null;
    sizeRange: string | null;
    expectedVariants: number | null;
  };
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
  /** Mockup for this variant's colour (shown on the product page). */
  image?: string | null;
  /** false = switched off by an admin: hidden from the website. */
  enabled?: boolean;
  /** What Qikink charges for this variant (₹). */
  qikinkCost?: number | null;
};

export type QikinkExportResult = {
  applied: boolean;
  problems: { where: string; message: string }[];
  products: {
    productId: string;
    name: string;
    design: string;
    printSize?: string;
    colourCount?: number;
    sizeRange?: string;
    expectedVariants?: number;
    price: number;
    cost: string;
    action: "create" | "update";
    status: "review" | "active" | "draft";
    variants: number;
  }[];
  results?: { name: string; ok: boolean; id: string; action: "create" | "update" }[];
};

export type VariationsResult = {
  applied: boolean;
  problems: { where: string; message: string }[];
  warnings: string[];
  product: { id: string; name: string; price: number };
  variants: number;
  expected: number | null;
  colours: {
    colour: string;
    sizes: string[];
    image: string;
    cost: number | null;
    mapped: number;
  }[];
  doc?: AdminProduct;
};

export type SheetImportResult = {
  applied: boolean;
  problems: { where: string; message: string }[];
  products: {
    name: string;
    status: "review" | "active" | "draft";
    price: number;
    variants: number;
    mapped: number;
    colours: string[];
    sizes: string[];
    action: "create" | "update";
    added: number;
    removed: number;
    kept: number;
  }[];
  results?: { name: string; ok: boolean; id?: string; slug?: string; errors?: string[] }[];
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
  customerId?: string | null;
  email?: string | null;
  phone?: string | null;
  total: number;
  subtotal?: number;
  discount?: number;
  couponCode?: string | null;
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
  couponCode?: string;
  pushToQikink?: boolean;
  customerId?: string;
  createCustomer?: boolean;
  saveAddress?: boolean;
  paymentReference?: string;
  reason?: string;
};

export type CatalogVariant = {
  sku: string;
  color: string;
  size: string;
  price: number;
  image: string | null;
  mapped: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  status: "active" | "review" | "draft";
  price: number;
  image: string | null;
  qikinkProductId: string | null;
  variants: CatalogVariant[];
};

export type QuoteLine = {
  sku: string;
  name: string;
  color: string;
  size: string;
  image: string | null;
  price: number;
  qty: number;
  lineTotal: number;
  mapped: boolean;
};

export type QuoteOffer = {
  code: string;
  name: string | null;
  summary: string;
  kind: string;
  personal: boolean;
  eligible: boolean;
  saving: number;
  reason: string | null;
  endsAt: string | null;
};

export type OrderQuote = {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  total: number;
  coupon: (QuoteOffer & { discount: number }) | null;
  couponError: string | null;
  problems: string[];
  offers: QuoteOffer[];
};

export type PaymentGatewayId = "razorpay" | "payu" | "easebuzz" | "cashfree";

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

export type CouponKind = "general" | "festival" | "seasonal" | "customer";
export type CouponState = "live" | "scheduled" | "expired" | "used-up" | "disabled";

export type CouponCustomer = { id: string; name?: string; email?: string; phone?: string | null };

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description: string;
  kind: CouponKind;
  discountType: "percent" | "flat";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  customers: CouponCustomer[];
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  showAtCheckout: boolean;
  active: boolean;
  state: CouponState;
  summary: string;
  createdAt: string;
};

export type CouponPayload = {
  code?: string;
  name?: string;
  description?: string;
  kind?: CouponKind;
  discountType?: "percent" | "flat";
  value?: number;
  maxDiscount?: number | null;
  minOrderValue?: number;
  customerIds?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  firstOrderOnly?: boolean;
  showAtCheckout?: boolean;
  active?: boolean;
};

export type CouponRedemption = {
  id: string;
  reference: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  total: number;
  discount: number;
  client: string;
  email: string | null;
  counted: boolean;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  authMethod: "password" | "google" | "both";
  addresses: {
    id: string;
    label: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }[];
  createdAt: string;
  orders: number;
  purchasedOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export type AdminCustomerOrder = {
  id: string;
  reference: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  total: number;
  discount: number;
  couponCode: string | null;
  currency: string;
  createdAt: string;
  items: { name: string; size: string; color: string; qty: number; sku: string }[];
  qikinkOrderId: string | null;
  city: string;
};

export type AdminCustomerDetail = Omit<AdminCustomer, "orders"> & {
  orders: AdminCustomerOrder[];
};
