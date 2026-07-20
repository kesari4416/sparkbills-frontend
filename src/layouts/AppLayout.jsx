import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Store, UtensilsCrossed, Stethoscope, Pill,
  Receipt, FileText, ShoppingCart, Users, Truck, Package,
  BarChart3, Settings as SettingsIcon, LogOut, ChevronDown,
  ScrollText, FileMinus, FilePlus, Undo2, Menu, Search,
  Plus, Bell, HelpCircle, Sparkles, Wallet, BookOpen, Boxes, Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { filterNavByPermission, getSubRole, SUBROLE_LABEL, canAccess } from "@/lib/permissions";

const INDUSTRIES = [
  { id: "generic", label: "Kesari Enterprises" },
  { id: "retail", label: "Retail & Supermarket" },
  { id: "restaurant", label: "Restaurant & Café" },
  { id: "hospital", label: "Hospital & Clinic" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "service", label: "Service Business" },
];

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/pos", label: "Retail POS", icon: Store, industries: ["retail", "generic", "pharmacy"] },
  { to: "/app/restaurant", label: "POS (Restaurant)", icon: UtensilsCrossed, industries: ["restaurant"], badge: "NEW" },
  { to: "/app/hospital", label: "Hospital OPD", icon: Stethoscope, industries: ["hospital"] },
  { to: "/app/pharmacy", label: "Pharmacy Board", icon: Pill, industries: ["pharmacy"] },
  { to: "/app/invoices", label: "Sales", icon: Receipt },
  { to: "/app/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/app/vouchers", label: "Vouchers & Expenses", icon: Wallet },
  { to: "/app/ledger", label: "Ledger & Cash Flow", icon: BookOpen },
  { to: "/app/stock-ops", label: "Stock Operations", icon: Boxes },
  { to: "/app/shift", label: "Cashier Shift", icon: Clock },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/suppliers", label: "Suppliers", icon: Truck },
  { to: "/app/items", label: "Products / Items", icon: Package },
  { to: "/app/reports", label: "GST & Reports", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

export default function AppLayout() {
  const { user, industry, changeIndustry, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const currentIndustry = INDUSTRIES.find((i) => i.id === industry) || INDUSTRIES[0];
  const subRole = getSubRole(user, industry);
  const subRoleLabel = subRole ? SUBROLE_LABEL[subRole] : null;
  const filterItems = (items) => {
    const industryFiltered = items.filter((i) => !i.industries || i.industries.includes(industry));
    return filterNavByPermission(industryFiltered, user, industry);
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
                    <span className="truncate flex-1">{item.label}</span>
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
        {!collapsed && subRoleLabel && (
          <div className="p-3 border-t border-white/5">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--sidebar-muted))] font-semibold">
                  Active Sub-role
                </div>
              </div>
              <div className="text-sm font-bold text-white" data-testid="sidebar-subrole">
                {subRoleLabel}
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
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center gap-2 lg:gap-3 px-3 lg:px-5 topbar-shadow z-10 relative">
          <button
            data-testid="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                data-testid="industry-switcher"
                className="rounded-md gap-2 h-10 px-3 min-w-[180px] lg:min-w-[220px] justify-between border-border bg-secondary/40 hover:bg-secondary flex-shrink-0"
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-sm chip-blue flex items-center justify-center text-[10px] font-bold">
                    {currentIndustry.label[0]}
                  </span>
                  <span className="text-sm font-semibold">{currentIndustry.label}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[260px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">Switch Industry Mode</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {INDUSTRIES.map((i) => (
                <DropdownMenuItem key={i.id} data-testid={`industry-${i.id}`} onClick={() => changeIndustry(i.id)} className="cursor-pointer">
                  {i.label}
                  {industry === i.id && <span className="ml-auto text-[10px] text-primary font-semibold">ACTIVE</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1 max-w-md min-w-0 hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              data-testid="global-search"
              placeholder="Search anything…"
              className="pl-9 rounded-md h-10 bg-secondary/40 border-border focus-visible:ring-primary"
            />
          </div>

          <div className="flex-1 hidden md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-testid="create-btn"
                size="sm"
                className="rounded-md gap-2 h-10 px-4 gradient-brand text-white hover:opacity-95 shadow-sm shadow-blue-500/20 flex-shrink-0"
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

          <button className="relative w-10 h-10 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground flex-shrink-0" data-testid="notif-btn">
            <Bell className="w-5 h-5" strokeWidth={1.75} />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">8</span>
          </button>
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
                    {subRoleLabel ? `${subRoleLabel} · ${currentIndustry.label}` : `Super ${user?.role}`}
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
          {canAccess(user, industry, location.pathname) ? (
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
