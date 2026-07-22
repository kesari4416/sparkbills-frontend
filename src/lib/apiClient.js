import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Turn a backend-relative image URL (e.g. "/api/uploads/items/xxx.png") into
// an absolute URL that the browser can fetch. Handles null/absolute URLs safely.
export function assetUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${BACKEND_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Set X-Industry header defensively both on the instance (survives HMR) and
// via the request interceptor (picks up any newer value from localStorage).
{
  const boot = typeof window !== "undefined" ? localStorage.getItem("industry") : null;
  if (boot) api.defaults.headers.common["X-Industry"] = boot;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const industry = localStorage.getItem("industry");
  if (industry) config.headers["X-Industry"] = industry;
  return config;
});

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  return String(detail);
}

export const fmtINR = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

export const fmtNum = (v) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    Number(v || 0),
  );
