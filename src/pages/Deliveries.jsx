import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, API } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus, Truck, Trash2, CheckCircle2, MapPin, FileText } from "lucide-react";

const STATUSES = [
  { id: "scheduled",        label: "Scheduled",         accent: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "out_for_delivery", label: "Out for Delivery",  accent: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "delivered",        label: "Delivered",         accent: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "installed",        label: "Installed",         accent: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "cancelled",        label: "Cancelled",         accent: "bg-rose-50 text-rose-700 border-rose-200" },
];

const empty = {
  customer_name: "", customer_phone: "", address: "",
  scheduled_date: "", scheduled_slot: "",
  technician_id: "", technician_name: "",
  needs_installation: true,
  items: [{ name: "", quantity: 1, serial_no: "" }],
  notes: "", status: "scheduled",
  invoice_no: "",
};

export default function Deliveries() {
  const { industry } = useAuth();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [technicians, setTechnicians] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      const [d, s, u] = await Promise.all([
        api.get("/deliveries"),
        api.get("/deliveries-summary"),
        api.get("/users").catch(() => ({ data: [] })),
      ]);
      setRows(d.data);
      setSummary(s.data || {});
      setTechnicians(
        (u.data || []).filter((usr) =>
          (usr.industry_roles || {}).electronics === "technician" || usr.role === "technician"
        )
      );
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, [industry]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ ...empty, ...d }); setOpen(true); };

  const patchItem = (i, patch) => {
    const arr = [...form.items]; arr[i] = { ...arr[i], ...patch }; setForm({ ...form, items: arr });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { name: "", quantity: 1, serial_no: "" }] });
  const rmItem = (i) => setForm({ ...form, items: form.items.filter((_, x) => x !== i) });

  const save = async () => {
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.scheduled_date) return toast.error("Scheduled date is required");
    try {
      const payload = { ...form, items: form.items.filter((it) => it.name?.trim()) };
      if (editing) await api.put(`/deliveries/${editing.id}`, payload);
      else await api.post("/deliveries", payload);
      toast.success(editing ? "Delivery updated" : "Delivery scheduled");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const advance = async (d, next) => {
    try {
      await api.post(`/deliveries/${d.id}/status?status=${next}`);
      toast.success(`Marked ${next.replace(/_/g, " ")}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => {
    if (!confirm("Delete this delivery?")) return;
    try { await api.delete(`/deliveries/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const visible = useMemo(() => filter === "all" ? rows : rows.filter((r) => r.status === filter), [rows, filter]);

  return (
    <div className="p-6 lg:p-8" data-testid="deliveries-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Electronics · Fulfilment</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Deliveries &amp; Installation</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule dispatches, assign technicians and track install completion.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-sm gap-2" onClick={openNew} data-testid="new-delivery-btn">
              <Plus className="w-4 h-4" /> Schedule Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.delivery_no}` : "New Delivery"}</DialogTitle>
              <DialogDescription>Assign a technician, pick a date, capture serial numbers.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="rounded-sm mt-1" data-testid="d-customer" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Delivery address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2} className="rounded-sm mt-1" data-testid="d-address" />
              </div>
              <div>
                <Label>Scheduled date</Label>
                <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="rounded-sm mt-1" data-testid="d-date" />
              </div>
              <div>
                <Label>Slot</Label>
                <Select value={form.scheduled_slot || "any"} onValueChange={(v) => setForm({ ...form, scheduled_slot: v === "any" ? "" : v })}>
                  <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder="Any time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any time</SelectItem>
                    <SelectItem value="9am-1pm">9 AM – 1 PM</SelectItem>
                    <SelectItem value="1pm-5pm">1 PM – 5 PM</SelectItem>
                    <SelectItem value="5pm-8pm">5 PM – 8 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned technician</Label>
                <Select value={form.technician_id || "unassigned"}
                  onValueChange={(v) => {
                    if (v === "unassigned") return setForm({ ...form, technician_id: "", technician_name: "" });
                    const t = technicians.find((x) => x.id === v);
                    setForm({ ...form, technician_id: v, technician_name: t?.name || "" });
                  }}>
                  <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={form.needs_installation}
                  onChange={(e) => setForm({ ...form, needs_installation: e.target.checked })}
                  className="rounded-sm" data-testid="d-install" />
                <Label className="cursor-pointer">Needs installation on site</Label>
              </div>
              <div>
                <Label>Linked invoice #</Label>
                <Input value={form.invoice_no || ""}
                  onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
                  placeholder="Optional"
                  className="rounded-sm mt-1 font-mono text-xs" />
              </div>

              <div className="col-span-2 border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Products &amp; Serial Numbers</Label>
                  <Button type="button" size="sm" variant="outline" className="rounded-sm h-7 gap-1" onClick={addItem}>
                    <Plus className="w-3 h-3" /> Row
                  </Button>
                </div>
                <div className="grid grid-cols-12 gap-2 mb-1 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-4">Serial / IMEI</div>
                  <div className="col-span-1"></div>
                </div>
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-1 items-center">
                    <Input placeholder="e.g. Samsung 43 inch Smart TV" value={it.name}
                      onChange={(e) => patchItem(i, { name: e.target.value })}
                      className="col-span-5 rounded-sm h-8" data-testid={`d-item-name-${i}`} />
                    <Input type="number" min="1" value={it.quantity}
                      onChange={(e) => patchItem(i, { quantity: parseFloat(e.target.value) || 1 })}
                      className="col-span-2 rounded-sm h-8 text-right tabular" />
                    <Input placeholder="SN-XXX" value={it.serial_no}
                      onChange={(e) => patchItem(i, { serial_no: e.target.value })}
                      className="col-span-4 rounded-sm h-8 font-mono text-xs" data-testid={`d-item-serial-${i}`} />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 col-span-1"
                      onClick={() => rmItem(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-sm mt-1" placeholder="Access to lift, staircase floor #, gate code…" />
              </div>
              {editing && (
                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="rounded-sm" onClick={save} data-testid="save-delivery">
                {editing ? "Save changes" : "Schedule delivery"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card onClick={() => setFilter("all")} data-testid="kanban-all"
          className={`rounded-sm p-3 cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-primary" : "hover:bg-secondary/40"}`}>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">All</div>
          <div className="text-2xl font-bold tracking-tight tabular mt-1">{rows.length}</div>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s.id} onClick={() => setFilter(s.id)} data-testid={`kanban-${s.id}`}
            className={`rounded-sm p-3 cursor-pointer transition-all ${filter === s.id ? "ring-2 ring-primary" : "hover:bg-secondary/40"}`}>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold tracking-tight tabular mt-1">{summary[s.id] || 0}</div>
          </Card>
        ))}
      </div>

      <Card className="rounded-sm overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 border-b border-border text-[10px] uppercase tracking-widest font-semibold bg-secondary/40">
          <div className="col-span-2">Delivery #</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-3">Products</div>
          <div className="col-span-2">Date · Slot</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {visible.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No deliveries yet. Click <b>Schedule Delivery</b> to create one.
          </div>
        ) : visible.map((d) => {
          const st = STATUSES.find((s) => s.id === d.status) || STATUSES[0];
          return (
            <div key={d.id} className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-b border-border/60 text-sm hover:bg-secondary/30" data-testid={`d-row-${d.id}`}>
              <div className="col-span-2 min-w-0 font-mono text-[12px] truncate">{d.delivery_no}</div>
              <div className="col-span-2 min-w-0">
                <div className="font-medium truncate">{d.customer_name}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{d.address}</span></div>
              </div>
              <div className="col-span-3 min-w-0 text-xs">
                {(d.items || []).slice(0, 2).map((it, i) => <div key={i} className="truncate">{it.quantity}× {it.name}{it.serial_no ? ` · ${it.serial_no}` : ""}</div>)}
                {(d.items || []).length > 2 && <div className="text-muted-foreground">+{d.items.length - 2} more</div>}
              </div>
              <div className="col-span-2 min-w-0 text-xs">
                <div>{d.scheduled_date}</div>
                <div className="text-muted-foreground">{d.scheduled_slot || "Any time"}</div>
                {d.technician_name && <div className="text-[11px] text-primary font-semibold mt-0.5 truncate">👤 {d.technician_name}</div>}
              </div>
              <div className="col-span-1 min-w-0">
                <Badge className={`rounded-sm text-[10px] uppercase border ${st.accent} whitespace-nowrap`}>{st.label}</Badge>
              </div>
              <div className="col-span-2 flex items-center gap-1 justify-end flex-wrap">
                {d.status === "installed" || d.status === "delivered" ? (
                  <a
                    href={`${API}/deliveries/${d.id}/challan.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`challan-${d.id}`}
                    className="inline-flex h-7 items-center gap-1 rounded-sm border border-emerald-300 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <FileText className="w-3 h-3" /> Challan
                  </a>
                ) : null}
                {d.status === "scheduled" && (
                  <Button size="sm" variant="outline" className="h-7 px-2 rounded-sm"
                    onClick={() => advance(d, "out_for_delivery")} data-testid={`adv-${d.id}`}>Dispatch</Button>
                )}
                {d.status === "out_for_delivery" && (
                  <Button size="sm" variant="outline" className="h-7 px-2 rounded-sm gap-1"
                    onClick={() => advance(d, "delivered")} data-testid={`adv-${d.id}`}>
                    <CheckCircle2 className="w-3 h-3" /> Delivered
                  </Button>
                )}
                {d.status === "delivered" && d.needs_installation && (
                  <Button size="sm" className="h-7 px-2 rounded-sm gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => advance(d, "installed")} data-testid={`adv-${d.id}`}>
                    <CheckCircle2 className="w-3 h-3" /> Installed
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)} data-testid={`edit-${d.id}`}>
                  <MapPin className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(d.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
