import { api } from "./client";
import type {
  TeamCredentials,
  TeamMember,
  Coupon,
  CouponCustomer,
  CouponPayload,
  CouponRedemption,
  AdminCreateOrderPayload,
  AdminLoginPayload,
  AdminOrder,
  AdminProduct,
  AdminProfileUpdatePayload,
  AdminStats,
  AdminUser,
  ChangePasswordPayload,
  InventoryItem,
  QikinkStatus,
  QikinkSyncResult,
  QikinkExportResult,
  QueueOrder,
  SheetImportResult,
  VariationsResult,
} from "./types";

export const adminAuthApi = {
  login: (payload: AdminLoginPayload) =>
    api.post<{ admin: AdminUser }>("/admin/auth/login", payload),
  logout: () => api.post<void>("/admin/auth/logout"),
  me: () => api.get<AdminUser>("/admin/auth/me"),
};

export const adminApi = {
  stats: () => api.get<AdminStats>("/admin/stats"),
  inventory: () => api.get<InventoryItem[]>("/admin/inventory"),
  orders: () => api.get<QueueOrder[]>("/admin/orders"),
  orderDetail: (id: string) => api.get<AdminOrder>(`/admin/orders/${id}`),
  createOrder: (payload: AdminCreateOrderPayload) => api.post<QueueOrder>("/admin/orders", payload),
  updateOrderStatus: (id: string, payload: { status: AdminOrder["status"]; note?: string }) =>
    api.put<{ ref: string; status: string; updatedAt: string; warning: string | null }>(
      `/admin/orders/${id}/status`,
      payload,
    ),
  pushOrderToQikink: (id: string) => api.post<QueueOrder>(`/admin/orders/${id}/qikink/push`),
  syncOrderFromQikink: (id: string) => api.post<QueueOrder>(`/admin/orders/${id}/qikink/sync`),
};

export const qikinkApi = {
  status: () => api.get<QikinkStatus>("/admin/qikink/status"),
  syncProducts: () => api.post<QikinkSyncResult>("/admin/qikink/sync-products"),
  syncOrders: () => api.post<QikinkSyncResult>("/admin/qikink/sync-orders"),
};

export const adminProductsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<AdminProduct[]>(
      `/admin/products${params ? `?page=${params.page ?? 1}&limit=${params.limit ?? 20}` : ""}`,
    ),
  get: (id: string) => api.get<AdminProduct>(`/admin/products/${id}`),
  create: (payload: Record<string, unknown>) => api.post<AdminProduct>("/admin/products", payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.put<AdminProduct>(`/admin/products/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/admin/products/${id}`),
  bulkCreate: (products: Record<string, unknown>[]) =>
    api.post<{
      created: AdminProduct[];
      errors: { name?: string; errors: { name?: string; message: string }[] }[];
    }>("/admin/products/bulk", {
      products,
    }),
  syncQikink: (id: string) => api.post<QikinkSyncResult>(`/admin/products/${id}/sync-qikink`),
  addVariants: (
    id: string,
    payload: {
      color: string;
      image?: string;
      sizes: { size: string; qikinkSku?: string; price?: number }[];
    },
  ) => api.post<AdminProduct>(`/admin/products/${id}/variants`, payload),
  setColourImage: (id: string, payload: { color: string; image: string }) =>
    api.put<AdminProduct>(`/admin/products/${id}/colour-image`, payload),
  setAvailability: (id: string, payload: { color: string; size?: string; enabled: boolean }) =>
    api.put<AdminProduct>(`/admin/products/${id}/availability`, payload),
  importQikinkExport: (payload: { file: string; dryRun: boolean }) =>
    api.post<QikinkExportResult>("/admin/products/qikink-export", payload),
  saveVariations: (
    id: string,
    payload: { text: string; images: Record<string, string>; dryRun: boolean },
  ) => api.post<VariationsResult>(`/admin/products/${id}/qikink-variations`, payload),
  importSheet: (payload: { file: string; dryRun: boolean }) =>
    api.post<SheetImportResult>("/admin/products/import", payload),
};

export const adminProfileApi = {
  update: (payload: AdminProfileUpdatePayload) => api.put<AdminUser>("/admin/profile", payload),
  changePassword: (payload: ChangePasswordPayload) =>
    api.put<void>("/admin/profile/password", payload),
};

export const adminCouponsApi = {
  list: () => api.get<Coupon[]>("/admin/coupons"),
  create: (payload: CouponPayload) => api.post<Coupon>("/admin/coupons", payload),
  update: (id: string, payload: CouponPayload) => api.put<Coupon>(`/admin/coupons/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/admin/coupons/${id}`),
  redemptions: (id: string) => api.get<CouponRedemption[]>(`/admin/coupons/${id}/redemptions`),
  searchCustomers: (q: string) =>
    api.get<CouponCustomer[]>(`/admin/customers/search?q=${encodeURIComponent(q)}`),
};

export const adminMembersApi = {
  list: () => api.get<TeamMember[]>("/admin/members"),
  create: (payload: { name: string; email: string; role: "admin" | "ops"; password?: string }) =>
    api.post<TeamCredentials>("/admin/members", payload),
  update: (id: string, payload: { name?: string; role?: "admin" | "ops"; active?: boolean }) =>
    api.put<TeamMember>(`/admin/members/${id}`, payload),
  resetPassword: (id: string) => api.post<TeamCredentials>(`/admin/members/${id}/reset-password`),
  remove: (id: string) => api.delete<void>(`/admin/members/${id}`),
};
