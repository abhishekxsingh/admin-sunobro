import { api } from "./client";
import type {
  AdminLoginPayload,
  AdminStats,
  AdminUser,
  InventoryItem,
  Product,
  QueueOrder,
} from "./types";

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

// GET /admin/products, POST /admin/products, POST /admin/products/bulk
export const productsApi = {
  list: () => api.get<Product[]>("/admin/products"),
  create: (payload: Omit<Product, "id">) => api.post<Product>("/admin/products", payload),
  bulkCreate: (products: Omit<Product, "id">[]) =>
    api.post<Product[]>("/admin/products/bulk", { products }),
};
