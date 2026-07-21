import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ShieldCheck, Trash2, Search, Wrench, ShieldAlert } from "lucide-react";

const STATUSES = [
  { id: "active",         label: "Active",         accent: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "expiring_soon",  label: "Expiring Soon",  accent: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "expired",        label: "Expired",        accent: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "claimed",        label: "Claimed",        accent: "bg-violet-50 text-violet-700 border-violet-200" },
];

const empty = {
  product_name: "", brand: "", model_number: "",
  serial_no: "", imei: "",
  customer_name: "", customer_phone: "",
  warranty_start: new Date().toISOString().slice(0, 10),
  warranty_months: 12,
  warranty_type: "standard",
  notes: "",
  invoice_no: "",
};

export default function Warranties() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [open, setOpen] = useState(false);
  const [claimDialog, setClaimDialog] = useState(null);
  const [claimNote, setClaimNote] = useState("");
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      const [r, s] = await Promise.all([
        api.get("/warranties"),
        api.get("/warranties-summary"),
      ]);
      setRows(r.data);
      setSummary(s.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setOpen(true); };
  const save = async () => {
    if (!form.product_name.trim()) return toast.error("Product name is required");
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    try {
      await api.post("/warranties", { ...form, warranty_months: parseInt(form.warranty_months, 10) || 12 });
      toast.success("Warranty registered");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const claim = async () => {
    try {
      await api.post(`/warranties/${claimDialog.id}/claim?note=${encodeURIComponent(claimNote || "")}`);
      toast.success("Warranty marked as claimed");
      setClaimDialog(null); setClaimNote(""); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => {
    if (!confirm("Delete this warranty entry?")) return;
    try { await api.delete(`/warranties/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const visible = useMemo(() => {
    let out = rows;
    if (filter !== "all") out = out.filter((r) => r.status === filter);
    if (q) {
      const s = q.toLowerCase();
      out = out.filter((r) =>
        r.product_name?.toLowerCase().includes(s)
        || r.customer_name?.toLowerCase().includes(s)
        || r.serial_no?.toLowerCase().includes(s)
        || r.imei?.toLowerCase().includes(s)
        || r.invoice_no?.toLowerCase().includes(s)
      );
    }
    return out;
  }, [rows, filter, q]);

  return (
    <div className="p-6 lg:p-8" data-testid="warranties-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Electronics · Warranty</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Warranty Board</h1>
          <p className="text-sm text-muted-foreground mt-1">Track serial-wise warranty for every appliance sold — never argue with a customer again.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-sm gap-2" onClick={openNew} data-testid="new-warranty-btn">
              <Plus className="w-4 h-4" /> Register Warranty
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Warranty</DialogTitle>
              <DialogDescription>Log the serial / IMEI, warranty length, and customer.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Product name</Label>
                <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  className="rounded-sm mt-1" data-testid="w-product" placeholder='e.g. Samsung 43" Smart TV' />
              </div>
              <div>
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Model number</Label>
                <Input value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })}
                  className="rounded-sm mt-1" placeholder="e.g. UA43T5450" />
              </div>
              <div>
                <Label>Serial number</Label>
                <Input value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
                  className="rounded-sm mt-1 font-mono" data-testid="w-serial" />
              </div>
              <div>
                <Label>IMEI (mobiles only)</Label>
                <Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })}
                  className="rounded-sm mt-1 font-mono" />
              </div>
              <div>
                <Label>Customer name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="rounded-sm mt-1" data-testid="w-customer" />
              </div>
              <div>
                <Label>Customer phone</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Warranty start</Label>
                <Input type="date" value={form.warranty_start}
                  onChange={(e) => setForm({ ...form, warranty_start: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Warranty period</Label>
                <Select value={String(form.warranty_months)}
                  onValueChange={(v) => setForm({ ...form, warranty_months: parseInt(v, 10) })}>
                  <SelectTrigger className="rounded-sm mt-1" data-testid="w-months"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[6, 12, 18, 24, 36, 48, 60].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m < 12 ? `${m} months` : `${m / 12} year${m > 12 ? "s" : ""}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Warranty type</Label>
                <Select value={form.warranty_type} onValueChange={(v) => setForm({ ...form, warranty_type: v })}>
                  <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="replacement">Replacement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Linked invoice #</Label>
                <Input value={form.invoice_no}
                  onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
                  className="rounded-sm mt-1 font-mono text-xs" placeholder="Optional" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="rounded-sm" onClick={save} data-testid="save-warranty">Register</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card onClick={() => setFilter("all")} data-testid="w-kpi-all"
          className={`rounded-sm p-3 cursor-pointer ${filter === "all" ? "ring-2 ring-primary" : "hover:bg-secondary/40"}`}>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">All Warranties</div>
          <div className="text-2xl font-bold tabular mt-1">{summary.total || 0}</div>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s.id} onClick={() => setFilter(s.id)} data-testid={`w-kpi-${s.id}`}
            className={`rounded-sm p-3 cursor-pointer ${filter === s.id ? "ring-2 ring-primary" : "hover:bg-secondary/40"}`}>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold tabular mt-1">
              {s.id === "expiring_soon" ? summary.expiring_soon
                : s.id === "expired" ? summary.expired
                : s.id === "claimed" ? summary.claimed
                : (summary.total || 0) - (summary.expiring_soon || 0) - (summary.expired || 0) - (summary.claimed || 0)}
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input placeholder="Search by serial / IMEI / customer / invoice…"
          value={q} onChange={(e) => setQ(e.target.value)}
          className="pl-9 rounded-sm h-10" data-testid="w-search" />
      </div>

      <Card className="rounded-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border text-[10px] uppercase tracking-widest font-semibold bg-secondary/40">
          <div className="col-span-3">Product</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-2">Serial / IMEI</div>
          <div className="col-span-2">Period</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {visible.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No warranties yet. Click <b>Register Warranty</b> to add one.
          </div>
        ) : visible.map((w) => {
          const st = STATUSES.find((s) => s.id === w.status) || STATUSES[0];
          return (
            <div key={w.id} className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-b border-border/60 text-sm hover:bg-secondary/30" data-testid={`w-row-${w.id}`}>
              <div className="col-span-3 min-w-0">
                <div className="font-medium truncate">{w.product_name}</div>
                {(w.brand || w.model_number) && (
                  <div className="text-[11px] text-muted-foreground truncate">{[w.brand, w.model_number].filter(Boolean).join(" · ")}</div>
                )}
              </div>
              <div className="col-span-2 min-w-0">
                <div className="font-medium truncate">{w.customer_name}</div>
                {w.customer_phone && <div className="text-[11px] text-muted-foreground truncate">{w.customer_phone}</div>}
              </div>
              <div className="col-span-2 min-w-0 font-mono text-[12px] truncate">
                {w.serial_no || "—"}
                {w.imei && <div className="text-muted-foreground text-[11px] truncate">IMEI: {w.imei}</div>}
              </div>
              <div className="col-span-2 min-w-0 text-xs">
                <div className="truncate">{w.warranty_start} → {w.warranty_end}</div>
                <div className="text-muted-foreground">{w.warranty_months}m · {w.warranty_type}</div>
              </div>
              <div className="col-span-1 min-w-0">
                <Badge className={`rounded-sm text-[10px] uppercase border ${st.accent} whitespace-nowrap`}>{st.label}</Badge>
              </div>
              <div className="col-span-2 flex justify-end gap-1 flex-wrap">
                {w.status !== "claimed" && (
                  <Button size="sm" variant="outline" className="h-7 px-2 rounded-sm gap-1"
                    onClick={() => { setClaimDialog(w); setClaimNote(""); }}
                    data-testid={`claim-${w.id}`}>
                    <Wrench className="w-3 h-3" /> Claim
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(w.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      <Dialog open={!!claimDialog} onOpenChange={(o) => !o && setClaimDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" />Log Warranty Claim</DialogTitle>
            <DialogDescription>{claimDialog?.product_name} · Serial {claimDialog?.serial_no || "—"}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Claim note</Label>
            <Textarea rows={3} value={claimNote} onChange={(e) => setClaimNote(e.target.value)}
              placeholder="Reason, resolution, technician…" className="rounded-sm mt-1" data-testid="claim-note" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-sm" onClick={() => setClaimDialog(null)}>Cancel</Button>
            <Button className="rounded-sm" onClick={claim} data-testid="claim-confirm">Mark Claimed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
