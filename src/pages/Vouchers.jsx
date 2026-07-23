import { useEffect, useState } from "react";
import { api, fmtINR, formatApiError } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Book } from "lucide-react";

const V_TYPES = [
  { id: "receipt", label: "Receipt", chip: "chip-success", inflow: true },
  { id: "payment", label: "Payment", chip: "chip-danger", inflow: false },
  { id: "expense", label: "Expense", chip: "chip-warning", inflow: false },
  { id: "income", label: "Income", chip: "chip-success", inflow: true },
  { id: "contra", label: "Contra", chip: "chip-blue", inflow: false },
  { id: "journal", label: "Journal", chip: "chip-blue", inflow: false },
];

const empty = { voucher_type: "expense", amount: 0, method: "cash",
                category: "", party_name: "", party_id: null, notes: "", reference: "",
                date: new Date().toISOString().slice(0, 10) };

export default function Vouchers() {
  const { industry } = useAuth();
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const [v, c, s] = await Promise.all([
      api.get("/vouchers"), api.get("/customers"), api.get("/suppliers"),
    ]);
    setRows(v.data); setCustomers(c.data); setSuppliers(s.data);
  };
  useEffect(() => { load(); }, [industry]);

  const save = async () => {
    if (!form.amount) return toast.error("Enter amount");
    try {
      await api.post("/vouchers", form);
      toast.success(`${V_TYPES.find((t) => t.id === form.voucher_type)?.label} recorded`);
      setOpen(false); setForm(empty); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const del = async (id) => { if (!confirm("Delete voucher?")) return; await api.delete(`/vouchers/${id}`); load(); };

  const filtered = rows.filter((r) => filter === "all" || r.voucher_type === filter);
  const totalIn = filtered.filter((r) => ["receipt", "income"].includes(r.voucher_type)).reduce((s, r) => s + r.amount, 0);
  const totalOut = filtered.filter((r) => ["payment", "expense"].includes(r.voucher_type)).reduce((s, r) => s + r.amount, 0);

  const partyOptions = form.voucher_type === "receipt" ? customers
                     : form.voucher_type === "payment" ? suppliers : [];

  return (
    <div className="p-6 lg:p-8" data-testid="vouchers-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold">Finance</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Vouchers & Expenses</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-md gap-2 gradient-brand text-white" data-testid="new-voucher-btn"><Plus className="w-4 h-4" /> New Voucher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Voucher</DialogTitle><DialogDescription>Record a receipt, payment, expense, income, contra or journal entry.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.voucher_type} onValueChange={(v) => setForm({ ...form, voucher_type: v, party_id: null, party_name: "" })}>
                  <SelectTrigger className="rounded-md mt-1" data-testid="v-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{V_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-md mt-1" />
              </div>
              <div>
                <Label>Amount ₹</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="rounded-md mt-1" data-testid="v-amount" />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger className="rounded-md mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cash", "bank", "upi", "card", "cheque", "wallet"].map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {partyOptions.length > 0 && (
                <div className="col-span-2">
                  <Label>{form.voucher_type === "receipt" ? "From Customer" : "To Supplier"}</Label>
                  <Select value={form.party_id || "none"} onValueChange={(v) => {
                    const p = partyOptions.find((x) => x.id === v);
                    setForm({ ...form, party_id: p?.id || null, party_name: p?.name || "" });
                  }}>
                    <SelectTrigger className="rounded-md mt-1" data-testid="v-party"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Cash / Walk-in</SelectItem>
                      {partyOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.voucher_type === "expense" && (
                <div className="col-span-2">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-md mt-1" placeholder="Rent / Salary / Utilities / …" list="exp-cats" />
                  <datalist id="exp-cats">
                    {["Rent", "Salary", "Utilities", "Marketing", "Travel", "Supplies", "Repairs", "Fuel", "Internet", "Taxes"].map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              )}
              <div className="col-span-2">
                <Label>Reference / Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-md mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-md">Cancel</Button>
              <Button data-testid="save-voucher" className="rounded-md" onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="p-5 rounded-xl card-elev">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full chip-success flex items-center justify-center"><ArrowDownRight className="w-5 h-5 rotate-180" /></div>
            <div className="text-xs text-muted-foreground font-medium">Total Inflow</div>
          </div>
          <div className="font-heading text-2xl font-bold tabular mt-3">{fmtINR(totalIn)}</div>
        </Card>
        <Card className="p-5 rounded-xl card-elev">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full chip-danger flex items-center justify-center"><ArrowUpRight className="w-5 h-5" /></div>
            <div className="text-xs text-muted-foreground font-medium">Total Outflow</div>
          </div>
          <div className="font-heading text-2xl font-bold tabular mt-3">{fmtINR(totalOut)}</div>
        </Card>
        <Card className="p-5 rounded-xl card-elev">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full chip-blue flex items-center justify-center"><Book className="w-5 h-5" /></div>
            <div className="text-xs text-muted-foreground font-medium">Net</div>
          </div>
          <div className={`font-heading text-2xl font-bold tabular mt-3 ${totalIn - totalOut >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {fmtINR(totalIn - totalOut)}
          </div>
        </Card>
      </div>

      <Card className="rounded-xl overflow-hidden card-elev">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="rounded-md">
              <TabsTrigger value="all">All</TabsTrigger>
              {V_TYPES.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[10px] uppercase tracking-widest">Number</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Date</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Type</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Party / Category</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Method</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Amount</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((v) => {
              const t = V_TYPES.find((x) => x.id === v.voucher_type);
              return (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.number}</TableCell>
                  <TableCell className="text-xs">{v.date}</TableCell>
                  <TableCell><Badge variant="outline" className={`rounded-md text-[10px] uppercase font-semibold ${t?.chip || ""}`}>{t?.label || v.voucher_type}</Badge></TableCell>
                  <TableCell>{v.party_name || v.category || v.notes || "—"}</TableCell>
                  <TableCell className="text-xs uppercase">{v.method}</TableCell>
                  <TableCell className={`text-right tabular font-semibold ${t?.inflow ? "text-emerald-600" : "text-rose-600"}`}>{t?.inflow ? "+" : "-"} {fmtINR(v.amount)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => del(v.id)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">No vouchers yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
