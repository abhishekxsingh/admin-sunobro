/**
 * Base URL for the SunoBro admin backend. Defaults to same-origin `/api` so
 * a backend deployed behind this app (or proxied via next.config rewrites)
 * works with zero config. Point NEXT_PUBLIC_API_BASE_URL at a separate
 * origin (e.g. https://api.sunobro.com) if the backend is deployed on its
 * own host — every path below is appended to this base as-is, so keep the
 * backend's route paths matching the ones in `endpoints.ts`.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(`Could not reach backend at ${API_BASE_URL}${path}`, 0);
  }

  if (!res.ok) {
    // Never surface a raw response body — a missing backend route on this
    // same origin resolves to Next's own HTML 404/500 page, not JSON, and
    // that HTML must never end up rendered as an error message in the UI.
    let message = res.statusText || `Request failed (${res.status})`;
    if ((res.headers.get("content-type") ?? "").includes("application/json")) {
      try {
        const data = (await res.json()) as { message?: string };
        if (data?.message) message = data.message;
      } catch {
        // ignore malformed JSON body, keep the statusText fallback
      }
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
