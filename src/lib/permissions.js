// Two-layer authorization for the frontend.
//
// Layer 1 - TENANT MODULE: business.modules[module_key] === true
// Layer 2 - USER ROLE:     business.role_permissions[user_role].includes(module_key)
//
// Owner / admin bypass both layers.
// The tenant module + role matrix are supplied by /api/permissions and cached
// on AuthContext as `businessPerms`.

export const INDUSTRY_SUBROLES = {
  restaurant: ["manager", "cashier", "waiter", "kot-chef"],
  retail: ["manager", "cashier", "stock-keeper"],
  fruits_veg: ["manager", "cashier", "stock-keeper"],
  textile: ["manager", "cashier", "salesperson", "tailor", "stock-keeper", "accountant"],
  pharmacy: ["pharmacist", "cashier"],
  hardware: ["manager", "cashier", "salesperson", "stock-keeper", "accountant"],
  cafe: ["manager", "cashier", "waiter", "kot-chef"],
  electronics: ["manager", "cashier", "salesperson", "warehouse", "technician", "accountant"],
};

export const SUBROLE_LABEL = {
  "manager": "Manager",
  "cashier": "Cashier",
  "waiter": "Waiter",
  "kot-chef": "Kitchen Staff",
  "stock-keeper": "Stock Keeper",
  "pharmacist": "Pharmacist",
  "salesperson": "Salesperson",
  "tailor": "Tailor",
  "technician": "Service Technician",
  "warehouse": "Warehouse Staff",
  "accountant": "Accountant",
};

// ---- Effective role for the currently active industry ----
export function getSubRole(user, industry) {
  if (!user) return null;
  return (user.industry_roles || {})[industry] || null;
}

export function effectiveRole(user, industry) {
  if (!user) return null;
  const sub = getSubRole(user, industry);
  return sub || user.role || null;
}

// ---- Module authorization (both layers + per-user override) ----
export function canUseModule(user, businessPerms, moduleKey, industry) {
  if (!user || !moduleKey) return false;
  // Super Admin (owner) — full bypass, sees & accesses everything.
  if (user.role === "owner") return true;

  const modules = (businessPerms && businessPerms.modules) || {};
  // Layer 1: tenant module toggle (respected by admin + all lower roles).
  if (modules[moduleKey] === false) return false;

  // Tenant Admin bypasses Layer 2 (role permissions) — full role access within enabled modules.
  if (user.role === "admin") return true;

  // Per-user override wins over role defaults.
  if (Array.isArray(user.module_permissions) && user.module_permissions.length > 0) {
    return user.module_permissions.includes(moduleKey);
  }

  const rolePerms = (businessPerms && businessPerms.role_permissions) || {};
  const role = effectiveRole(user, industry);
  if (!role) return true;
  const allowed = rolePerms[role];
  if (!allowed) return true; // unknown role (custom) — allow, don't lock users out
  return allowed.includes(moduleKey);
}

// ---- Nav filter: hide any item whose module is not authorized ----
export function filterNavByPermission(items, user, industry, businessPerms) {
  return items.filter((it) => {
    if (!it.module) return true; // legacy items without module key stay visible
    return canUseModule(user, businessPerms, it.module, industry);
  });
}

// ---- Route-path guard (used by AppLayout main content) ----
// Map each route prefix to a set of modules; ANY authorized module opens the route.
const ROUTE_MODULES = {
  "/app":            ["dashboard"],
  "/app/pos":        ["pos_retail"],
  "/app/restaurant": ["pos_restaurant", "tables", "kot", "kitchen_display", "waiter_board", "order_entry"],
  "/app/alterations":["alterations"],
  "/app/deliveries":  ["deliveries"],
  "/app/warranties":  ["warranties"],
  "/app/electronics": ["dashboard"],
  "/app/pharmacy":   ["pharmacy_board"],
  "/app/quotations": ["quotations"],
  "/app/orders":     ["orders"],
  "/app/invoices":   ["invoices", "invoice_reprint"],
  "/app/purchases":  ["purchases"],
  "/app/vouchers":   ["vouchers"],
  "/app/ledger":     ["ledger"],
  "/app/stock-ops":  ["stock_ops"],
  "/app/shift":      ["shift"],
  "/app/customers":  ["customers"],
  "/app/suppliers":  ["suppliers"],
  "/app/items":      ["items"],
  "/app/reports":    ["reports", "reports_limited"],
  "/app/settings":   ["settings", "users"],
};

function modulesForPath(routePath) {
  // Longest prefix match.
  let best = null;
  for (const prefix of Object.keys(ROUTE_MODULES)) {
    if (routePath === prefix || (prefix !== "/app" && routePath.startsWith(prefix + "/"))) {
      if (!best || prefix.length > best.length) best = prefix;
    }
  }
  if (routePath === "/app") best = "/app";
  return best ? ROUTE_MODULES[best] : null;
}

export function canAccess(user, industry, routePath, businessPerms) {
  if (!user) return false;
  if (user.role === "owner") return true;
  const modules = modulesForPath(routePath);
  if (!modules) return true; // unknown path — don't lock out
  return modules.some((m) => canUseModule(user, businessPerms, m, industry));
}
