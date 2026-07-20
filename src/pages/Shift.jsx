import { useEffect, useState } from "react";
import { api, fmtINR, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Clock, DoorOpen, DoorClosed, Receipt, TrendingDown, TrendingUp } from "lucide-react";

export default function Shift() {
  const [status, setStatus] = useState(null); // {open, shift, summary}
  const [openOpen, setOpenOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [openForm, setOpenForm] = useState({ opening_float: 0, notes: "" });
  const [closeForm, setCloseForm] = useState({ actual_cash_counted: 0, cash_deposited: 0, notes: "" });
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [{ data: s }, { data: h }] = await Promise.all([
        api.get("/shifts/current/summary"),
        api.get("/shifts"),
      ]);
      setStatus(s);
      setHistory(h);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const openShift = async () => {
    setBusy(true);
    try {
      await api.post("/shifts/open", {
        opening_float: parseFloat(openForm.opening_float) || 0,
        notes: openForm.notes,
      });
      toast.success("Shift opened");
      setOpenOpen(false);
      setOpenForm({ opening_float: 0, notes: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const closeShift = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/shifts/close", {
        actual_cash_counted: parseFloat(closeForm.actual_cash_counted) || 0,
        cash_deposited: parseFloat(closeForm.cash_deposited) || 0,
        notes: closeForm.notes,
      });
      const v = data.variance;
      if (Math.abs(v) < 0.5) toast.success("Shift closed — cash balanced perfectly");
      else if (v > 0) toast.success(`Shift closed — over by ₹${v.toFixed(2)}`);
      else toast.error(`Shift closed — short by ₹${Math.abs(v).toFixed(2)}`);
      setCloseOpen(false);
      setCloseForm({ actual_cash_counted: 0, cash_deposited: 0, notes: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const s = status?.summary;

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="shift-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Operations</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Cashier Shift</h1>
        </div>
        {status?.open ? (
          <Button className="rounded-sm gap-2" onClick={() => {
            setCloseForm({ ...closeForm, actual_cash_counted: s?.expected_cash || 0 });
            setCloseOpen(true);
          }} data-testid="close-shift-btn">
            <DoorClosed className="w-4 h-4" /> Close Shift & Reconcile
          </Button>
        ) : (
          <Button className="rounded-sm gap-2" onClick={() => setOpenOpen(true)} data-testid="open-shift-btn">
            <DoorOpen className="w-4 h-4" /> Open Shift
          </Button>
        )}
      </div>

      {status?.open ? (
        <>
          <Card className="rounded-sm p-6 border-primary/40 bg-primary/[0.03]">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <Badge variant="outline" className="rounded-sm border-emerald-500 text-emerald-700 uppercase text-[10px] mb-2">
                  <Clock className="w-3 h-3 mr-1" /> Open Since {new Date(status.shift.opened_at).toLocaleString()}
                </Badge>
                <div className="font-heading text-2xl font-bold">{status.shift.user_name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Expected Cash</div>
                <div className="font-heading text-3xl font-bold tabular text-primary" data-testid="expected-cash">
                  {fmtINR(s?.expected_cash || 0)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <Kpi label="Invoices" value={s?.invoice_count || 0} icon={Receipt} />
              <Kpi label="Sales Total" value={fmtINR(s?.invoice_total || 0)} />
              <Kpi label="Cash In" value={fmtINR((s?.cash_sales || 0) + (s?.cash_in_other || 0))} icon={TrendingUp} accent="emerald" />
              <Kpi label="Cash Out" value={fmtINR(s?.cash_out || 0)} icon={TrendingDown} accent="destructive" />
            </div>
          </Card>

          <Card className="rounded-sm p-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Payments This Shift</div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {Object.entries(s?.payments_by_method || {}).map(([m, v]) => (
                  <TableRow key={m}>
                    <TableCell className="capitalize font-medium">{m}</TableCell>
                    <TableCell className="text-right tabular">{v.count}</TableCell>
                    <TableCell className="text-right tabular font-semibold">{fmtINR(v.amount)}</TableCell>
                  </TableRow>
                ))}
                {!Object.keys(s?.payments_by_method || {}).length && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No payments recorded yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : (
        <Card className="rounded-sm p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <div className="font-heading text-xl font-bold">No open shift</div>
          <div className="text-sm text-muted-foreground mt-1">Open a shift to start tracking cash sales & payments.</div>
        </Card>
      )}

      <Card className="rounded-sm overflow-hidden">
        <div className="p-4 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">Recent Shifts</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Cashier</TableHead>
            <TableHead>Opened</TableHead>
            <TableHead>Closed</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.user_name}</TableCell>
                <TableCell className="text-xs">{new Date(h.opened_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{h.closed_at ? new Date(h.closed_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right tabular">{h.final_summary?.invoice_total ? fmtINR(h.final_summary.invoice_total) : "—"}</TableCell>
                <TableCell className="text-right tabular">{h.expected_cash != null ? fmtINR(h.expected_cash) : "—"}</TableCell>
                <TableCell className="text-right tabular">{h.actual_cash_counted != null ? fmtINR(h.actual_cash_counted) : "—"}</TableCell>
                <TableCell className={`text-right tabular font-semibold ${h.variance > 0 ? "text-emerald-600" : h.variance < 0 ? "text-destructive" : ""}`}>
                  {h.variance != null ? fmtINR(h.variance) : "—"}
                </TableCell>
                <TableCell><Badge variant="outline" className={`rounded-sm uppercase text-[10px] ${h.status === "open" ? "border-emerald-500 text-emerald-700" : ""}`}>{h.status}</Badge></TableCell>
              </TableRow>
            ))}
            {!history.length && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No shifts yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Open Shift Dialog */}
      <Dialog open={openOpen} onOpenChange={setOpenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Cashier Shift</DialogTitle>
            <DialogDescription>Enter your opening cash float so we can reconcile at end of day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Opening Cash Float (₹)</Label>
              <Input type="number" value={openForm.opening_float}
                onChange={(e) => setOpenForm({ ...openForm, opening_float: e.target.value })}
                className="rounded-sm mt-1 tabular text-right" data-testid="opening-float" />
              <div className="text-[11px] text-muted-foreground mt-1">Cash present in the drawer at the start of your shift.</div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={openForm.notes}
                onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })}
                className="rounded-sm mt-1" placeholder="Morning shift, front counter..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-sm" onClick={() => setOpenOpen(false)}>Cancel</Button>
            <Button className="rounded-sm" disabled={busy} onClick={openShift} data-testid="confirm-open-shift">Open Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Close Shift & Reconcile</DialogTitle>
            <DialogDescription>Count the cash in the drawer and confirm. Variance will be recorded.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-sm">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Expected in Drawer</div>
                <div className="font-heading text-xl font-bold tabular mt-1">{fmtINR(s?.expected_cash || 0)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cash Sales</div>
                <div className="font-heading text-xl font-bold tabular mt-1">{fmtINR(s?.cash_sales || 0)}</div>
              </div>
            </div>
            <div>
              <Label>Actual Cash Counted (₹) *</Label>
              <Input type="number" value={closeForm.actual_cash_counted}
                onChange={(e) => setCloseForm({ ...closeForm, actual_cash_counted: e.target.value })}
                className="rounded-sm mt-1 tabular text-right" data-testid="actual-cash" />
            </div>
            <div>
              <Label>Cash Deposited to Safe / Bank (₹)</Label>
              <Input type="number" value={closeForm.cash_deposited}
                onChange={(e) => setCloseForm({ ...closeForm, cash_deposited: e.target.value })}
                className="rounded-sm mt-1 tabular text-right" data-testid="cash-deposited" />
              <div className="text-[11px] text-muted-foreground mt-1">Cash you removed from drawer & handed off / banked.</div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={closeForm.notes}
                onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                className="rounded-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-sm" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button className="rounded-sm" disabled={busy} onClick={closeShift} data-testid="confirm-close-shift">Close Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent }) {
  const color = accent === "emerald" ? "text-emerald-600" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card className="rounded-sm p-3 flex items-center gap-3">
      {Icon && <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-4 h-4" /></div>}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`font-heading text-lg font-bold tabular mt-0.5 ${color}`}>{value}</div>
      </div>
    </Card>
  );
}
