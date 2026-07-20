// Industry-based sub-role permissions catalogue.
// Owner/admin always bypass these checks.

export const INDUSTRY_SUBROLES = {
  restaurant: ["manager", "cashier", "waiter", "kot-chef"],
  retail: ["manager", "cashier", "stock-keeper"],
  hospital: ["doctor", "receptionist", "pharmacist", "nurse"],
  pharmacy: ["pharmacist", "cashier"],
  service: ["manager", "executive"],
  generic: ["manager", "cashier"],
};

export const SUBROLE_LABEL = {
  "manager": "Manager",
  "cashier": "Cashier",
  "waiter": "Waiter",
  "kot-chef": "KOT Chef",
  "stock-keeper": "Stock Keeper",
  "doctor": "Doctor",
  "receptionist": "Receptionist",
  "pharmacist": "Pharmacist",
  "nurse": "Nurse",
  "executive": "Executive",
};

// Route allowlist per sub-role (Manager gets everything).
// If a sub-role is not listed here, only allow "dashboard".
const P = {
  dashboard: "/app",
  retailPos: "/app/pos",
  restaurantPos: "/app/restaurant",
  hospital: "/app/hospital",
  pharmacy: "/app/pharmacy",
  invoices: "/app/invoices",
  purchases: "/app/purchases",
  vouchers: "/app/vouchers",
  ledger: "/app/ledger",
  stockOps: "/app/stock-ops",
  shift: "/app/shift",
  customers: "/app/customers",
  suppliers: "/app/suppliers",
  items: "/app/items",
  reports: "/app/reports",
  settings: "/app/settings",
};

const ALL_ROUTES = Object.values(P);

const ROLE_PERMS = {
  manager: ALL_ROUTES,

  cashier: [
    P.dashboard, P.retailPos, P.restaurantPos, P.invoices,
    P.customers, P.shift, P.items,
  ],
  waiter: [
    P.dashboard, P.restaurantPos, P.customers,
  ],
  "kot-chef": [
    P.dashboard, P.restaurantPos,
  ],
  "stock-keeper": [
    P.dashboard, P.items, P.stockOps, P.purchases, P.suppliers,
  ],
  doctor: [
    P.dashboard, P.hospital, P.customers,
  ],
  receptionist: [
    P.dashboard, P.hospital, P.customers, P.invoices, P.shift,
  ],
  pharmacist: [
    P.dashboard, P.pharmacy, P.retailPos, P.items, P.stockOps, P.invoices, P.customers,
  ],
  nurse: [
    P.dashboard, P.hospital,
  ],
  executive: [
    P.dashboard, P.invoices, P.customers, P.suppliers, P.reports,
  ],
};

/**
 * Get the sub-role for a user in the given industry.
 * Returns null if user has no explicit sub-role (falls through to owner check).
 */
export function getSubRole(user, industry) {
  if (!user) return null;
  const roles = user.industry_roles || {};
  return roles[industry] || null;
}

/**
 * Check if user can access a given route path.
 * Owners/admins always allowed. Users without a sub-role for the industry
 * fall back to their base role (owner/admin get all, others get all as before).
 */
export function canAccess(user, industry, routePath) {
  if (!user) return false;
  const base = user.role;
  if (base === "owner" || base === "admin") return true;

  const sub = getSubRole(user, industry);
  // No industry sub-role assigned: preserve legacy behavior — allow all.
  if (!sub) return true;

  const allowed = ROLE_PERMS[sub] || [P.dashboard];
  // Nested paths are matched by prefix — e.g. /app/invoices/new is under /app/invoices.
  // '/app' (dashboard) must match STRICTLY to avoid swallowing every other route.
  return allowed.some((prefix) =>
    routePath === prefix ||
    (prefix !== "/app" && routePath.startsWith(prefix + "/")),
  );
}

/**
 * Filter a NAV item list by permission for the current industry.
 */
export function filterNavByPermission(items, user, industry) {
  return items.filter((it) => canAccess(user, industry, it.to));
}

export function permittedRoutes(user, industry) {
  if (!user) return [];
  if (user.role === "owner" || user.role === "admin") return ALL_ROUTES;
  const sub = getSubRole(user, industry);
  if (!sub) return ALL_ROUTES;
  return ROLE_PERMS[sub] || [P.dashboard];
}
