import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, fmtINR } from "@/lib/apiClient";
import {
  LayoutDashboard, Store, UtensilsCrossed, Scissors, Pill,
  Receipt, FileText, ShoppingCart, Users, Truck, Package,
  BarChart3, Settings as SettingsIcon, LogOut, ChevronDown,
  ScrollText, FileMinus, FilePlus, Undo2, Menu, Search,
  Plus, Bell, HelpCircle, Sparkles, Wallet, BookOpen, Boxes, Clock,
  ShieldCheck, Rocket, AlertTriangle, ClipboardList, Ruler,
  Tv, Truck as TruckIcon, ShieldCheck as WarrantyIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { filterNavByPermission, getSubRole, SUBROLE_LABEL, canAccess, effectiveRole } from "@/lib/permissions";

const INDUSTRIES = [
  { id: "retail", label: "Retail & Supermarket" },
  { id: "fruits_veg", label: "Fruits & Vegetables" },
  { id: "restaurant", label: "Restaurant & Café" },
  { id: "cafe", label: "Tea & Snacks Shop" },
  { id: "textile", label: "Textiles Shop" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "hardware", label: "Hardware Shop" },
  { id: "electronics", label: "Electronics & Home Appliances" },
];

// `industries` = allow-list of industry modes for the nav item.
// `labels`    = optional per-industry label override.
const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, module: "dashboard" },
  { to: "/app/pos", label: "Retail POS", icon: Store, industries: ["retail", "fruits_veg", "pharmacy", "textile", "electronics"], labels: { fruits_veg: "F&V POS", textile: "Textile POS", electronics: "Electronics POS" }, module: "pos_retail" },
  {
    to: "/app/restaurant",
    label: "POS (Restaurant)",
    icon: UtensilsCrossed,
    industries: ["restaurant", "cafe"],
    badge: "NEW",
    labels: { cafe: "Tea Shop POS" },
    module: "pos_restaurant",
  },
  { to: "/app/alterations", label: "Alterations & Tailor", icon: Scissors, industries: ["textile"], module: "alterations", badge: "NEW" },
  { to: "/app/electronics", label: "Electronics Board", icon: Tv, industries: ["electronics"], module: "dashboard", badge: "NEW" },
  { to: "/app/deliveries", label: "Deliveries & Install", icon: TruckIcon, industries: ["electronics", "hardware"], module: "deliveries", badge: "NEW" },
  { to: "/app/warranties", label: "Warranty Board", icon: WarrantyIcon, industries: ["electronics"], module: "warranties", badge: "NEW" },
  { to: "/app/pharmacy", label: "Pharmacy Board", icon: Pill, industries: ["pharmacy"], module: "pharmacy_board" },
  { to: "/app/invoices", label: "Sales", icon: Receipt, labels: { cafe: "Bills & Receipts", fruits_veg: "Bills & Receipts" }, module: "invoices" },
  { to: "/app/quotations", label: "Quotations", icon: FileText, industries: ["hardware", "textile", "electronics"], module: "quotations", badge: "NEW" },
  { to: "/app/orders", label: "Sales Orders", icon: ClipboardList, industries: ["hardware", "textile", "electronics"], module: "orders" },
  { to: "/app/purchases", label: "Purchases", icon: ShoppingCart, industries: ["retail", "fruits_veg", "restaurant", "cafe", "textile", "pharmacy", "hardware", "electronics"], module: "purchases" },
  { to: "/app/vouchers", label: "Vouchers & Expenses", icon: Wallet, module: "vouchers" },
  { to: "/app/ledger", label: "Ledger & Cash Flow", icon: BookOpen, module: "ledger" },
  { to: "/app/stock-ops", label: "Stock Operations", icon: Boxes, industries: ["retail", "fruits_veg", "restaurant", "cafe", "textile", "pharmacy", "hardware", "electronics"], labels: { fruits_veg: "Stock & Wastage" }, module: "stock_ops" },
  { to: "/app/shift", label: "Cashier Shift", icon: Clock, module: "shift" },
  { to: "/app/customers", label: "Customers", icon: Users, module: "customers" },
  { to: "/app/suppliers", label: "Suppliers", icon: Truck, industries: ["retail", "fruits_veg", "restaurant", "cafe", "textile", "pharmacy", "hardware", "electronics"], module: "suppliers" },
  { to: "/app/items", label: "Products / Items", icon: Package, labels: { cafe: "Menu Items", restaurant: "Menu Items", textile: "Textile Catalog", pharmacy: "Medicines", fruits_veg: "Produce Catalog", electronics: "Appliance Catalog" }, module: "items" },
  { to: "/app/reports", label: "GST & Reports", icon: BarChart3, module: "reports" },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon, module: "settings" },
];

// Live notifications bell — replaces the previous static "8" badge with a
// real dropdown backed by GET /api/notifications. Auto-refreshes every 60s
// so recent email sends / SMS retries are visible without a page reload.
function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setItems(Array.isArray(data) ? data : []);
    } catch { /* silent — the bell should never nag the user */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  const unread = items.filter((n) => n.status === "failed").length;
  const iconFor = (t) => (t === "email" ? "✉️" : t === "sms" ? "📱" : "🔔");
  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative w-10 h-10 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground flex-shrink-0"
          data-testid="notif-btn"
          aria-label={`${items.length} notifications`}
        >
          <Bell className="w-5 h-5" strokeWidth={1.75} />
          {items.length > 0 && (
            <span
              className={`absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center ${unread > 0 ? "bg-red-500" : "bg-blue-500"}`}
              data-testid="notif-badge"
            >
              {items.length > 99 ? "99+" : items.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[70vh] overflow-hidden" data-testid="notif-menu">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-heading">Notifications</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{items.length} total{unread ? ` · ${unread} failed` : ""}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[52vh] overflow-y-auto scrollbar-thin">
          {loading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground" data-testid="notif-empty">
              <Bell className="w-8 h-8 mx-auto opacity-30 mb-2" />
              No notifications yet. Emailed invoices and delivery attempts will show up here.
            </div>
          )}
          {items.slice(0, 25).map((n) => (
            <div key={n.id} className="px-3 py-2.5 border-b border-border last:border-0 hover:bg-secondary/40" data-testid={`notif-item-${n.id}`}>
              <div className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">{iconFor(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-medium truncate">{n.subject || `${(n.type || "notification").toUpperCase()} to ${n.recipient || "—"}`}</div>
                    <span className={`text-[9px] uppercase tracking-widest font-semibold shrink-0 ${n.status === "failed" ? "text-rose-600" : n.status === "sent" ? "text-emerald-600" : "text-muted-foreground"}`}>{n.status || "queued"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {n.recipient}{n.attachment_omitted ? " · attachment omitted" : ""}
                  </div>
                  {n.status === "failed" && n.error && (
                    <div className="text-[11px] text-rose-600 mt-1 line-clamp-2">{n.error}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



export default function AppLayout() {
  const { user, industry, changeIndustry, logout, businessPerms, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [stoppingImp, setStoppingImp] = useState(false);

  const isImpersonating = !!user?._impersonated_by_id;

  const handleStopImp = async () => {
    setStoppingImp(true);
    try {
      await stopImpersonation();
      navigate("/platform/tenants");
    } finally {
      setStoppingImp(false);
    }
  };

  const allowedIndustries = (businessPerms?.allowed_industries || []).filter(Boolean);
  const visibleIndustries = allowedIndustries.length > 0
    ? INDUSTRIES.filter((i) => allowedIndustries.includes(i.id))
    : INDUSTRIES;
  const currentIndustry = visibleIndustries.find((i) => i.id === industry) || visibleIndustries[0] || INDUSTRIES[0];
  const singleIndustry = visibleIndustries.length === 1;
  const subRole = getSubRole(user, industry);
  const effRole = effectiveRole(user, industry);
  const subRoleLabel = subRole ? SUBROLE_LABEL[subRole] : null;
  const filterItems = (items) => {
    const industryFiltered = items.filter((i) => !i.industries || i.industries.includes(industry));
    return filterNavByPermission(industryFiltered, user, industry, businessPerms);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        data-testid="app-sidebar"
        className={`${collapsed ? "w-16" : "w-60"} bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-[width] duration-200 flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-blue-900/40">
            <img src="/brand/sparkcurv-icon.png" alt="Sparkbills" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-heading font-bold text-lg leading-none text-white tracking-tight">Sparkbills</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--sidebar-muted))] mt-1">
                by SparkCurv Technologies
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2 space-y-1">
          {filterItems(NAV).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`nav-${item.to.replace(/\//g, "-").replace(/^-/, "")}`}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[hsl(var(--sidebar-active))] text-white shadow-md shadow-blue-900/30"
                      : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{(item.labels && item.labels[industry]) || item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500 text-white uppercase tracking-wider">{item.badge}</span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sub-role indicator (industry-scoped) */}
        {!collapsed && (subRoleLabel || user?.role === "admin") && (
          <div className="p-3 border-t border-white/5">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--sidebar-muted))] font-semibold">
                  {user?.role === "admin" ? "Client Admin" : "Active Sub-role"}
                </div>
              </div>
              <div className="text-sm font-bold text-white" data-testid="sidebar-subrole">
                {user?.role === "admin" ? "Admin" : (subRoleLabel || (SUBROLE_LABEL[effRole] || effRole))}
              </div>
              <div className="text-[11px] text-[hsl(var(--sidebar-muted))] mt-0.5">
                {currentIndustry.label} mode
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Impersonation banner — sticky at top */}
        {isImpersonating && (
          <div
            className="flex items-center gap-3 px-5 py-2.5 bg-amber-500 text-amber-950 border-b-2 border-amber-700 shadow-md"
            data-testid="impersonation-banner"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">
                Impersonating {user?.name} · {user?.email}
              </div>
              <div className="text-[11px] opacity-90">
                Signed in as super admin <b>{user?._impersonated_by_email}</b> — every action is audit-logged.
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleStopImp}
              disabled={stoppingImp}
              data-testid="stop-impersonation-btn"
              className="rounded-md h-9 bg-amber-950 hover:bg-amber-800 text-amber-100 gap-2 shrink-0"
            >
              <Rocket className="w-4 h-4" /> {stoppingImp ? "Returning…" : "Return to Platform"}
            </Button>
          </div>
        )}
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center gap-2 lg:gap-3 px-3 lg:px-5 topbar-shadow z-10 relative">
          <button
            data-testid="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          {singleIndustry ? (
            <div
              data-testid="industry-locked"
              className="rounded-md gap-2 h-10 px-3 min-w-[180px] lg:min-w-[220px] flex items-center justify-between border border-border bg-secondary/40 flex-shrink-0"
            >
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-sm chip-blue flex items-center justify-center text-[10px] font-bold">
                  {currentIndustry.label[0]}
                </span>
                <span className="text-sm font-semibold">{currentIndustry.label}</span>
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="industry-switcher"
                  className="rounded-md gap-2 h-10 px-3 min-w-[180px] lg:min-w-[220px] max-w-[280px] justify-between border-border bg-secondary/40 hover:bg-secondary flex-shrink-0"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-sm chip-blue flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {currentIndustry.label[0]}
                    </span>
                    <span className="text-sm font-semibold truncate">{currentIndustry.label}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[260px]">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">Switch Industry Mode</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleIndustries.map((i) => (
                  <DropdownMenuItem key={i.id} data-testid={`industry-${i.id}`} onClick={() => changeIndustry(i.id)} className="cursor-pointer">
                    {i.label}
                    {industry === i.id && <span className="ml-auto text-[10px] text-primary font-semibold">ACTIVE</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="relative w-56 lg:w-72 xl:w-96 hidden md:block flex-shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
            <Input
              data-testid="global-search"
              placeholder="Search anything…"
              className="pl-9 rounded-md h-10 bg-secondary/40 border-border focus-visible:ring-primary"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-testid="create-btn"
                size="sm"
                className="rounded-md gap-2 h-10 px-4 gradient-brand text-white hover:opacity-95 shadow-sm shadow-blue-500/20 flex-shrink-0 ml-auto"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Create <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/app/invoices/new")} className="gap-2 cursor-pointer">
                <FilePlus className="w-4 h-4" /> New Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/purchases")} className="gap-2 cursor-pointer">
                <ShoppingCart className="w-4 h-4" /> New Purchase
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/customers")} className="gap-2 cursor-pointer">
                <Users className="w-4 h-4" /> Add Customer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/items")} className="gap-2 cursor-pointer">
                <Package className="w-4 h-4" /> Add Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NotificationsBell />
          {user?.platform_role === "super_admin" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/platform")}
              data-testid="jump-to-platform-btn"
              className="rounded-md gap-2 h-10 px-3 border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 hidden md:flex"
            >
              <Rocket className="w-4 h-4" /> Platform Console
            </Button>
          )}
          <button className="w-10 h-10 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground flex-shrink-0 hidden md:flex">
            <HelpCircle className="w-5 h-5" strokeWidth={1.75} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu" className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-md hover:bg-secondary transition-colors flex-shrink-0">
                <div className="w-9 h-9 rounded-full gradient-brand text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {(user?.name?.[0] || "U").toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-semibold leading-tight">{user?.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground" data-testid="topbar-role">
                    {user?.role === "owner"
                      ? `Super Admin · ${currentIndustry.label}`
                      : user?.role === "admin"
                        ? `Admin · ${currentIndustry.label}`
                        : subRoleLabel
                          ? `${subRoleLabel} · ${currentIndustry.label}`
                          : `${SUBROLE_LABEL[effRole] || effRole} · ${currentIndustry.label}`}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="logout-btn" onClick={async () => { await logout(); navigate("/login"); }} className="gap-2 cursor-pointer">
                <LogOut className="w-4 h-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {canAccess(user, industry, location.pathname, businessPerms) ? (
            <Outlet />
          ) : (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center gap-3" data-testid="access-denied">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="font-heading text-xl font-bold">Access restricted</div>
              <div className="text-sm text-muted-foreground max-w-md">
                Your sub-role <b>{subRoleLabel}</b> in <b>{currentIndustry.label}</b> mode does not have access to this section.
                Ask your admin to update your permissions in Settings → Users.
              </div>
              <Button variant="outline" size="sm" className="mt-2 rounded-md" onClick={() => navigate("/app")}>
                Back to dashboard
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
