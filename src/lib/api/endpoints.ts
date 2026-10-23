import { api } from "./client";
import type {
  AdminCreateOrderPayload,
  AdminLoginPayload,
  AdminOrder,
  AdminProduct,
  AdminProfileUpdatePayload,
  AdminStats,
  AdminUser,
  ChangePasswordPayload,
  InventoryItem,
  PaymentGatewayId,
  PaymentSettings,
  QikinkStatus,
  QikinkSyncResult,
  QueueOrder,
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

export const paymentsApi = {
  get: () => api.get<PaymentSettings>("/admin/payments"),
  update: (activeGateway: PaymentGatewayId) =>
    api.put<PaymentSettings>("/admin/payments", { activeGateway }),
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
};

export const adminProfileApi = {
  update: (payload: AdminProfileUpdatePayload) => api.put<AdminUser>("/admin/profile", payload),
  changePassword: (payload: ChangePasswordPayload) =>
    api.put<void>("/admin/profile/password", payload),
};
