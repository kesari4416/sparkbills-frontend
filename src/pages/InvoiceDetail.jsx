import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, fmtINR, API } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, ArrowLeft, Printer, Trash2, Mail } from "lucide-react";

export default function InvoiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState(null);
  const [pay, setPay] = useState({ method: "cash", amount: 0, reference: "" });
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/invoices/${id}`);
    setInv(data);
    setPay((p) => ({ ...p, amount: data.balance_due || 0 }));
  };
  useEffect(() => { load(); }, [id]);

  if (!inv) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const openPdf = () => window.open(`${API}/invoices/${id}/pdf`, "_blank");
  const openThermal = () => window.open(`${API}/invoices/${id}/pdf?format=thermal`, "_blank");
  const sendEmail = async () => {
    if (!emailAddr) return toast.error("Enter email");
    setSending(true);
    try {
      const { data } = await api.post(`/invoices/${id}/email`, { recipient_email: emailAddr });
      if (data?.status === "failed") {
        toast.error(data.reason || "Email failed. Try a different address.");
      } else if (data?.attachment_omitted) {
        toast.success(`Emailed ${emailAddr} (attachment blocked by provider — sent as HTML only)`);
        setEmailOpen(false);
      } else {
        toast.success(`Invoice emailed to ${emailAddr}`);
        setEmailOpen(false);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to send email");
    } finally { setSending(false); }
  };
  const addPay = async () => {
    if (!pay.amount) return;
    await api.post(`/invoices/${id}/payment`, pay);
    toast.success("Payment recorded");
    load();
  };
  const del = async () => {
    if (!confirm("Delete this invoice?")) return;
    await api.delete(`/invoices/${id}`);
    toast.success("Deleted"); nav("/app/invoices");
  };

  return (
    <div className="p-6 lg:p-8 space-y-4" data-testid="invoice-detail">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" className="rounded-sm gap-2 -ml-2" onClick={() => nav(-1)}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <div className="mt-2 flex items-baseline gap-3">
            <h1 className="font-heading text-3xl font-bold tracking-tight font-mono">{inv.number}</h1>
            <Badge variant="outline" className="rounded-sm uppercase text-[10px]">{inv.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{inv.customer_name} · {inv.date}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-sm gap-2" onClick={openPdf} data-testid="download-pdf"><Download className="w-4 h-4" /> PDF</Button>
          <Button variant="outline" className="rounded-sm gap-2" onClick={openThermal} data-testid="thermal-pdf"><Printer className="w-4 h-4" /> Thermal 80mm</Button>
          <Button
            variant="outline"
            className="rounded-sm gap-2"
            onClick={() => { setEmailAddr(inv.customer_phone && inv.customer_phone.includes("@") ? inv.customer_phone : ""); setEmailOpen(true); }}
            data-testid="email-btn"
          >
            <Mail className="w-4 h-4" /> Email
          </Button>
          <Button variant="outline" className="rounded-sm gap-2 text-destructive" onClick={del}><Trash2 className="w-4 h-4" /> Delete</Button>
        </div>
      </div>

      {emailOpen && (
        <Card className="rounded-md p-4 flex items-center gap-3 border-primary/40 bg-primary/5" data-testid="email-panel">
          <Mail className="w-5 h-5 text-primary" />
          <div className="text-sm">Send this invoice PDF to customer&apos;s email:</div>
          <input
            type="email"
            data-testid="email-input"
            value={emailAddr}
            onChange={(e) => setEmailAddr(e.target.value)}
            placeholder="customer@example.com"
            className="flex-1 h-9 rounded-md border border-border px-3 text-sm bg-white"
          />
          <Button size="sm" className="rounded-md" onClick={sendEmail} disabled={sending} data-testid="email-send">{sending ? "Sending…" : "Send"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEmailOpen(false)}>Cancel</Button>
        </Card>
      )}

      {(inv.irn || inv.eway_bill_no || inv.reverse_charge) && (
        <Card className="rounded-sm p-3 border-primary/30 bg-primary/[0.03]" data-testid="compliance-strip">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs divide-x divide-primary/40">
            {inv.irn && (
              <div className="pr-4 max-w-full overflow-hidden">
                <span className="text-muted-foreground">IRN:</span>
                <span className="font-mono ml-1 break-all">{inv.irn}</span>
              </div>
            )}
            {inv.ack_no && (
              <div className="px-4"><span className="text-muted-foreground">Ack:</span> <span className="ml-1">{inv.ack_no} · {inv.ack_date || "—"}</span></div>
            )}
            {inv.eway_bill_no && (
              <div className="px-4"><span className="text-muted-foreground">E-Way Bill:</span> <span className="font-mono ml-1">{inv.eway_bill_no}</span> · {inv.eway_bill_date || "—"}</div>
            )}
            {inv.transport_mode && (
              <div className="px-4"><span className="text-muted-foreground">Transport:</span> <span className="capitalize ml-1">{inv.transport_mode}</span> {inv.vehicle_no && `· ${inv.vehicle_no}`}</div>
            )}
            {inv.reverse_charge && (
              <div className="pl-4">
                <Badge variant="outline" className="rounded-sm border-destructive text-destructive text-[10px] uppercase">RCM Applicable</Badge>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="rounded-sm overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[10px] uppercase tracking-widest">Item</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">HSN</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Qty</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Rate</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Taxable</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">GST</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Total</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {inv.items?.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell className="text-xs">{l.hsn_sac || "—"}</TableCell>
                <TableCell className="text-right tabular">{l.quantity} {l.unit}</TableCell>
                <TableCell className="text-right tabular">{fmtINR(l.rate)}</TableCell>
                <TableCell className="text-right tabular">{fmtINR(l.taxable_amount)}</TableCell>
                <TableCell className="text-right tabular text-muted-foreground">
                  {inv.inter_state ? fmtINR(l.igst) : fmtINR((l.cgst || 0) + (l.sgst || 0))}
                </TableCell>
                <TableCell className="text-right tabular font-semibold">{fmtINR(l.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 rounded-sm lg:col-span-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Payments</div>
          {inv.payments?.length ? (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] uppercase tracking-widest">Method</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-right">Amount</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Reference</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {inv.payments.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="uppercase text-xs">{p.method}</TableCell>
                    <TableCell className="text-right tabular">{fmtINR(p.amount)}</TableCell>
                    <TableCell>{p.reference || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground py-4">No payments yet.</div>
          )}

          {inv.balance_due > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Record Payment</div>
              <div className="flex gap-2">
                <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                  <SelectTrigger className="w-32 rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cash", "upi", "card", "bank", "wallet", "cheque"].map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: parseFloat(e.target.value) || 0 })} className="w-32 rounded-sm text-right tabular" data-testid="pay-amt" />
                <Input placeholder="Reference (optional)" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} className="flex-1 rounded-sm" />
                <Button className="rounded-sm" onClick={addPay} data-testid="record-payment">Record</Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Summary</div>
          <div className="space-y-1.5 mt-3 text-sm">
            <Row label="Taxable" value={inv.total_taxable} />
            {inv.invoice_discount > 0 && <Row label="Discount" value={-inv.invoice_discount} />}
            {inv.service_charge > 0 && <Row label="Service" value={inv.service_charge} />}
            {inv.inter_state ? <Row label="IGST" value={inv.igst} /> : (<>
              <Row label="CGST" value={inv.cgst} />
              <Row label="SGST" value={inv.sgst} />
            </>)}
            {inv.cess > 0 && <Row label="CESS" value={inv.cess} />}
            {inv.reverse_charge && (inv.tax_total || 0) > 0 && (
              <Row label="Tax under RCM (buyer pays)" value={-(inv.tax_total || 0)} />
            )}
            {inv.tds_amount > 0 && <Row label={`TDS (${inv.tds_rate}%)`} value={-inv.tds_amount} />}
            {inv.tcs_amount > 0 && <Row label={`TCS (${inv.tcs_rate}%)`} value={inv.tcs_amount} />}
            {inv.round_off !== 0 && <Row label="Round off" value={inv.round_off} />}
            <div className="border-t border-border pt-2 mt-1 flex justify-between font-heading text-lg font-bold">
              <span>Total</span>
              <span className="tabular text-primary">{fmtINR(inv.grand_total)}</span>
            </div>
            <Row label="Paid" value={inv.amount_paid} />
            <div className="flex justify-between text-destructive font-semibold pt-1">
              <span>Balance Due</span>
              <span className="tabular">{fmtINR(inv.balance_due)}</span>
            </div>
          </div>
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
