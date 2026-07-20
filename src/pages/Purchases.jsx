import { useEffect, useMemo, useState } from "react";
import { api, fmtINR, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, Search } from "lucide-react";

export default function Purchases() {
  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "", bill_number: "", date: new Date().toISOString().slice(0, 10),
    due_date: "", items: [], round_off: true, notes: "",
  });
  const [itemSearch, setItemSearch] = useState("");

  const load = async () => {
    const [b, s, i] = await Promise.all([
      api.get("/purchase-bills"), api.get("/suppliers"), api.get("/items"),
    ]);
    setBills(b.data); setSuppliers(s.data); setItems(i.data);
  };
  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    const s = itemSearch.toLowerCase();
    return items.filter((i) => !s || i.name.toLowerCase().includes(s)).slice(0, 15);
  }, [items, itemSearch]);

  const addLine = (it) => {
    setForm((f) => ({ ...f, items: [...f.items, {
      item_id: it.id, name: it.name, hsn_sac: it.hsn_sac || "", unit: it.unit || "PCS",
      quantity: 1, rate: it.purchase_price || 0, discount_pct: 0, gst_rate: it.gst_rate || 0,
      batch_no: "", expiry_date: "",
    }] }));
    setItemSearch("");
  };
  const updLine = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((l, i) => i === idx ? { ...l, ...patch } : l) }));
  const rmLine = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totals = useMemo(() => {
    let taxable = 0, tax = 0;
    form.items.forEach((l) => {
      const gross = l.quantity * l.rate;
      const disc = gross * (l.discount_pct / 100);
      taxable += gross - disc;
      tax += (gross - disc) * (l.gst_rate / 100);
    });
    let grand = taxable + tax;
    if (form.round_off) grand = Math.round(grand);
    return { taxable, tax, grand };
  }, [form.items, form.round_off]);

  const save = async () => {
    if (!form.items.length) return toast.error("Add items");
    try {
      const supplier = suppliers.find((s) => s.id === form.supplier_id);
      const payload = {
        ...form, supplier_name: supplier?.name || "", supplier_gstin: supplier?.gstin || "",
        supplier_state_code: supplier?.state_code || "",
      };
      await api.post("/purchase-bills", payload);
      toast.success("Purchase bill saved");
      setOpen(false); load();
      setForm({ supplier_id: "", bill_number: "", date: new Date().toISOString().slice(0, 10), due_date: "", items: [], round_off: true, notes: "" });
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="purchases-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Purchase</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Purchase Bills</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-sm gap-2" data-testid="new-purchase-btn"><Plus className="w-4 h-4" />New Purchase</Button></DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Purchase Bill</DialogTitle></DialogHeader>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label>Supplier</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger className="rounded-sm mt-1" data-testid="pb-supplier"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Supplier Bill No.</Label><Input value={form.bill_number} onChange={(e) => setForm({ ...form, bill_number: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-sm mt-1" /></div>
            </div>

            <div className="mt-4">
              <Label>Add Items</Label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input placeholder="Search item…" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="pl-9 rounded-sm" />
              </div>
              {itemSearch && (
                <div className="border border-border rounded-sm max-h-48 overflow-y-auto mt-1">
                  {filteredItems.map((it) => (
                    <button key={it.id} onClick={() => addLine(it)} className="w-full flex justify-between p-2 hover:bg-accent text-left text-sm border-b border-border last:border-0">
                      <span>{it.name}</span>
                      <span className="tabular text-muted-foreground">{fmtINR(it.purchase_price)}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-[10px] uppercase">Item</TableHead>
                    <TableHead className="text-[10px] uppercase">Batch</TableHead>
                    <TableHead className="text-[10px] uppercase">Expiry</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Qty</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Rate</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">GST%</TableHead>
                    <TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((l, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{l.name}</TableCell>
                        <TableCell><Input value={l.batch_no || ""} onChange={(e) => updLine(idx, { batch_no: e.target.value })} className="rounded-sm h-8 w-24" /></TableCell>
                        <TableCell><Input type="date" value={l.expiry_date || ""} onChange={(e) => updLine(idx, { expiry_date: e.target.value })} className="rounded-sm h-8 w-32" /></TableCell>
                        <TableCell><Input type="number" value={l.quantity} onChange={(e) => updLine(idx, { quantity: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-16 text-right tabular" /></TableCell>
                        <TableCell><Input type="number" value={l.rate} onChange={(e) => updLine(idx, { rate: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-24 text-right tabular" /></TableCell>
                        <TableCell><Input type="number" value={l.gst_rate} onChange={(e) => updLine(idx, { gst_rate: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-16 text-right tabular" /></TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => rmLine(idx)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="text-right space-y-1 mt-3 text-sm">
              <div className="flex justify-between max-w-xs ml-auto"><span className="text-muted-foreground">Taxable</span><span className="tabular">{fmtINR(totals.taxable)}</span></div>
              <div className="flex justify-between max-w-xs ml-auto"><span className="text-muted-foreground">GST</span><span className="tabular">{fmtINR(totals.tax)}</span></div>
              <div className="flex justify-between max-w-xs ml-auto font-heading text-lg font-bold pt-1 border-t border-border"><span>Total</span><span className="tabular text-primary">{fmtINR(totals.grand)}</span></div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
              <Button data-testid="save-purchase" className="rounded-sm" onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-sm overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[10px] uppercase tracking-widest">Our No.</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Supplier Bill</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Date</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Supplier</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Status</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Total</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {bills.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs"><ShoppingCart className="w-3 h-3 inline text-muted-foreground mr-2" />{b.our_number}</TableCell>
                <TableCell className="text-xs">{b.bill_number || "—"}</TableCell>
                <TableCell className="text-xs">{b.date}</TableCell>
                <TableCell>{b.supplier_name}</TableCell>
                <TableCell><Badge variant="outline" className="rounded-sm uppercase text-[10px]">{b.status}</Badge></TableCell>
                <TableCell className="text-right tabular font-semibold">{fmtINR(b.grand_total)}</TableCell>
              </TableRow>
            ))}
            {bills.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground">No purchase bills yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
