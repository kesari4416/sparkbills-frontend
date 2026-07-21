import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  AlertTriangle, Package, Clock, Pill, Receipt, TrendingUp, IndianRupee,
  Banknote, CreditCard, Smartphone, Building2, XCircle,
} from "lucide-react";

const PAYMENT_ICONS = {
  cash: Banknote,
  upi: Smartphone,
  card: CreditCard,
  bank: Building2,
  credit: Receipt,
};

export default function Pharmacy() {
  const [dash, setDash] = useState(null);
  const nav = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get("/pharmacy/dashboard");
      setDash(data);
    } catch (e) {
      // fallback for tenants without medicine data yet — keeps UI alive
      setDash({
        today: { sales: 0, bills: 0, payment_methods: {} },
        alerts: { low_stock_count: 0, near_expiry_count: 0, expired_count: 0 },
        low_stock: [], near_expiry: [], expired: [], best_sellers: [], pending_suppliers: [],
      });
    }
  };
  useEffect(() => { load(); }, []);

  const methods = useMemo(() => {
    if (!dash) return [];
    const map = dash.today.payment_methods || {};
    return ["cash", "upi", "card", "bank", "credit"]
      .filter((m) => map[m])
      .map((m) => ({ method: m, amount: map[m] }));
  }, [dash]);

  if (!dash) {
    return <div className="p-8 text-muted-foreground">Loading pharmacy dashboard…</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="pharmacy-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Pharmacy</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Medical Store Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Today at a glance — sales, alerts, best sellers &amp; supplier dues.
          </p>
        </div>
        <Button className="rounded-sm gap-2" onClick={() => nav("/app/pos")} data-testid="open-pharma-pos">
          <Pill className="w-4 h-4" /> Open Pharmacy POS
        </Button>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi
          testid="kpi-today-sales"
          icon={<IndianRupee className="w-4 h-4" />}
          label="Today's Sales"
          value={fmtINR(dash.today.sales)}
        />
        <Kpi
          testid="kpi-today-bills"
          icon={<Receipt className="w-4 h-4" />}
          label="Bills"
          value={dash.today.bills}
        />
        <Kpi
          testid="kpi-low-stock"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          label="Low Stock"
          value={dash.alerts.low_stock_count}
          accent="amber"
        />
        <Kpi
          testid="kpi-near-expiry"
          icon={<Clock className="w-4 h-4 text-rose-600" />}
          label="Near Expiry"
          value={dash.alerts.near_expiry_count}
          accent="rose"
        />
        <Kpi
          testid="kpi-expired"
          icon={<XCircle className="w-4 h-4 text-rose-700" />}
          label="Expired"
          value={dash.alerts.expired_count}
          accent="rose"
        />
        <Kpi
          testid="kpi-pending-payments"
          icon={<Building2 className="w-4 h-4" />}
          label="Pending to Suppliers"
          value={fmtINR((dash.pending_suppliers || []).reduce((a, r) => a + (r.outstanding || 0), 0))}
        />
      </div>

      {/* Payment split */}
      <Card className="rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <div className="font-heading font-semibold">Today&apos;s Payment Mix</div>
        </div>
        {methods.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No bills yet today. When you close the first sale, the mix will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {methods.map(({ method, amount }) => {
              const Icon = PAYMENT_ICONS[method] || Banknote;
              return (
                <div key={method} className="p-3 rounded-sm border border-border bg-secondary/30" data-testid={`pay-mix-${method}`}>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    {method}
                  </div>
                  <div className="text-lg font-heading font-bold tabular text-primary mt-1">{fmtINR(amount)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock */}
        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div className="font-heading font-semibold">Low Stock ({dash.low_stock.length})</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Medicine</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Stock</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Reorder At</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.low_stock.map((i) => (
                <TableRow key={i.id} data-testid={`low-${i.id}`}>
                  <TableCell className="font-medium"><Package className="w-3 h-3 inline text-muted-foreground mr-2" />{i.name}</TableCell>
                  <TableCell className="text-right tabular text-destructive font-semibold">{i.stock} {i.unit}</TableCell>
                  <TableCell className="text-right tabular text-muted-foreground">{i.low_stock_alert}</TableCell>
                </TableRow>
              ))}
              {dash.low_stock.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">Everything is well stocked.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        {/* Near Expiry */}
        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <Clock className="w-4 h-4 text-rose-600" />
            <div className="font-heading font-semibold">Near Expiry — 90 days ({dash.near_expiry.length})</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Medicine</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Batch</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Expiry</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Qty</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.near_expiry.map((b, i) => (
                <TableRow key={`ne-${i}`} data-testid={`near-expiry-${i}`}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="font-mono text-xs">{b.batch_no}</TableCell>
                  <TableCell><Badge variant="outline" className="rounded-sm text-[10px] text-rose-700 border-rose-300 bg-rose-50">{b.expiry_date}</Badge></TableCell>
                  <TableCell className="text-right tabular">{b.qty}</TableCell>
                </TableRow>
              ))}
              {dash.near_expiry.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No batches expiring soon.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        {/* Expired */}
        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border bg-rose-50/40">
            <XCircle className="w-4 h-4 text-rose-700" />
            <div className="font-heading font-semibold">Expired ({dash.expired.length})</div>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-rose-700 font-semibold">Do not sell</span>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Medicine</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Batch</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Expiry</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Qty</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.expired.map((b, i) => (
                <TableRow key={`ex-${i}`} data-testid={`expired-${i}`}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="font-mono text-xs">{b.batch_no}</TableCell>
                  <TableCell><Badge className="rounded-sm text-[10px] bg-rose-600 text-white">{b.expiry_date}</Badge></TableCell>
                  <TableCell className="text-right tabular">{b.qty}</TableCell>
                </TableRow>
              ))}
              {dash.expired.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No expired medicines. Keep it up.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        {/* Best Sellers */}
        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <div className="font-heading font-semibold">Best Sellers (30 days)</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Medicine</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Qty Sold</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Revenue</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.best_sellers.map((b, i) => (
                <TableRow key={`bs-${i}`} data-testid={`best-seller-${i}`}>
                  <TableCell className="font-medium">
                    <span className="text-[10px] text-muted-foreground mr-2 tabular">#{i + 1}</span>
                    {b.name}
                  </TableCell>
                  <TableCell className="text-right tabular">{b.qty}</TableCell>
                  <TableCell className="text-right tabular font-semibold text-emerald-700">{fmtINR(b.revenue)}</TableCell>
                </TableRow>
              ))}
              {dash.best_sellers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">No sales in the last 30 days yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        {/* Pending Supplier Payments */}
        <Card className="rounded-sm overflow-hidden lg:col-span-2">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <div className="font-heading font-semibold">Pending Supplier Payments ({dash.pending_suppliers.length})</div>
            <Button size="sm" variant="outline" className="ml-auto rounded-sm h-7" onClick={() => nav("/app/purchases")} data-testid="jump-purchases">
              Go to Purchases
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Supplier</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Open Bills</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Outstanding</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dash.pending_suppliers.map((s, i) => (
                <TableRow key={`ps-${i}`} data-testid={`pending-${i}`}>
                  <TableCell className="font-medium">{s.supplier_name}</TableCell>
                  <TableCell className="text-right tabular">{s.bills}</TableCell>
                  <TableCell className="text-right tabular font-semibold text-rose-700">{fmtINR(s.outstanding)}</TableCell>
                </TableRow>
              ))}
              {dash.pending_suppliers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">All supplier payments settled.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ testid, icon, label, value, accent }) {
  const border = accent === "rose"
    ? "border-rose-200 bg-rose-50/50"
    : accent === "amber"
      ? "border-amber-200 bg-amber-50/50"
      : "border-border";
  return (
    <Card className={`rounded-sm p-3 ${border}`} data-testid={testid}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-heading font-bold tabular mt-1">{value}</div>
    </Card>
  );
}
