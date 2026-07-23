import { useEffect, useState } from "react";
import { api, fmtINR } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Users, Truck, Wallet } from "lucide-react";

export default function Ledger() {
  const { industry } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cid, setCid] = useState("");
  const [sid, setSid] = useState("");
  const [custLedger, setCustLedger] = useState(null);
  const [supLedger, setSupLedger] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);

  useEffect(() => {
    setCid("");
    setSid("");
    setCustLedger(null);
    setSupLedger(null);
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/suppliers").then((r) => setSuppliers(r.data));
    api.get("/reports/cash-flow", { params: { months: 6 } }).then((r) => setCashFlow(r.data));
  }, [industry]);
  useEffect(() => { if (cid) api.get(`/reports/customer-ledger/${cid}`).then((r) => setCustLedger(r.data)); }, [cid]);
  useEffect(() => { if (sid) api.get(`/reports/supplier-ledger/${sid}`).then((r) => setSupLedger(r.data)); }, [sid]);

  return (
    <div className="p-6 lg:p-8" data-testid="ledger-page">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold">Finance</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Ledger & Cash Flow</h1>
      </div>

      <Tabs defaultValue="cashflow">
        <TabsList className="rounded-md">
          <TabsTrigger value="cashflow" data-testid="tab-cashflow"><Wallet className="w-3.5 h-3.5 mr-2" />Cash Flow</TabsTrigger>
          <TabsTrigger value="customer" data-testid="tab-customer-ledger"><Users className="w-3.5 h-3.5 mr-2" />Customer Ledger</TabsTrigger>
          <TabsTrigger value="supplier" data-testid="tab-supplier-ledger"><Truck className="w-3.5 h-3.5 mr-2" />Supplier Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <Card className="p-5 rounded-xl card-elev">
            <div className="font-heading text-lg font-semibold mb-4">Monthly Cash Flow (Last 6 months)</div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={cashFlow?.rows || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="inflow" fill="#16A34A" radius={[4, 4, 0, 0]} name="Inflow" />
                  <Bar dataKey="outflow" fill="#DC2626" radius={[4, 4, 0, 0]} name="Outflow" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="rounded-xl overflow-hidden card-elev">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(cashFlow?.rows || []).map((r) => (
                  <TableRow key={r.month}>
                    <TableCell className="font-medium">{r.month}</TableCell>
                    <TableCell className="text-right tabular text-emerald-600">{fmtINR(r.inflow)}</TableCell>
                    <TableCell className="text-right tabular text-rose-600">{fmtINR(r.outflow)}</TableCell>
                    <TableCell className={`text-right tabular font-semibold ${r.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtINR(r.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="mt-4">
          <Card className="p-4 rounded-xl mb-3 card-elev">
            <Select value={cid} onValueChange={setCid}>
              <SelectTrigger className="rounded-md max-w-md" data-testid="cust-select"><SelectValue placeholder="Select customer to view ledger" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {fmtINR(c.balance || 0)}</SelectItem>)}</SelectContent>
            </Select>
          </Card>
          {custLedger && <LedgerTable data={custLedger} kind="Customer" />}
        </TabsContent>

        <TabsContent value="supplier" className="mt-4">
          <Card className="p-4 rounded-xl mb-3 card-elev">
            <Select value={sid} onValueChange={setSid}>
              <SelectTrigger className="rounded-md max-w-md" data-testid="sup-select"><SelectValue placeholder="Select supplier to view ledger" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {fmtINR(s.balance || 0)}</SelectItem>)}</SelectContent>
            </Select>
          </Card>
          {supLedger && <LedgerTable data={supLedger} kind="Supplier" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LedgerTable({ data, kind }) {
  const party = data.customer || data.supplier || {};
  return (
    <Card className="rounded-xl overflow-hidden card-elev">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{kind}</div>
          <div className="font-heading text-lg font-bold">{party.name}</div>
        </div>
        <div className="ml-auto flex gap-6 text-sm">
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Debit</div><div className="tabular font-semibold">{fmtINR(data.total_debit)}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Credit</div><div className="tabular font-semibold">{fmtINR(data.total_credit)}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Closing</div><div className={`tabular font-bold ${data.closing_balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmtINR(data.closing_balance)}</div></div>
        </div>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Number</TableHead><TableHead>Particulars</TableHead>
          <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(data.rows || []).map((r, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs">{r.date}</TableCell>
              <TableCell className="text-xs uppercase">{r.type}</TableCell>
              <TableCell className="font-mono text-xs">{r.number}</TableCell>
              <TableCell>{r.particulars}</TableCell>
              <TableCell className="text-right tabular">{r.debit ? fmtINR(r.debit) : "—"}</TableCell>
              <TableCell className="text-right tabular">{r.credit ? fmtINR(r.credit) : "—"}</TableCell>
              <TableCell className="text-right tabular font-semibold">{fmtINR(r.balance)}</TableCell>
            </TableRow>
          ))}
          {(data.rows || []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}
