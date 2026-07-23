import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Users, Receipt, IndianRupee, LogIn,
  PauseCircle, PlayCircle, MapPin, Phone, Mail, Layers,
  Store, UtensilsCrossed, Scissors, Pill, Warehouse, Package,
  AlertTriangle, Clock,
} from "lucide-react";

// Same visual language the client's own dashboard uses. Keeps Super Admin
// mental model consistent when they toggle between "Login as" and the detail
// view (they see identical industry cards + counts).
const INDUSTRY_META = {
  restaurant:  { label: "Restaurant & Café",       icon: UtensilsCrossed, tint: "from-orange-500/20 to-orange-800/30 border-orange-500/30" },
  cafe:        { label: "Tea & Snacks",            icon: UtensilsCrossed, tint: "from-amber-500/20 to-amber-800/30 border-amber-500/30" },
  retail:      { label: "Retail & Supermarket",    icon: Store,           tint: "from-blue-500/20 to-blue-800/30 border-blue-500/30" },
  fruits_veg:  { label: "Fruits & Vegetables",     icon: Store,           tint: "from-emerald-500/20 to-emerald-800/30 border-emerald-500/30" },
  textile:     { label: "Textile & Fashion",       icon: Scissors,        tint: "from-fuchsia-500/20 to-fuchsia-800/30 border-fuchsia-500/30" },
  pharmacy:    { label: "Pharmacy",                icon: Pill,            tint: "from-rose-500/20 to-rose-800/30 border-rose-500/30" },
  hardware:    { label: "Hardware Shop",           icon: Warehouse,       tint: "from-slate-500/20 to-slate-800/30 border-slate-500/30" },
  electronics: { label: "Electronics & Appliances", icon: Package,        tint: "from-indigo-500/20 to-indigo-800/30 border-indigo-500/30" },
};

const ROLE_BADGE = {
  owner:      "bg-amber-500/20 text-amber-200 border-amber-500/40",
  admin:      "bg-blue-500/20 text-blue-200 border-blue-500/40",
  manager:    "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  cashier:    "bg-slate-500/20 text-slate-200 border-slate-500/40",
  waiter:     "bg-slate-500/20 text-slate-200 border-slate-500/40",
  kitchen:    "bg-slate-500/20 text-slate-200 border-slate-500/40",
};

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

export default function PlatformClientDetail() {
  const { tid } = useParams();
  const navigate = useNavigate();
  const { impersonateTenant } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/platform/tenants/${tid}`);
      setDetail(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tid]);

  const impersonate = async () => {
    if (!detail) return;
    if (!window.confirm(`Log in as ${detail.name}? Every action is audited.`)) return;
    setImpersonating(true);
    try {
      await impersonateTenant(tid);
      toast.success(`Now impersonating ${detail.name}`);
      navigate("/app");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setImpersonating(false); }
  };

  const toggleSuspend = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      if (detail.is_suspended) {
        await api.patch(`/platform/tenants/${tid}/activate`);
        toast.success("Client activated");
      } else {
        if (!window.confirm(`Suspend "${detail.name}"? All logins will be blocked.`)) { setBusy(false); return; }
        await api.patch(`/platform/tenants/${tid}/suspend`);
        toast.success("Client suspended");
      }
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  if (loading || !detail) {
    return <div className="p-8 text-blue-200/60" data-testid="client-detail-loading">Loading client detail…</div>;
  }

  const totals = (detail.industry_breakdown || []).reduce(
    (acc, b) => ({
      items: acc.items + (b.items || 0),
      invoices: acc.invoices + (b.invoices || 0),
      revenue: acc.revenue + (b.revenue || 0),
      lowStock: acc.lowStock + (b.low_stock || 0),
    }),
    { items: 0, invoices: 0, revenue: 0, lowStock: 0 },
  );

  return (
    <div className="p-8 space-y-6 text-white" data-testid="platform-client-detail">
      {/* Back + Header row */}
      <Button
        variant="outline"
        size="sm"
        className="rounded-md gap-2 h-8 bg-transparent border-white/10 hover:bg-white/5 text-white"
        onClick={() => navigate("/platform/tenants")}
        data-testid="client-detail-back"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400">Client Detail</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-900 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </span>
            {detail.name}
            {detail.is_suspended ? (
              <Badge className="rounded-sm text-[10px] bg-rose-500/20 text-rose-300 border-rose-500/30" data-testid="client-status">SUSPENDED</Badge>
            ) : (
              <Badge className="rounded-sm text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30" data-testid="client-status">ACTIVE</Badge>
            )}
          </h1>
          <div className="flex flex-wrap gap-4 text-xs text-blue-200/70 mt-3">
            {detail.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {detail.email}</span>}
            {detail.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {detail.phone}</span>}
            {(detail.state || detail.gstin) && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {detail.state} {detail.gstin ? `· GSTIN ${detail.gstin}` : ""}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="rounded-md gap-2 bg-blue-600 hover:bg-blue-500"
            onClick={impersonate}
            disabled={impersonating}
            data-testid="client-detail-impersonate"
          >
            <LogIn className="w-4 h-4" /> {impersonating ? "Logging in…" : "Login as this client"}
          </Button>
          <Button
            variant="outline"
            className={`rounded-md gap-2 bg-transparent ${detail.is_suspended ? "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10" : "border-amber-500/30 text-amber-300 hover:bg-amber-500/10"}`}
            onClick={toggleSuspend}
            disabled={busy}
            data-testid="client-detail-suspend"
          >
            {detail.is_suspended ? <><PlayCircle className="w-4 h-4" /> Activate</> : <><PauseCircle className="w-4 h-4" /> Suspend</>}
          </Button>
        </div>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Industries",      value: detail.allowed_industries.length, icon: Layers,     tint: "from-blue-500 to-blue-800" },
          { label: "Total Users",     value: detail.users_count,                icon: Users,      tint: "from-purple-500 to-purple-800" },
          { label: "Catalog Items",   value: totals.items,                      icon: Package,    tint: "from-amber-500 to-amber-800" },
          { label: "Invoices Raised", value: totals.invoices,                   icon: Receipt,    tint: "from-emerald-500 to-emerald-800" },
          { label: "Lifetime Revenue", value: `₹${fmt(Math.round(totals.revenue))}`, icon: IndianRupee, tint: "from-teal-500 to-teal-800" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4 rounded-lg bg-white/[0.03] border-white/10 text-white">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br ${c.tint} mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-blue-200/60">{c.label}</div>
              <div className="font-heading text-2xl font-bold tabular mt-1 leading-none">{c.value}</div>
            </Card>
          );
        })}
      </div>

      {/* Per-industry breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-blue-300" />
          <h2 className="font-heading text-lg font-semibold">Provisioned Industries</h2>
          <span className="text-xs text-blue-200/50">Each card shows what the client sees in that mode</span>
        </div>
        {detail.industry_breakdown.length === 0 ? (
          <div className="p-8 text-center text-blue-200/50 rounded-lg border border-dashed border-white/10">
            No industries provisioned yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail.industry_breakdown.map((row) => {
              const meta = INDUSTRY_META[row.industry] || { label: row.industry, icon: Store, tint: "from-slate-500/20 to-slate-800/30 border-slate-500/30" };
              const Icon = meta.icon;
              return (
                <Card
                  key={row.industry}
                  className={`p-5 rounded-lg text-white bg-gradient-to-br ${meta.tint} border`}
                  data-testid={`industry-card-${row.industry}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-md bg-black/30 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/60">{row.industry}</div>
                      <div className="font-heading font-semibold text-base leading-tight">{meta.label}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div>
                      <div className="tabular font-bold text-lg">{fmt(row.items)}</div>
                      <div className="text-[9px] uppercase tracking-widest text-white/60">Items</div>
                    </div>
                    <div>
                      <div className="tabular font-bold text-lg">{fmt(row.invoices)}</div>
                      <div className="text-[9px] uppercase tracking-widest text-white/60">Invoices</div>
                    </div>
                    <div>
                      <div className="tabular font-bold text-lg">₹{fmt(Math.round(row.revenue))}</div>
                      <div className="text-[9px] uppercase tracking-widest text-white/60">Revenue</div>
                    </div>
                  </div>
                  {row.low_stock > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-200/90">
                      <AlertTriangle className="w-3.5 h-3.5" /> {row.low_stock} items low on stock
                    </div>
                  )}
                  {row.top_items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                      <div className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Top sellers</div>
                      {row.top_items.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="truncate max-w-[140px]">{t.name || "(unnamed)"}</span>
                          <span className="tabular text-white/70">₹{fmt(Math.round(t.revenue))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Users + Recent invoices side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 rounded-lg bg-white/[0.03] border-white/10 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="font-heading text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-300" /> Users on this client
              <span className="text-xs text-blue-200/50 font-normal">({detail.users_count})</span>
            </div>
          </div>
          {detail.users.length === 0 ? (
            <div className="text-sm text-blue-200/50 py-6 text-center">No users yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-blue-300/70 text-[10px] uppercase tracking-widest">Name</TableHead>
                  <TableHead className="text-blue-300/70 text-[10px] uppercase tracking-widest">Email</TableHead>
                  <TableHead className="text-blue-300/70 text-[10px] uppercase tracking-widest">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.users.map((u) => (
                  <TableRow key={u.id} className="border-white/5" data-testid={`user-row-${u.id}`}>
                    <TableCell className="text-sm font-medium">{u.name || "—"}</TableCell>
                    <TableCell className="text-xs text-blue-200/60">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-sm text-[9px] uppercase tracking-widest ${ROLE_BADGE[u.role] || "bg-slate-500/20 text-slate-200 border-slate-500/40"}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-5 rounded-lg bg-white/[0.03] border-white/10 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="font-heading text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-300" /> Recent Invoices
            </div>
          </div>
          {detail.recent_invoices.length === 0 ? (
            <div className="text-sm text-blue-200/50 py-6 text-center">No invoices yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-blue-300/70 text-[10px] uppercase tracking-widest">Invoice</TableHead>
                  <TableHead className="text-blue-300/70 text-[10px] uppercase tracking-widest">Customer</TableHead>
                  <TableHead className="text-blue-300/70 text-[10px] uppercase tracking-widest">Industry</TableHead>
                  <TableHead className="text-blue-300/70 text-[10px] uppercase tracking-widest text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.recent_invoices.map((r) => (
                  <TableRow key={r.id} className="border-white/5" data-testid={`recent-inv-${r.id}`}>
                    <TableCell className="text-sm font-medium">{r.number || r.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{r.customer_name}</TableCell>
                    <TableCell className="text-[10px] uppercase tracking-widest text-blue-200/70">{r.industry}</TableCell>
                    <TableCell className="text-right tabular text-sm font-semibold">₹{fmt(Math.round(r.grand_total || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
