import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR, API } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  ShoppingCart, TrendingUp, Wallet, CreditCard,
  ArrowUp, ArrowDown, Calendar, Eye, Printer,
  UserPlus, Package, ReceiptText, DollarSign, Users,
  UtensilsCrossed, Stethoscope, Pill, Store, Warehouse, BarChart3,
  Circle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#8B5CF6", "#94A3B8"];

const STATUS_STYLE = {
  paid: "chip-success",
  partial: "chip-warning",
  pending: "chip-warning",
  unpaid: "chip-warning",
  overdue: "chip-danger",
  cancelled: "chip-danger",
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 text-muted-foreground" data-testid="dashboard-loading">
        Loading dashboard…
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Sales", value: data.total_sales, delta: data.sales_delta,
      icon: ShoppingCart, iconBg: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total Purchases", value: data.total_purchases, delta: data.purchases_delta,
      icon: Wallet, iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Total Receivables", value: data.outstanding_customers, delta: 8.7,
      icon: Users, iconBg: "bg-amber-100 text-amber-600",
    },
    {
      label: "Total Payables", value: data.outstanding_suppliers, delta: -5.2,
      icon: CreditCard, iconBg: "bg-rose-100 text-rose-600",
    },
    {
      label: "Net Profit", value: data.net_profit, delta: data.profit_delta,
      icon: TrendingUp, iconBg: "bg-emerald-100 text-emerald-600",
    },
  ];

  const quickActions = [
    { label: "New Invoice", icon: ReceiptText, color: "bg-blue-50 text-blue-600 border-blue-100", to: "/app/invoices/new" },
    { label: "New Purchase", icon: ShoppingCart, color: "bg-emerald-50 text-emerald-600 border-emerald-100", to: "/app/purchases" },
    { label: "Add Customer", icon: UserPlus, color: "bg-violet-50 text-violet-600 border-violet-100", to: "/app/customers" },
    { label: "Add Product", icon: Package, color: "bg-amber-50 text-amber-600 border-amber-100", to: "/app/items" },
    { label: "Receive Payment", icon: DollarSign, color: "bg-emerald-50 text-emerald-600 border-emerald-100", to: "/app/invoices" },
    { label: "Expense Entry", icon: CreditCard, color: "bg-rose-50 text-rose-600 border-rose-100", to: "/app/purchases" },
  ];

  const modules = [
    { label: "Restaurant POS", icon: UtensilsCrossed, active: true, to: "/app/restaurant" },
    { label: "Hospital Billing", icon: Stethoscope, active: false, to: "/app/hospital" },
    { label: "Pharmacy", icon: Pill, active: false, to: "/app/pharmacy" },
    { label: "Retail POS", icon: Store, active: false, to: "/app/pos" },
    { label: "Inventory", icon: Warehouse, active: true, to: "/app/items" },
    { label: "Reports", icon: BarChart3, active: true, to: "/app/reports" },
  ];

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const startDate = new Date(now); startDate.setDate(now.getDate() - 16);
  const rangeLabel = `${startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - ${dateLabel}`;

  const trendData = (data.sales_trend || []).map((t) => ({
    ...t, dateShort: t.date?.slice(5).replace("-", "/"),
  }));

  const totalPay = data.payment_split?.reduce((s, p) => s + (p.total || 0), 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="dashboard-page">
      {/* Greeting row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight">
            Good morning, {user?.name || "Admin"}!{" "}
            <span className="inline-block animate-wave">👋</span>
          </h1>
          <div className="text-sm text-muted-foreground mt-1">
            Here's what's happening with your business today.
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-border bg-card text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{rangeLabel}</span>
        </div>
      </div>

      {/* KPI cards - 5 across */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const pos = k.delta >= 0;
          return (
            <Card key={k.label} className="p-5 rounded-xl border-border bg-card card-elev card-elev-hover">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${k.iconBg}`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="text-xs text-muted-foreground font-medium">{k.label}</div>
              </div>
              <div className="font-heading text-2xl font-bold tabular mt-3 leading-none">
                {fmtINR(k.value)}
              </div>
              <div className={`text-[11px] mt-2 flex items-center gap-1 font-medium ${pos ? "text-emerald-600" : "text-rose-600"}`}>
                {pos ? <ArrowUp className="w-3 h-3" strokeWidth={2.5} /> : <ArrowDown className="w-3 h-3" strokeWidth={2.5} />}
                {Math.abs(k.delta || 0)}% <span className="text-muted-foreground font-normal">vs last 17 days</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sales Overview + Payment Mode + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 p-5 rounded-xl card-elev">
          <div className="flex items-center justify-between mb-4">
            <div className="font-heading text-base font-semibold">Sales Overview</div>
            <div className="text-xs px-2.5 py-1 rounded-md border border-border bg-secondary/50 font-medium">This Month</div>
          </div>
          <div className="h-72 -ml-2">
            <ResponsiveContainer>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dateShort" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
                  formatter={(v) => fmtINR(v)}
                />
                <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ fill: "#2563EB", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 rounded-xl card-elev">
          <div className="font-heading text-base font-semibold mb-4">Sales by Payment Mode</div>
          <div className="flex items-center gap-4">
            <div className="relative w-40 h-40 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.payment_split || []} dataKey="total" nameKey="method" innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                    {(data.payment_split || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: "white", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
                <div className="font-heading text-sm font-bold tabular">{fmtINR(totalPay)}</div>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              {(data.payment_split || []).length === 0 && <div className="text-muted-foreground text-xs">No payments yet</div>}
              {(data.payment_split || []).map((p, i) => (
                <div key={p.method} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="capitalize flex-1">{p.method}</span>
                  <span className="tabular font-semibold">{p.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-xl card-elev">
          <div className="flex items-center justify-between mb-4">
            <div className="font-heading text-base font-semibold">Top Selling Items</div>
            <button className="text-xs text-primary font-medium hover:underline" onClick={() => navigate("/app/reports")}>View All</button>
          </div>
          <div className="space-y-3">
            {(data.top_items || []).length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">Sell items to see the leaderboard</div>
            )}
            {(data.top_items || []).slice(0, 5).map((it, i) => (
              <div key={it.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{it.name}</div>
                  <div className="text-[11px] text-muted-foreground">{it.quantity} sold</div>
                </div>
                <div className="tabular font-bold text-sm">{fmtINR(it.revenue)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Invoices + Low Stock + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 p-5 rounded-xl card-elev">
          <div className="flex items-center justify-between mb-3">
            <div className="font-heading text-base font-semibold">Recent Invoices</div>
            <button className="text-xs text-primary font-medium hover:underline" onClick={() => navigate("/app/invoices")}>View All</button>
          </div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-[10px] uppercase tracking-widest h-9">Invoice</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest h-9">Customer</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest h-9 text-right">Amount</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest h-9">Status</TableHead>
              <TableHead className="h-9"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data.recent_invoices || []).slice(0, 5).map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/app/invoices/${r.id}`)}>
                  <TableCell className="font-mono text-xs text-primary font-semibold">{r.number?.split("/").pop() || r.number}</TableCell>
                  <TableCell className="text-sm">{r.customer_name}</TableCell>
                  <TableCell className="text-right tabular text-sm font-semibold">{fmtINR(r.grand_total)}</TableCell>
                  <TableCell><Badge variant="outline" className={`rounded-md text-[10px] uppercase font-semibold ${STATUS_STYLE[r.status] || ""}`}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right p-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary" onClick={() => navigate(`/app/invoices/${r.id}`)}><Eye className="w-3.5 h-3.5" /></button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary" onClick={() => window.open(`${API}/invoices/${r.id}/pdf`, "_blank")}><Printer className="w-3.5 h-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(data.recent_invoices || []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">No invoices yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5 rounded-xl card-elev">
          <div className="flex items-center justify-between mb-3">
            <div className="font-heading text-base font-semibold">Low Stock Items</div>
            <button className="text-xs text-primary font-medium hover:underline" onClick={() => navigate("/app/items")}>View All</button>
          </div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-[10px] uppercase tracking-widest h-9">Item</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest h-9 text-right">Current Stock</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest h-9 text-right">Alert Level</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data.low_stock || []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm font-medium">{l.name}</TableCell>
                  <TableCell className="text-right tabular text-sm">{l.stock} {l.unit}</TableCell>
                  <TableCell className="text-right tabular text-sm text-rose-600 font-semibold">{l.low_stock_alert} {l.unit}</TableCell>
                </TableRow>
              ))}
              {(data.low_stock || []).length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-10 text-sm text-muted-foreground">Everything is well stocked 🎯</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5 rounded-xl card-elev">
          <div className="font-heading text-base font-semibold mb-4">Quick Actions</div>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  data-testid={`quick-${a.label.toLowerCase().replace(/\s/g, "-")}`}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/60 hover:border-primary/30 transition-all flex flex-col items-center gap-2 text-center card-elev-hover"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${a.color}`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="text-xs font-medium leading-tight">{a.label}</div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Business modules bar */}
      <Card className="p-4 rounded-xl card-elev">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-[240px]">
            <div className="w-10 h-10 rounded-lg chip-blue flex items-center justify-center">
              <Circle className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <div className="font-heading text-sm font-bold">Business Modules</div>
              <div className="text-[11px] text-muted-foreground">Enable/Manage modules as per your business needs.</div>
            </div>
          </div>
          <div className="flex flex-1 gap-2 flex-wrap justify-end">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.label}
                  onClick={() => navigate(m.to)}
                  data-testid={`module-${m.label.toLowerCase().replace(/\s/g, "-")}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-md border border-border bg-secondary/40 hover:bg-secondary transition-colors"
                >
                  <Icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  <div className="text-left">
                    <div className="text-xs font-semibold leading-tight">{m.label}</div>
                    <div className={`text-[10px] uppercase tracking-widest font-semibold ${m.active ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {m.active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
