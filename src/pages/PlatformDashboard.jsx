import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Building2, Users, Receipt, Activity, TrendingUp } from "lucide-react";

const INDUSTRY_LABEL = {
  retail: "Retail",
  fruits_veg: "Fruits & Veg",
  restaurant: "Restaurant",
  cafe: "Tea & Snacks",
  textile: "Textile & Fashion",
  pharmacy: "Pharmacy",
  hardware: "Hardware Shop",
  multi: "Multi-industry",
};

export default function PlatformDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/platform/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setError(formatApiError(e)));
  }, []);

  if (error) return <div className="p-8 text-rose-400">Error: {error}</div>;
  if (!stats) return <div className="p-8 text-blue-200/60">Loading platform stats…</div>;

  const cards = [
    { k: "tenants_total",    label: "Total Clients",    icon: Building2, tint: "from-blue-500 to-blue-800" },
    { k: "tenants_active",   label: "Active",           icon: Activity,  tint: "from-emerald-500 to-emerald-800" },
    { k: "tenants_suspended",label: "Suspended",        icon: Activity,  tint: "from-rose-500 to-rose-800" },
    { k: "users_total",      label: "Users (all clients)", icon: Users,   tint: "from-purple-500 to-purple-800" },
    { k: "invoices_total",   label: "Invoices raised",  icon: Receipt,   tint: "from-amber-500 to-amber-800" },
  ];

  return (
    <div className="p-8 space-y-6 text-white" data-testid="platform-dashboard">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400">Platform Control</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Overview</h1>
        <p className="text-sm text-blue-200/60 mt-1">Cross-client metrics across every Sparkbills business.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.k} className="rounded-sm p-5 bg-white/[0.03] border-white/10 text-white">
              <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${c.tint} flex items-center justify-center mb-3 shadow-lg shadow-black/40`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-[11px] uppercase tracking-widest text-blue-200/60">{c.label}</div>
              <div className="font-heading text-3xl font-bold mt-1 tabular-nums" data-testid={`stat-${c.k}`}>
                {stats[c.k]?.toLocaleString?.() ?? stats[c.k]}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-sm p-6 bg-white/[0.03] border-white/10 text-white">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <div className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">Clients by industry lock</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats.by_industry || {}).map(([k, v]) => (
            <div key={k} className="rounded-sm border border-white/10 p-3 bg-black/30">
              <div className="text-xs text-blue-200/60">{INDUSTRY_LABEL[k] || k}</div>
              <div className="font-heading text-2xl font-bold mt-0.5">{v}</div>
            </div>
          ))}
          {Object.keys(stats.by_industry || {}).length === 0 && (
            <div className="text-sm text-blue-200/50 col-span-full">No clients yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
