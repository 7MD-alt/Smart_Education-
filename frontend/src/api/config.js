// Single source of truth for the backend base URL.
// Set VITE_API_URL in frontend/.env (see .env.example). Falls back to local dev.
export const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api")
  .replace(/\/+$/, "");

/**
 * fetch() wrapper for endpoints axios can't handle (SSE streaming, blob
 * downloads). Prepends API_BASE and attaches the JWT — so these calls stop
 * hardcoding localhost and stop silently bypassing auth.
 */
export function authedFetch(path, options = {}) {
  const token = localStorage.getItem("access_token");
  const url = path.startsWith("http") ? path : `${API_BASE}/${path.replace(/^\/+/, "")}`;
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
