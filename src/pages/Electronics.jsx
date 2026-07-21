import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tv, Truck, ShieldCheck, TrendingUp, IndianRupee, Receipt, AlertTriangle,
  Building2, Banknote, CreditCard, Smartphone, Package,
} from "lucide-react";

const PAY = {
  cash: Banknote, upi: Smartphone, card: CreditCard, bank: Building2, credit: Receipt,
};

export default function Electronics() {
  const [dash, setDash] = useState(null);
  const nav = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get("/electronics/dashboard");
      setDash(data);
    } catch {
      setDash({
        today: { sales: 0, bills: 0, payment_methods: {} },
        low_stock: [], best_sellers: [], pending_deliveries: 0,
        upcoming_deliveries: [], expiring_warranties: [], pending_suppliers: [],
      });
    }
  };
  useEffect(() => { load(); }, []);

  const methods = useMemo(() => {
    if (!dash) return [];
    const m = dash.today.payment_methods || {};
    return ["cash", "upi", "card", "bank", "credit"].filter((k) => m[k]).map((k) => ({ k, v: m[k] }));
  }, [dash]);

  if (!dash) return <div className="p-8 text-muted-foreground">Loading electronics dashboard…</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="electronics-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Electronics & Home Appliances</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">SmartHome Board</h1>
          <p className="text-sm text-muted-foreground mt-1">Sales, deliveries, warranties &amp; supplier dues at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-sm gap-2" onClick={() => nav("/app/deliveries")} data-testid="jump-deliveries">
            <Truck className="w-4 h-4" /> Deliveries
          </Button>
          <Button variant="outline" className="rounded-sm gap-2" onClick={() => nav("/app/warranties")} data-testid="jump-warranties">
            <ShieldCheck className="w-4 h-4" /> Warranties
          </Button>
          <Button className="rounded-sm gap-2" onClick={() => nav("/app/pos")} data-testid="jump-pos">
            <Tv className="w-4 h-4" /> Open POS
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={<IndianRupee className="w-4 h-4" />} label="Today's Sales" value={fmtINR(dash.today.sales)} testid="kpi-sales" />
        <Kpi icon={<Receipt className="w-4 h-4" />} label="Bills" value={dash.today.bills} testid="kpi-bills" />
        <Kpi icon={<Truck className="w-4 h-4 text-amber-600" />} label="Pending Deliveries" value={dash.pending_deliveries} accent="amber" testid="kpi-deliveries" />
        <Kpi icon={<ShieldCheck className="w-4 h-4 text-rose-600" />} label="Expiring Warranties" value={dash.expiring_warranties.length} accent="rose" testid="kpi-warranties" />
        <Kpi icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} label="Low Stock" value={dash.low_stock.length} accent="amber" testid="kpi-low" />
        <Kpi icon={<Building2 className="w-4 h-4" />} label="Pending to Suppliers"
             value={fmtINR((dash.pending_suppliers || []).reduce((a, r) => a + (r.outstanding || 0), 0))} testid="kpi-pending" />
      </div>

      {/* Payment mix */}
      <Card className="rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <div className="font-heading font-semibold">Today&apos;s Payment Mix</div>
        </div>
        {methods.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No bills yet today. Payment mix appears after the first sale.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {methods.map(({ k, v }) => {
              const Icon = PAY[k] || Banknote;
              return (
                <div key={k} className="p-3 rounded-sm border border-border bg-secondary/30" data-testid={`pay-${k}`}>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" /> {k}
                  </div>
                  <div className="text-lg font-heading font-bold tabular text-primary mt-1">{fmtINR(v)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <Truck className="w-4 h-4 text-primary" />
            <div className="font-heading font-semibold">Upcoming Deliveries ({dash.upcoming_deliveries.length})</div>
            <Button size="sm" variant="outline" className="ml-auto rounded-sm h-7" onClick={() => nav("/app/deliveries")}>Open</Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Order #</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Customer</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Date</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.upcoming_deliveries.map((d) => (
                <TableRow key={d.id} data-testid={`up-${d.id}`}>
                  <TableCell className="font-mono text-xs">{d.delivery_no}</TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell className="text-xs">{d.scheduled_date}</TableCell>
                  <TableCell><Badge variant="outline" className="rounded-sm text-[10px] uppercase">{d.status?.replace(/_/g, " ")}</Badge></TableCell>
                </TableRow>
              ))}
              {dash.upcoming_deliveries.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No upcoming deliveries.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <div className="font-heading font-semibold">Warranties Expiring — 60 days ({dash.expiring_warranties.length})</div>
            <Button size="sm" variant="outline" className="ml-auto rounded-sm h-7" onClick={() => nav("/app/warranties")}>Open</Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Product</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Customer</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Serial</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Ends</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.expiring_warranties.map((w) => (
                <TableRow key={w.id} data-testid={`w-${w.id}`}>
                  <TableCell className="font-medium">{w.product_name}</TableCell>
                  <TableCell>{w.customer_name}</TableCell>
                  <TableCell className="font-mono text-xs">{w.serial_no || "—"}</TableCell>
                  <TableCell><Badge className="rounded-sm text-[10px] bg-rose-600 text-white">{w.warranty_end}</Badge></TableCell>
                </TableRow>
              ))}
              {dash.expiring_warranties.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No warranties expiring soon.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <div className="font-heading font-semibold">Best Sellers (30 days)</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Product</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Qty Sold</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Revenue</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.best_sellers.map((b, i) => (
                <TableRow key={i}>
                  <TableCell><span className="text-[10px] text-muted-foreground mr-2 tabular">#{i + 1}</span>{b.name}</TableCell>
                  <TableCell className="text-right tabular">{b.qty}</TableCell>
                  <TableCell className="text-right tabular font-semibold text-emerald-700">{fmtINR(b.revenue)}</TableCell>
                </TableRow>
              ))}
              {dash.best_sellers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No sales yet in the last 30 days.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div className="font-heading font-semibold">Low Stock ({dash.low_stock.length})</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Product</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Brand</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Stock</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.low_stock.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium"><Package className="w-3 h-3 inline text-muted-foreground mr-2" />{i.name}</TableCell>
                  <TableCell className="text-xs">{i.brand || "—"}</TableCell>
                  <TableCell className="text-right tabular text-destructive font-semibold">{i.stock} {i.unit}</TableCell>
                </TableRow>
              ))}
              {dash.low_stock.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Everything is well stocked.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent, testid }) {
  const border = accent === "rose" ? "border-rose-200 bg-rose-50/50"
    : accent === "amber" ? "border-amber-200 bg-amber-50/50" : "border-border";
  return (
    <Card className={`rounded-sm p-3 ${border}`} data-testid={testid}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-2xl font-heading font-bold tabular mt-1">{value}</div>
    </Card>
  );
}
