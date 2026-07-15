import { api } from "./client";
import type { AdminLoginPayload, AdminStats, AdminUser, InventoryItem, QueueOrder } from "./types";

// POST /admin/auth/login, POST /admin/auth/logout, GET /admin/auth/me
export const adminAuthApi = {
  login: (payload: AdminLoginPayload) =>
    api.post<{ admin: AdminUser }>("/admin/auth/login", payload),
  logout: () => api.post<void>("/admin/auth/logout"),
  me: () => api.get<AdminUser>("/admin/auth/me"),
};

// GET /admin/stats, GET /admin/inventory, GET /admin/orders
export const adminApi = {
  stats: () => api.get<AdminStats>("/admin/stats"),
  inventory: () => api.get<InventoryItem[]>("/admin/inventory"),
  orders: () => api.get<QueueOrder[]>("/admin/orders"),
};
