import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Rocket, Building2, LayoutDashboard, ArrowLeft, LogOut, Sparkles, History, Layers,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/platform", label: "Platform Overview", icon: LayoutDashboard, end: true },
  { to: "/platform/tenants", label: "Clients", icon: Building2 },
  // "Client Details" is a virtual entry — highlights whenever the user is on
  // /platform/tenants/:tid (routing lives in App.js). Clicking it takes them
  // back to the Clients list where they can pick one to inspect.
  { to: "/platform/tenants", label: "Client Details", icon: Layers, matchPath: "/platform/tenants/" },
  { to: "/platform/audit", label: "Impersonation Log", icon: History },
];

export default function PlatformLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#050B1E] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-black/40 border-r border-white/5 flex flex-col" data-testid="platform-sidebar">
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 to-blue-900 shadow-lg shadow-blue-900/40">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg leading-none tracking-tight">Platform</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-blue-300/60 mt-1">
              Sparkbills Control
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            // Custom-active detection lets "Client Details" light up on the
            // detail route without stealing the highlight on the base list.
            const active = item.matchPath
              ? location.pathname.startsWith(item.matchPath)
              : item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to) && !location.pathname.startsWith("/platform/tenants/");
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => navigate(item.to)}
                data-testid={`platform-nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all text-left ${
                  active
                    ? "bg-blue-600/25 text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-500/30"
                    : "text-blue-100/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <div className="text-[10px] uppercase tracking-widest text-blue-300/70 font-semibold">
                Platform Role
              </div>
            </div>
            <div className="text-sm font-bold" data-testid="platform-role-badge">Super Admin</div>
            <div className="text-[11px] text-blue-300/60 mt-0.5">
              Cross-client access
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/5 bg-black/20 flex items-center gap-3 px-5 z-10 relative">
          <Button
            variant="outline"
            size="sm"
            className="rounded-md gap-2 h-9 bg-transparent border-white/10 hover:bg-white/5 text-white"
            onClick={() => navigate("/app")}
            data-testid="jump-to-app-btn"
          >
            <ArrowLeft className="w-4 h-4" /> My Client App
          </Button>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="platform-user-menu" className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-md hover:bg-white/5 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {(user?.name?.[0] || "S").toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-semibold leading-tight">{user?.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-blue-300/70">Super Admin</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await logout(); navigate("/login"); }} className="gap-2 cursor-pointer">
                <LogOut className="w-4 h-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin bg-[#0A1428]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
