import { useEffect, useState } from "react";
import { api, fmtINR } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { BarChart3, Percent, TrendingUp, FileSpreadsheet, Bike, PieChart as PieIcon, Scale, ListTree } from "lucide-react";

function useRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  return { from, to, setFrom, setTo };
}

export default function Reports() {
  const { industry } = useAuth();
  const { from, to, setFrom, setTo } = useRange();
  const [gstr1, setGstr1] = useState(null);
  const [gstr3b, setGstr3b] = useState(null);
  const [profit, setProfit] = useState(null);
  const [hsn, setHsn] = useState(null);
  const [sales, setSales] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [pl, setPl] = useState(null);
  const [bs, setBs] = useState(null);
  const [tb, setTb] = useState(null);

  const load = () => {
    const p = { from_date: from, to_date: to };
    api.get("/reports/gstr1", { params: p }).then((r) => setGstr1(r.data));
    api.get("/reports/gstr3b", { params: p }).then((r) => setGstr3b(r.data));
    api.get("/reports/profit", { params: p }).then((r) => setProfit(r.data));
    api.get("/reports/hsn-summary", { params: p }).then((r) => setHsn(r.data));
    api.get("/reports/sales-summary", { params: { ...p, group_by: "day" } }).then((r) => setSales(r.data));
    api.get("/reports/settlement", { params: p }).then((r) => setSettlement(r.data)).catch(() => setSettlement(null));
    api.get("/reports/pl", { params: p }).then((r) => setPl(r.data)).catch(() => setPl(null));
    api.get("/reports/balance-sheet", { params: { as_of: to } }).then((r) => setBs(r.data)).catch(() => setBs(null));
    api.get("/reports/trial-balance", { params: p }).then((r) => setTb(r.data)).catch(() => setTb(null));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [from, to, industry]);

  return (
    <div className="p-6 lg:p-8" data-testid="reports-page">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Reports & GST</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Analytics</h1>
      </div>

      <Card className="rounded-sm p-4 mb-4 flex items-end gap-3">
        <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-sm mt-1" data-testid="rep-from" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-sm mt-1" data-testid="rep-to" /></div>
        <Button variant="outline" className="rounded-sm" onClick={load} data-testid="rep-apply">Apply</Button>
      </Card>

      <Tabs defaultValue="gstr1">
        <TabsList className="rounded-sm">
          <TabsTrigger value="gstr1" data-testid="tab-gstr1"><Percent className="w-3.5 h-3.5 mr-2" />GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b" data-testid="tab-gstr3b"><Percent className="w-3.5 h-3.5 mr-2" />GSTR-3B</TabsTrigger>
          <TabsTrigger value="profit" data-testid="tab-profit"><TrendingUp className="w-3.5 h-3.5 mr-2" />Profit</TabsTrigger>
          <TabsTrigger value="hsn"><FileSpreadsheet className="w-3.5 h-3.5 mr-2" />HSN Summary</TabsTrigger>
          <TabsTrigger value="sales"><BarChart3 className="w-3.5 h-3.5 mr-2" />Sales</TabsTrigger>
          <TabsTrigger value="settlement" data-testid="tab-settlement"><Bike className="w-3.5 h-3.5 mr-2" />Aggregator Settlement</TabsTrigger>
          <TabsTrigger value="pl" data-testid="tab-pl"><PieIcon className="w-3.5 h-3.5 mr-2" />P&amp;L</TabsTrigger>
          <TabsTrigger value="bs" data-testid="tab-bs"><Scale className="w-3.5 h-3.5 mr-2" />Balance Sheet</TabsTrigger>
          <TabsTrigger value="tb" data-testid="tab-tb"><ListTree className="w-3.5 h-3.5 mr-2" />Trial Balance</TabsTrigger>
        </TabsList>

        {/* GSTR-1 */}
        <TabsContent value="gstr1" className="mt-4">
          {gstr1 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <Kpi label="Total Taxable" value={fmtINR(gstr1.total_taxable)} />
                <Kpi label="Total CGST" value={fmtINR(gstr1.total_cgst)} />
                <Kpi label="Total SGST" value={fmtINR(gstr1.total_sgst)} />
                <Kpi label="Total IGST" value={fmtINR(gstr1.total_igst)} />
                <Kpi label="Total CESS" value={fmtINR(gstr1.total_cess || 0)} />
              </div>
              <Card className="rounded-sm p-4 mb-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Rate-wise Summary</div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Rate</TableHead><TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">CESS</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {gstr1.rate_summary?.map((r) => (
                      <TableRow key={r.rate}>
                        <TableCell>{r.rate}%</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(r.taxable)}</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(r.cgst)}</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(r.sgst)}</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(r.igst)}</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(r.cess || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-sm overflow-hidden">
                  <div className="p-3 border-b border-border font-heading font-semibold">B2B ({gstr1.b2b?.length || 0})</div>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Invoice</TableHead><TableHead>GSTIN</TableHead><TableHead className="text-right">Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {gstr1.b2b?.map((r) => (
                        <TableRow key={r.number}>
                          <TableCell className="font-mono text-xs">{r.number}</TableCell>
                          <TableCell className="text-xs">{r.customer_gstin}</TableCell>
                          <TableCell className="text-right tabular">{fmtINR(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      {(!gstr1.b2b?.length) && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No B2B invoices</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </Card>
                <Card className="rounded-sm overflow-hidden">
                  <div className="p-3 border-b border-border font-heading font-semibold">B2C ({gstr1.b2c?.length || 0})</div>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {gstr1.b2c?.slice(0, 20).map((r) => (
                        <TableRow key={r.number}>
                          <TableCell className="font-mono text-xs">{r.number}</TableCell>
                          <TableCell className="text-xs">{r.customer_name}</TableCell>
                          <TableCell className="text-right tabular">{fmtINR(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      {(!gstr1.b2c?.length) && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No B2C invoices</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* GSTR-3B */}
        <TabsContent value="gstr3b" className="mt-4 space-y-4">
          {gstr3b && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="rounded-sm p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Outward (Sales)</div>
                  <Row label="Taxable" value={gstr3b.outward.taxable} />
                  <Row label="CGST" value={gstr3b.outward.cgst} />
                  <Row label="SGST" value={gstr3b.outward.sgst} />
                  <Row label="IGST" value={gstr3b.outward.igst} />
                </Card>
                <Card className="rounded-sm p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Inward ITC (Purchase)</div>
                  <Row label="Taxable" value={gstr3b.inward_itc.taxable} />
                  <Row label="CGST" value={gstr3b.inward_itc.cgst} />
                  <Row label="SGST" value={gstr3b.inward_itc.sgst} />
                  <Row label="IGST" value={gstr3b.inward_itc.igst} />
                </Card>
                <Card className="rounded-sm p-4 border-primary">
                  <div className="text-[10px] uppercase tracking-widest text-primary">Net Tax Payable</div>
                  <Row label="CGST" value={gstr3b.net_tax_payable.cgst} />
                  <Row label="SGST" value={gstr3b.net_tax_payable.sgst} />
                  <Row label="IGST" value={gstr3b.net_tax_payable.igst} />
                  <div className="mt-2 pt-2 border-t border-border flex justify-between font-heading font-bold">
                    <span>Total</span>
                    <span className="tabular text-primary">{fmtINR(gstr3b.net_tax_payable.total)}</span>
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="profit" className="mt-4">
          {profit && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Revenue" value={fmtINR(profit.revenue)} />
              <Kpi label="COGS" value={fmtINR(profit.cogs)} />
              <Kpi label="Gross Profit" value={fmtINR(profit.gross_profit)} />
              <Kpi label="Margin" value={`${profit.margin_pct}%`} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="hsn" className="mt-4">
          <Card className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>HSN/SAC</TableHead><TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {hsn?.rows?.map((r) => (
                  <TableRow key={r.hsn_sac}>
                    <TableCell className="font-mono">{r.hsn_sac}</TableCell>
                    <TableCell className="text-right tabular">{r.quantity}</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(r.taxable)}</TableCell>
                    <TableCell className="text-right tabular">{r.rate}%</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(r.cgst)}</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(r.sgst)}</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(r.igst)}</TableCell>
                    <TableCell className="text-right tabular font-semibold">{fmtINR(r.total)}</TableCell>
                  </TableRow>
                ))}
                {(!hsn?.rows?.length) && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No HSN data yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sales?.rows?.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell>{r.period}</TableCell>
                    <TableCell className="text-right tabular">{r.count}</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(r.tax)}</TableCell>
                    <TableCell className="text-right tabular font-semibold">{fmtINR(r.total)}</TableCell>
                  </TableRow>
                ))}
                {(!sales?.rows?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">No sales in this range.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Aggregator Settlement */}
        <TabsContent value="settlement" className="mt-4">
          {settlement && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Kpi label="Orders" value={settlement.totals.orders} />
                <Kpi label="Gross Sales" value={fmtINR(settlement.totals.gross)} />
                <Kpi label="Platform Commission" value={fmtINR(settlement.totals.commission)} />
                <Kpi label="Pending Payout" value={fmtINR(settlement.totals.pending)} />
              </div>
              <Card className="rounded-sm overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net Payout</TableHead>
                    <TableHead className="text-right">Settled</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {settlement.platforms?.map((p) => (
                      <TableRow key={p.platform}>
                        <TableCell className="capitalize font-medium">{p.platform}</TableCell>
                        <TableCell className="text-right tabular">{p.orders}</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(p.gross)}</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(p.discount)}</TableCell>
                        <TableCell className="text-right tabular">{fmtINR(p.tax)}</TableCell>
                        <TableCell className="text-right tabular text-destructive">{fmtINR(p.commission)}</TableCell>
                        <TableCell className="text-right tabular font-semibold">{fmtINR(p.net_payout)}</TableCell>
                        <TableCell className="text-right tabular text-emerald-600">{fmtINR(p.settled)}</TableCell>
                        <TableCell className="text-right tabular text-amber-600">{fmtINR(p.pending)}</TableCell>
                      </TableRow>
                    ))}
                    {(!settlement.platforms?.length) && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                        No aggregator orders. Wire Swiggy/Zomato webhooks in Settings, or use &ldquo;Simulate Order&rdquo; to test.
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        {/* P&L */}
        <TabsContent value="pl" className="mt-4">
          {pl && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-emerald-700 mb-3">Income</div>
                <Row label="Sales Revenue" value={pl.revenue} />
                <Row label="Other Income" value={pl.other_income} />
                <div className="border-t border-border mt-3 pt-3 flex justify-between text-lg font-heading font-bold">
                  <span>Total Income</span><span className="tabular text-emerald-600">{fmtINR(pl.total_income)}</span>
                </div>
              </Card>
              <Card className="rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-destructive mb-3">Expenses</div>
                <Row label="Cost of Goods Sold" value={pl.cogs} />
                {pl.expenses_by_category?.map((c) => (
                  <Row key={c.category} label={c.category || "Uncategorised"} value={c.amount} />
                ))}
                <div className="border-t border-border mt-3 pt-3 flex justify-between text-lg font-heading font-bold">
                  <span>Total Expenses</span><span className="tabular text-destructive">{fmtINR(pl.total_expenses)}</span>
                </div>
              </Card>
              <Card className="rounded-sm p-6 md:col-span-2 bg-primary/[0.03]">
                <div className="flex justify-between items-baseline">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-primary">Net Profit / (Loss)</div>
                    <div className="text-xs text-muted-foreground mt-1">{from} → {to}</div>
                  </div>
                  <div className={`font-heading text-3xl font-bold tabular ${pl.net_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {fmtINR(pl.net_profit)}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="bs" className="mt-4">
          {bs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-emerald-700 mb-3">Assets (as of {bs.as_of})</div>
                <Row label="Cash on Hand" value={bs.assets.cash} />
                <Row label="Bank Balance" value={bs.assets.bank} />
                <Row label="Accounts Receivable" value={bs.assets.receivables} />
                <Row label="Closing Stock (at cost)" value={bs.assets.stock} />
                <div className="border-t border-border mt-3 pt-3 flex justify-between text-lg font-heading font-bold">
                  <span>Total Assets</span><span className="tabular text-emerald-600">{fmtINR(bs.assets.total)}</span>
                </div>
              </Card>
              <Card className="rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-destructive mb-3">Liabilities &amp; Equity</div>
                <Row label="Accounts Payable" value={bs.liabilities.payables} />
                <Row label="GST Payable" value={bs.liabilities.gst_payable} />
                <div className="border-t border-border pt-2 mt-2">
                  <Row label="Retained Earnings" value={bs.equity.retained_earnings} />
                </div>
                <div className="border-t border-border mt-3 pt-3 flex justify-between text-lg font-heading font-bold">
                  <span>Total Liabilities + Equity</span><span className="tabular">{fmtINR(bs.liabilities.total + bs.equity.total)}</span>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Trial Balance */}
        <TabsContent value="tb" className="mt-4">
          {tb && (
            <Card className="rounded-sm overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tb.rows?.map((r) => (
                    <TableRow key={r.account}>
                      <TableCell className="font-medium">{r.account}</TableCell>
                      <TableCell className="text-right tabular">{r.debit ? fmtINR(r.debit) : ""}</TableCell>
                      <TableCell className="text-right tabular">{r.credit ? fmtINR(r.credit) : ""}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 font-heading font-bold">
                    <TableCell>TOTALS</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(tb.totals?.debit || 0)}</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(tb.totals?.credit || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <Card className="rounded-sm p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-heading text-2xl font-bold tabular mt-2">{value}</div>
    </Card>
  );
}
function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm mt-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{fmtINR(value)}</span>
    </div>
  );
}
