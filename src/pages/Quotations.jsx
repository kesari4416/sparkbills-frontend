import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, FileText, Send, CheckCircle2, ArrowRight, IndianRupee, Trash2, Search, Package,
} from "lucide-react";

const STATUS_COLORS = {
  draft:     "bg-gray-500/20 text-gray-700 border-gray-500/30",
  sent:      "bg-blue-500/20 text-blue-700 border-blue-500/30",
  accepted:  "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  converted: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  expired:   "bg-rose-500/20 text-rose-700 border-rose-500/30",
};

const emptyLine = { item_id: null, name: "", hsn: "", unit: "PCS", qty: 1, price: 0, gst: 18, discount_pct: 0 };
const emptyForm = {
  customer_name: "Walk-in", customer_gstin: "", customer_phone: "",
  valid_until: "", notes: "", items: [{ ...emptyLine }], invoice_discount: 0,
};

export default function Quotations() {
  const { industry } = useAuth();
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [r, i, c] = await Promise.all([
        api.get("/quotations"),
        api.get("/items?limit=500"),
        api.get("/customers").catch(() => ({ data: [] })),
      ]);
      setRows(r.data);
      setItems(i.data || []);
      setCustomers(c.data || []);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, [industry]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => (r.number || "").toLowerCase().includes(s) || (r.customer_name || "").toLowerCase().includes(s));
  }, [q, rows]);

  const addLine = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyLine }] }));
  const updateLine = (idx, patch) => setForm((f) => ({
    ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
  }));
  const removeLine = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const pickItem = (idx, itemId) => {
    const it = items.find((i) => i.id === itemId);
    if (!it) return;
    updateLine(idx, {
      item_id: it.id, name: it.name, hsn: it.hsn || "", unit: it.unit || "PCS",
      price: it.sale_price ?? it.price ?? 0, gst: it.gst_rate ?? it.gst ?? 18,
    });
  };

  const totals = useMemo(() => {
    let sub = 0, tax = 0;
    for (const it of form.items) {
      const gross = (it.qty || 0) * (it.price || 0);
      const disc = gross * ((it.discount_pct || 0) / 100);
      const taxable = gross - disc;
      sub += taxable;
      tax += taxable * ((it.gst || 0) / 100);
    }
    const grand = sub - (form.invoice_discount || 0) + tax;
    return { sub, tax, grand };
  }, [form]);

  const openNew = () => { setForm(emptyForm); setOpen(true); };

  const save = async () => {
    if (!form.items.length || !form.items[0].name) return toast.error("Add at least one line item");
    setSaving(true);
    try {
      await api.post("/quotations", form);
      toast.success("Quotation created");
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const setStatus = async (r, status) => {
    try {
      await api.post(`/quotations/${r.id}/status?status=${status}`);
      toast.success(`Marked as ${status}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const convertToOrder = async (r) => {
    if (!window.confirm(`Convert quote ${r.number} to a Sales Order?`)) return;
    try {
      const { data } = await api.post(`/quotations/${r.id}/convert-to-order`);
      toast.success(`Order ${data.number} created`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const convertToInvoice = async (r) => {
    if (!window.confirm(`Convert quote ${r.number} directly to an Invoice?`)) return;
    try {
      const { data } = await api.post(`/quotations/${r.id}/convert-to-invoice`);
      toast.success(`Invoice ${data.number} created`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const del = async (r) => {
    if (!window.confirm(`Delete quote ${r.number}?`)) return;
    try {
      await api.delete(`/quotations/${r.id}`);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="p-8 space-y-4" data-testid="quotations-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Sales Pipeline</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Quotations</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, send, and convert quotes to orders or invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Search quote no / customer…" className="pl-9 h-10 rounded-sm min-w-[260px]"
              value={q} onChange={(e) => setQ(e.target.value)} data-testid="quotations-search" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-sm gap-2" data-testid="new-quotation-btn" onClick={openNew}>
                <Plus className="w-4 h-4" /> New Quotation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>New Quotation</DialogTitle></DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><Label>Customer</Label>
                    <Select value={form.customer_id || "walk-in"} onValueChange={(v) => {
                      if (v === "walk-in") return setForm({ ...form, customer_id: null, customer_name: "Walk-in", customer_gstin: "", customer_phone: "" });
                      const c = customers.find((x) => x.id === v);
                      if (c) setForm({ ...form, customer_id: c.id, customer_name: c.name, customer_gstin: c.gstin || "", customer_phone: c.phone || "" });
                    }}>
                      <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in customer</SelectItem>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Valid Until</Label>
                    <Input type="date" value={form.valid_until || ""} className="rounded-sm mt-1"
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">Line Items</div>
                    <Button variant="outline" size="sm" className="rounded-sm gap-1.5 h-8" onClick={addLine} data-testid="add-line">
                      <Plus className="w-3.5 h-3.5" /> Add line
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-[3fr_repeat(4,1fr)_auto] gap-2 items-end p-2 rounded-sm border border-border">
                        <div>
                          <Label className="text-[10px]">Item</Label>
                          <Select value={it.item_id || "__custom"} onValueChange={(v) => v === "__custom" ? updateLine(idx, { item_id: null }) : pickItem(idx, v)}>
                            <SelectTrigger className="rounded-sm h-8"><SelectValue placeholder="Custom" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__custom">Custom / typed</SelectItem>
                              {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input value={it.name} placeholder="Name" className="rounded-sm mt-1 h-8 text-sm"
                            onChange={(e) => updateLine(idx, { name: e.target.value })} />
                        </div>
                        <div><Label className="text-[10px]">Qty</Label>
                          <Input type="number" step="0.01" value={it.qty} className="rounded-sm h-8"
                            onChange={(e) => updateLine(idx, { qty: parseFloat(e.target.value) || 0 })} /></div>
                        <div><Label className="text-[10px]">Price</Label>
                          <Input type="number" step="0.01" value={it.price} className="rounded-sm h-8"
                            onChange={(e) => updateLine(idx, { price: parseFloat(e.target.value) || 0 })} /></div>
                        <div><Label className="text-[10px]">GST %</Label>
                          <Input type="number" step="0.01" value={it.gst} className="rounded-sm h-8"
                            onChange={(e) => updateLine(idx, { gst: parseFloat(e.target.value) || 0 })} /></div>
                        <div><Label className="text-[10px]">Disc %</Label>
                          <Input type="number" step="0.01" value={it.discount_pct} className="rounded-sm h-8"
                            onChange={(e) => updateLine(idx, { discount_pct: parseFloat(e.target.value) || 0 })} /></div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600" onClick={() => removeLine(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1"><Label>Notes</Label>
                    <Input value={form.notes} className="rounded-sm mt-1"
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="rounded-sm border border-border p-3 bg-secondary/30 text-sm space-y-1 tabular-nums">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{totals.sub.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{totals.tax.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-1 mt-1 font-bold"><span>Grand Total</span><span>₹{totals.grand.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="rounded-sm gap-2" onClick={save} disabled={saving} data-testid="save-quotation">
                  <FileText className="w-4 h-4" /> {saving ? "Saving…" : "Create Quotation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto opacity-40 mb-3" />
            {q ? `No quotes match "${q}".` : "No quotations yet — click New Quotation."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} data-testid={`quote-row-${r.id}`}>
                  <TableCell className="font-mono text-xs">{r.number}</TableCell>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell><span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-muted-foreground" />{r.items?.length || 0}</span></TableCell>
                  <TableCell className="text-right tabular-nums"><span className="flex items-center justify-end gap-1"><IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />{r.grand_total?.toFixed(2)}</span></TableCell>
                  <TableCell className="text-xs">{r.valid_until || "—"}</TableCell>
                  <TableCell><Badge className={`rounded-sm text-[10px] uppercase ${STATUS_COLORS[r.status]}`}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "draft" && (
                        <Button variant="outline" size="sm" className="h-7 rounded-sm gap-1 text-xs" onClick={() => setStatus(r, "sent")} data-testid={`send-${r.id}`}>
                          <Send className="w-3 h-3" /> Send
                        </Button>
                      )}
                      {r.status === "sent" && (
                        <Button variant="outline" size="sm" className="h-7 rounded-sm gap-1 text-xs border-emerald-500/40 text-emerald-700" onClick={() => setStatus(r, "accepted")} data-testid={`accept-${r.id}`}>
                          <CheckCircle2 className="w-3 h-3" /> Accept
                        </Button>
                      )}
                      {r.status !== "converted" && (
                        <>
                          <Button variant="outline" size="sm" className="h-7 rounded-sm gap-1 text-xs border-purple-500/40 text-purple-700" onClick={() => convertToOrder(r)} data-testid={`to-order-${r.id}`}>
                            <ArrowRight className="w-3 h-3" /> To Order
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 rounded-sm gap-1 text-xs" onClick={() => convertToInvoice(r)} data-testid={`to-invoice-${r.id}`}>
                            <ArrowRight className="w-3 h-3" /> Direct Invoice
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600" onClick={() => del(r)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {r.status === "converted" && r.converted_to_order_id && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">→ Order</span>
                      )}
                      {r.status === "converted" && r.converted_to_invoice_id && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">→ Invoice</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
