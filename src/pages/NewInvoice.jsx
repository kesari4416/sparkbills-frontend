import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError, fmtINR, API } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Plus, Search, Save, FileDown, ShieldCheck } from "lucide-react";

const DOC_TYPES = [
  { id: "invoice", label: "Tax Invoice" },
  { id: "non_gst_invoice", label: "Bill of Supply (Non-GST)" },
  { id: "quotation", label: "Quotation" },
  { id: "proforma", label: "Proforma Invoice" },
  { id: "credit_note", label: "Credit Note" },
  { id: "debit_note", label: "Debit Note" },
  { id: "sales_return", label: "Sales Return" },
];

export default function NewInvoice() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { industry } = useAuth();
  const [docType, setDocType] = useState(params.get("type") || "invoice");
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [business, setBusiness] = useState({});
  const [selectedCust, setSelectedCust] = useState(null);
  const [lines, setLines] = useState([
    { name: "", quantity: 1, rate: 0, discount_pct: 0, gst_rate: 18, cess_rate: 0, hsn_sac: "", unit: "PCS", item_id: null },
  ]);
  const [meta, setMeta] = useState({
    date: new Date().toISOString().slice(0, 10),
    due_date: "",
    notes: "",
    terms: "",
    discount_amount: 0,
    discount_pct: 0,
    service_charge_pct: 0,
    round_off: true,
    // Phase 2 - GST compliance
    reverse_charge: false,
    tds_rate: 0,
    tcs_rate: 0,
    irn: "",
    ack_no: "",
    ack_date: "",
    eway_bill_no: "",
    eway_bill_date: "",
    transport_mode: "",
    vehicle_no: "",
  });
  const [payment, setPayment] = useState({ method: "cash", amount: 0, reference: "" });
  const [itemSearch, setItemSearch] = useState("");

  useEffect(() => {
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/items").then((r) => setItems(r.data));
    api.get("/business").then((r) => setBusiness(r.data || {}));
  }, []);

  const filteredItems = useMemo(() => {
    if (!itemSearch) return items.slice(0, 15);
    const q = itemSearch.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q),
    ).slice(0, 15);
  }, [items, itemSearch]);

  const addLine = (item) => {
    setLines((prev) => [
      ...prev.filter((l) => l.name || l.item_id),
      {
        item_id: item.id, name: item.name, hsn_sac: item.hsn_sac || "",
        unit: item.unit || "PCS", quantity: 1, rate: item.sale_price || 0,
        discount_pct: 0, gst_rate: item.gst_rate || 0, cess_rate: item.cess_rate || 0,
      },
    ]);
    setItemSearch("");
  };
  const updLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const rmLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const bizStateCode = (business.gstin || "29").slice(0, 2);
  const custStateCode = selectedCust?.state_code || bizStateCode;
  const inter = custStateCode !== bizStateCode;

  const totals = useMemo(() => {
    let taxable = 0, tax = 0, cgst = 0, sgst = 0, igst = 0, cess = 0;
    lines.forEach((l) => {
      const gross = (l.quantity || 0) * (l.rate || 0);
      const disc = gross * ((l.discount_pct || 0) / 100);
      const tx = gross - disc;
      const t = docType === "non_gst_invoice" ? 0 : tx * ((l.gst_rate || 0) / 100);
      const cs = docType === "non_gst_invoice" ? 0 : tx * ((l.cess_rate || 0) / 100);
      taxable += tx;
      tax += t;
      cess += cs;
      if (inter) igst += t; else { cgst += t / 2; sgst += t / 2; }
    });
    const invDisc = (meta.discount_amount || 0) + taxable * ((meta.discount_pct || 0) / 100);
    const svc = (taxable - invDisc) * ((meta.service_charge_pct || 0) / 100);
    const taxCharged = meta.reverse_charge ? 0 : (tax + cess);
    let base = taxable - invDisc + svc + taxCharged;
    const tds = base * ((meta.tds_rate || 0) / 100);
    const tcs = base * ((meta.tcs_rate || 0) / 100);
    let grand = base - tds + tcs;
    let roundOff = 0;
    if (meta.round_off) { const r = Math.round(grand); roundOff = r - grand; grand = r; }
    return { taxable, tax, cgst, sgst, igst, cess, invDisc, svc, tds, tcs, grand, roundOff };
  }, [lines, meta, inter, docType]);

  const save = async (openPdf = false) => {
    const payload = {
      doc_type: docType, industry,
      customer_id: selectedCust?.id || null,
      customer_name: selectedCust?.name || "Walk-in Customer",
      customer_phone: selectedCust?.phone || "",
      customer_gstin: selectedCust?.gstin || "",
      customer_state: selectedCust?.state || "",
      customer_state_code: selectedCust?.state_code || "",
      date: meta.date, due_date: meta.due_date || null,
      items: lines.filter((l) => l.name && l.quantity > 0),
      discount_amount: meta.discount_amount || 0,
      discount_pct: meta.discount_pct || 0,
      service_charge_pct: meta.service_charge_pct || 0,
      round_off: meta.round_off,
      reverse_charge: meta.reverse_charge,
      tds_rate: meta.tds_rate || 0,
      tcs_rate: meta.tcs_rate || 0,
      irn: meta.irn || "",
      ack_no: meta.ack_no || "",
      ack_date: meta.ack_date || "",
      eway_bill_no: meta.eway_bill_no || "",
      eway_bill_date: meta.eway_bill_date || "",
      transport_mode: meta.transport_mode || "",
      vehicle_no: meta.vehicle_no || "",
      notes: meta.notes, terms: meta.terms,
      payments: payment.amount > 0 ? [payment] : [],
    };
    if (!payload.items.length) return toast.error("Add at least one line item");
    try {
      const { data } = await api.post("/invoices", payload);
      toast.success(`${data.number} saved`);
      if (openPdf) window.open(`${API}/invoices/${data.id}/pdf`, "_blank");
      nav(`/app/invoices/${data.id}`);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-4" data-testid="new-invoice-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">New Document</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Create Invoice</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-sm gap-2" onClick={() => save(false)} data-testid="save-btn">
            <Save className="w-4 h-4" /> Save
          </Button>
          <Button className="rounded-sm gap-2" onClick={() => save(true)} data-testid="save-print">
            <FileDown className="w-4 h-4" /> Save & Print
          </Button>
        </div>
      </div>

      <Card className="p-4 rounded-sm grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label>Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="rounded-sm mt-1" data-testid="doc-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} className="rounded-sm mt-1" data-testid="inv-date" />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" value={meta.due_date} onChange={(e) => setMeta({ ...meta, due_date: e.target.value })} className="rounded-sm mt-1" />
        </div>
        <div>
          <Label>Customer</Label>
          <Select value={selectedCust?.id || "walkin"} onValueChange={(v) => setSelectedCust(customers.find((c) => c.id === v) || null)}>
            <SelectTrigger className="rounded-sm mt-1" data-testid="cust-select"><SelectValue placeholder="Walk-in" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="walkin">Walk-in Customer</SelectItem>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Item picker */}
      <Card className="p-4 rounded-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            data-testid="item-picker"
            placeholder="Search & add item — name, SKU, or scan barcode"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredItems[0]) addLine(filteredItems[0]);
            }}
            className="pl-9 rounded-sm h-11"
          />
        </div>
        {itemSearch && (
          <div className="mt-2 border border-border rounded-sm divide-y divide-border max-h-60 overflow-y-auto scrollbar-thin">
            {filteredItems.map((it) => (
              <button
                key={it.id}
                data-testid={`pick-${it.id}`}
                onClick={() => addLine(it)}
                className="w-full flex items-center gap-3 p-2 hover:bg-accent text-left"
              >
                <Plus className="w-3 h-3 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.hsn_sac || "—"} · {it.gst_rate}% GST · Stock {it.stock}</div>
                </div>
                <div className="tabular font-semibold">{fmtINR(it.sale_price)}</div>
              </button>
            ))}
            {filteredItems.length === 0 && <div className="p-3 text-xs text-muted-foreground">No matches. Add items in Master → Items.</div>}
          </div>
        )}
      </Card>

      {/* Lines */}
      <Card className="rounded-sm overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[10px] uppercase tracking-widest">Item</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">HSN</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Qty</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Rate</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Disc%</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">GST%</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">CESS%</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Amount</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lines.map((l, idx) => {
              const gross = (l.quantity || 0) * (l.rate || 0);
              const disc = gross * ((l.discount_pct || 0) / 100);
              const tax = docType === "non_gst_invoice" ? 0 : (gross - disc) * ((l.gst_rate || 0) / 100);
              const cs = docType === "non_gst_invoice" ? 0 : (gross - disc) * ((l.cess_rate || 0) / 100);
              const amt = gross - disc + tax + cs;
              return (
                <TableRow key={idx}>
                  <TableCell><Input value={l.name} onChange={(e) => updLine(idx, { name: e.target.value })} className="rounded-sm h-8" data-testid={`line-name-${idx}`} /></TableCell>
                  <TableCell><Input value={l.hsn_sac} onChange={(e) => updLine(idx, { hsn_sac: e.target.value })} className="rounded-sm h-8 w-24" /></TableCell>
                  <TableCell><Input type="number" value={l.quantity} onChange={(e) => updLine(idx, { quantity: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-20 text-right tabular" data-testid={`line-qty-${idx}`} /></TableCell>
                  <TableCell><Input type="number" value={l.rate} onChange={(e) => updLine(idx, { rate: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-24 text-right tabular" data-testid={`line-rate-${idx}`} /></TableCell>
                  <TableCell><Input type="number" value={l.discount_pct} onChange={(e) => updLine(idx, { discount_pct: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-16 text-right tabular" /></TableCell>
                  <TableCell><Input type="number" value={l.gst_rate} onChange={(e) => updLine(idx, { gst_rate: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-16 text-right tabular" /></TableCell>
                  <TableCell><Input type="number" value={l.cess_rate || 0} onChange={(e) => updLine(idx, { cess_rate: parseFloat(e.target.value) || 0 })} className="rounded-sm h-8 w-16 text-right tabular" data-testid={`line-cess-${idx}`} /></TableCell>
                  <TableCell className="text-right tabular font-semibold">{fmtINR(amt)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => rmLine(idx)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell colSpan={9}>
                <Button variant="ghost" size="sm" className="rounded-sm gap-2" onClick={() => setLines([...lines, { name: "", quantity: 1, rate: 0, discount_pct: 0, gst_rate: 18, cess_rate: 0, hsn_sac: "", unit: "PCS" }])}>
                  <Plus className="w-3 h-3" /> Add row
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 rounded-sm lg:col-span-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Notes & Terms</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Notes</Label><Textarea value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} className="rounded-sm mt-1" rows={3} /></div>
            <div><Label>Terms</Label><Textarea value={meta.terms} onChange={(e) => setMeta({ ...meta, terms: e.target.value })} className="rounded-sm mt-1" rows={3} placeholder="Payment due in 30 days…" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div><Label>Invoice Discount ₹</Label><Input type="number" value={meta.discount_amount} onChange={(e) => setMeta({ ...meta, discount_amount: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" /></div>
            <div><Label>Discount %</Label><Input type="number" value={meta.discount_pct} onChange={(e) => setMeta({ ...meta, discount_pct: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" /></div>
            <div><Label>Service Charge %</Label><Input type="number" value={meta.service_charge_pct} onChange={(e) => setMeta({ ...meta, service_charge_pct: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" /></div>
          </div>

          <details className="mt-4 border-t border-border pt-3" data-testid="gst-compliance-section">
            <summary className="cursor-pointer flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
              <ShieldCheck className="w-3.5 h-3.5" /> GST Compliance (E-invoice, E-Way Bill, RCM, TDS/TCS)
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="rcm" checked={meta.reverse_charge}
                  onChange={(e) => setMeta({ ...meta, reverse_charge: e.target.checked })}
                  className="rounded-sm" data-testid="rcm-toggle" />
                <Label htmlFor="rcm" className="cursor-pointer">Reverse Charge Mechanism (RCM) — buyer pays GST directly to Govt.</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>TDS %</Label><Input type="number" step="0.01" value={meta.tds_rate}
                  onChange={(e) => setMeta({ ...meta, tds_rate: parseFloat(e.target.value) || 0 })}
                  className="rounded-sm mt-1" data-testid="tds-rate" placeholder="e.g. 2 for contractors" /></div>
                <div><Label>TCS %</Label><Input type="number" step="0.01" value={meta.tcs_rate}
                  onChange={(e) => setMeta({ ...meta, tcs_rate: parseFloat(e.target.value) || 0 })}
                  className="rounded-sm mt-1" data-testid="tcs-rate" placeholder="e.g. 0.1 for scrap sales" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3"><Label>IRN (E-invoice Reference Number)</Label>
                  <Input value={meta.irn} onChange={(e) => setMeta({ ...meta, irn: e.target.value })}
                    className="rounded-sm mt-1 font-mono text-xs" placeholder="64-char IRN from GSTN portal" data-testid="irn-field" /></div>
                <div><Label>Ack No.</Label><Input value={meta.ack_no}
                  onChange={(e) => setMeta({ ...meta, ack_no: e.target.value })} className="rounded-sm mt-1" /></div>
                <div><Label>Ack Date</Label><Input type="date" value={meta.ack_date}
                  onChange={(e) => setMeta({ ...meta, ack_date: e.target.value })} className="rounded-sm mt-1" /></div>
                <div><Label>E-Way Bill No.</Label><Input value={meta.eway_bill_no}
                  onChange={(e) => setMeta({ ...meta, eway_bill_no: e.target.value })} className="rounded-sm mt-1" data-testid="eway-no" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>E-Way Bill Date</Label><Input type="date" value={meta.eway_bill_date}
                  onChange={(e) => setMeta({ ...meta, eway_bill_date: e.target.value })} className="rounded-sm mt-1" /></div>
                <div><Label>Transport Mode</Label>
                  <Select value={meta.transport_mode || "none"} onValueChange={(v) => setMeta({ ...meta, transport_mode: v === "none" ? "" : v })}>
                    <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="road">Road</SelectItem>
                      <SelectItem value="rail">Rail</SelectItem>
                      <SelectItem value="air">Air</SelectItem>
                      <SelectItem value="ship">Ship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Vehicle No.</Label><Input value={meta.vehicle_no}
                  onChange={(e) => setMeta({ ...meta, vehicle_no: e.target.value.toUpperCase() })}
                  className="rounded-sm mt-1 uppercase" placeholder="KA01AB1234" /></div>
              </div>
            </div>
          </details>
        </Card>

        <Card className="p-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Summary</div>
          <div className="space-y-2 text-sm">
            <Row label="Taxable" value={totals.taxable} />
            <Row label="Discount" value={-totals.invDisc} />
            {totals.svc > 0 && <Row label="Service" value={totals.svc} />}
            {inter ? <Row label="IGST" value={totals.igst} /> : (<>
              <Row label="CGST" value={totals.cgst} />
              <Row label="SGST" value={totals.sgst} />
            </>)}
            {totals.cess > 0 && <Row label="CESS" value={totals.cess} />}
            {meta.reverse_charge && (totals.tax + totals.cess) > 0 && (
              <Row label="Tax under RCM (buyer pays)" value={-(totals.tax + totals.cess)} />
            )}
            {totals.tds > 0 && <Row label={`TDS (${meta.tds_rate}%)`} value={-totals.tds} />}
            {totals.tcs > 0 && <Row label={`TCS (${meta.tcs_rate}%)`} value={totals.tcs} />}
            {meta.round_off && <Row label="Round off" value={totals.roundOff} />}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-heading text-lg font-bold">
              <span>Total</span>
              <span className="tabular text-primary" data-testid="inv-grand-total">{fmtINR(totals.grand)}</span>
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-6 mb-2">Payment (optional)</div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={payment.method} onValueChange={(v) => setPayment({ ...payment, method: v })}>
              <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["cash", "upi", "card", "bank", "wallet", "cheque", "credit"].map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: parseFloat(e.target.value) || 0 })} className="rounded-sm text-right tabular" data-testid="pay-amount" />
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2 rounded-sm" onClick={() => setPayment({ ...payment, amount: totals.grand })}>
            Mark full payment ({fmtINR(totals.grand)})
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{fmtINR(value)}</span>
    </div>
  );
}
