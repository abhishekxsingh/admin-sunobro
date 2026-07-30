import { api } from "./client";
import type {
  AdminLoginPayload,
  AdminOrder,
  AdminProduct,
  AdminProfileUpdatePayload,
  AdminStats,
  AdminUser,
  ChangePasswordPayload,
  InventoryItem,
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
  updateOrderStatus: (id: string, payload: { status: AdminOrder["status"]; note?: string }) =>
    api.put<{ ref: string; status: string; updatedAt: string }>(
      `/admin/orders/${id}/status`,
      payload,
    ),
};

export const adminProductsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<AdminProduct[]>(
      `/admin/products${params ? `?page=${params.page ?? 1}&limit=${params.limit ?? 20}` : ""}`,
    ),
  get: (id: string) => api.get<AdminProduct>(`/admin/products/${id}`),
  create: (payload: Partial<Omit<AdminProduct, "id" | "createdAt" | "updatedAt">>) =>
    api.post<AdminProduct>("/admin/products", payload),
  update: (id: string, payload: Partial<Omit<AdminProduct, "id" | "createdAt" | "updatedAt">>) =>
    api.put<AdminProduct>(`/admin/products/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/admin/products/${id}`),
  bulkCreate: (products: Partial<Omit<AdminProduct, "id" | "createdAt" | "updatedAt">>[]) =>
    api.post<{ created: AdminProduct[]; errors: unknown[] }>("/admin/products/bulk", {
      products,
    }),
  syncQikink: (id: string) => api.post<QikinkSyncResult>(`/admin/products/${id}/sync-qikink`),
};

export const adminProfileApi = {
  update: (payload: AdminProfileUpdatePayload) => api.put<AdminUser>("/admin/profile", payload),
  changePassword: (payload: ChangePasswordPayload) =>
    api.put<void>("/admin/profile/password", payload),
};
