import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, fmtINR } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Scissors, Ruler, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";

const STATUSES = [
  { id: "received",  label: "Received",   accent: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "cutting",   label: "Cutting",    accent: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "stitching", label: "Stitching",  accent: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "ready",     label: "Ready",      accent: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "delivered", label: "Delivered",  accent: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "cancelled", label: "Cancelled",  accent: "bg-rose-50 text-rose-700 border-rose-200" },
];

const GARMENTS = [
  "Shirt", "Pant", "Kurta", "Kurta Pyjama Set", "Blouse", "Salwar Kameez",
  "Saree Fall/Pico", "Blazer", "Sherwani", "Frock", "Alteration Only", "Other",
];

const MEASUREMENT_TEMPLATES = {
  "Shirt":     ["Chest", "Waist", "Length", "Shoulder", "Sleeve", "Neck"],
  "Pant":      ["Waist", "Hip", "Inseam", "Outseam", "Thigh", "Bottom"],
  "Kurta":     ["Chest", "Waist", "Length", "Shoulder", "Sleeve"],
  "Blouse":    ["Chest", "Waist", "Length", "Shoulder", "Sleeve", "Front Neck", "Back Neck"],
  "Salwar Kameez": ["Chest", "Waist", "Kameez Length", "Salwar Length", "Sleeve"],
  "Blazer":    ["Chest", "Waist", "Length", "Shoulder", "Sleeve"],
  "Frock":     ["Chest", "Waist", "Length", "Shoulder", "Sleeve"],
};

const empty = {
  customer_name: "", customer_phone: "", garment_type: "Shirt",
  quantity: 1, style_notes: "", fabric_source: "customer",
  fabric_meters: 0, price: 0, advance_paid: 0,
  due_date: "", assigned_tailor_id: "", assigned_tailor_name: "",
  measurements: [{ key: "Chest", value: "" }, { key: "Waist", value: "" }, { key: "Length", value: "" }],
  status: "received",
};

export default function Alterations() {
  const { industry } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({});
  const [tailors, setTailors] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      const [j, s, u] = await Promise.all([
        api.get("/tailor-jobs"),
        api.get("/tailor-jobs-summary"),
        api.get("/users").catch(() => ({ data: [] })),
      ]);
      setJobs(j.data);
      setSummary(s.data || {});
      setTailors((u.data || []).filter((usr) =>
        (usr.industry_roles || {}).textile === "tailor" || usr.role === "tailor"
      ));
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, [industry]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (j) => {
    setEditing(j);
    setForm({
      ...empty, ...j,
      measurements: (j.measurements && j.measurements.length ? j.measurements : empty.measurements),
    });
    setOpen(true);
  };
  const useTemplate = (garment) => {
    setForm((f) => ({
      ...f, garment_type: garment,
      measurements: (MEASUREMENT_TEMPLATES[garment] || ["Chest", "Waist", "Length"]).map((k) => ({ key: k, value: "" })),
    }));
  };

  const addMeasurement = () =>
    setForm((f) => ({ ...f, measurements: [...(f.measurements || []), { key: "", value: "" }] }));
  const setMeasurement = (i, patch) =>
    setForm((f) => {
      const arr = [...(f.measurements || [])];
      arr[i] = { ...arr[i], ...patch };
      return { ...f, measurements: arr };
    });
  const removeMeasurement = (i) =>
    setForm((f) => ({ ...f, measurements: (f.measurements || []).filter((_, x) => x !== i) }));

  const save = async () => {
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity, 10) || 1,
        price: parseFloat(form.price) || 0,
        advance_paid: parseFloat(form.advance_paid) || 0,
        fabric_meters: parseFloat(form.fabric_meters) || 0,
        measurements: (form.measurements || []).filter((m) => m.key && m.key.trim()),
      };
      if (editing) await api.put(`/tailor-jobs/${editing.id}`, payload);
      else await api.post("/tailor-jobs", payload);
      toast.success(editing ? "Job updated" : "Tailor job created");
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const changeStatus = async (j, next) => {
    try {
      await api.post(`/tailor-jobs/${j.id}/status?status=${next}`);
      toast.success(`Marked ${next}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => {
    if (!confirm("Delete this tailor job?")) return;
    try {
      await api.delete(`/tailor-jobs/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const visibleJobs = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  return (
    <div className="p-6 lg:p-8" data-testid="alterations-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Textile · Tailor Board</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Alterations & Tailoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Track stitching, alterations and fabric jobs end-to-end.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-sm gap-2" data-testid="new-tailor-job-btn" onClick={openNew}>
              <Plus className="w-4 h-4" /> New Tailor Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.job_no}` : "New Tailor Job"}</DialogTitle>
              <DialogDescription>Capture customer, garment, measurements and pricing.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer name</Label>
                <Input data-testid="tj-customer" value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Garment type</Label>
                <Select value={form.garment_type} onValueChange={useTemplate}>
                  <SelectTrigger className="rounded-sm mt-1" data-testid="tj-garment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GARMENTS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="rounded-sm mt-1 tabular" />
              </div>
              <div>
                <Label>Fabric</Label>
                <Select value={form.fabric_source}
                  onValueChange={(v) => setForm({ ...form, fabric_source: v })}>
                  <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer&apos;s own fabric</SelectItem>
                    <SelectItem value="shop">Shop-supplied fabric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fabric length (mtr)</Label>
                <Input type="number" step="0.1" value={form.fabric_meters}
                  onChange={(e) => setForm({ ...form, fabric_meters: e.target.value })}
                  className="rounded-sm mt-1 tabular" />
              </div>
              <div>
                <Label>Price (₹)</Label>
                <Input type="number" data-testid="tj-price" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="rounded-sm mt-1 tabular" />
              </div>
              <div>
                <Label>Advance paid (₹)</Label>
                <Input type="number" value={form.advance_paid}
                  onChange={(e) => setForm({ ...form, advance_paid: e.target.value })}
                  className="rounded-sm mt-1 tabular" />
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" data-testid="tj-due" value={(form.due_date || "").slice(0, 10)}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Assigned tailor</Label>
                <Select value={form.assigned_tailor_id || "unassigned"}
                  onValueChange={(v) => {
                    if (v === "unassigned") return setForm({ ...form, assigned_tailor_id: "", assigned_tailor_name: "" });
                    const t = tailors.find((x) => x.id === v);
                    setForm({ ...form, assigned_tailor_id: v, assigned_tailor_name: t?.name || "" });
                  }}>
                  <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {tailors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Style notes</Label>
                <Textarea value={form.style_notes}
                  onChange={(e) => setForm({ ...form, style_notes: e.target.value })}
                  rows={2} className="rounded-sm mt-1"
                  placeholder="e.g. mandarin collar, no cuff, French seams…" />
              </div>

              {/* Measurements */}
              <div className="col-span-2 border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5" /> Measurements
                  </Label>
                  <Button type="button" size="sm" variant="outline" className="rounded-sm h-7 gap-1"
                    onClick={addMeasurement} data-testid="tj-add-measurement">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(form.measurements || []).map((m, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input placeholder="e.g. Chest" value={m.key}
                        onChange={(e) => setMeasurement(i, { key: e.target.value })}
                        className="rounded-sm h-8 flex-1" data-testid={`m-key-${i}`} />
                <Input placeholder="e.g. 40 inch" value={m.value}
                        onChange={(e) => setMeasurement(i, { value: e.target.value })}
                        className="rounded-sm h-8 w-24 tabular" data-testid={`m-val-${i}`} />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => removeMeasurement(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
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
              <Button className="rounded-sm" data-testid="save-tailor-job" onClick={save}>
                {editing ? "Save changes" : "Create job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban counters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card
          onClick={() => setFilter("all")}
          data-testid="kanban-all"
          className={`rounded-sm p-3 cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-primary" : "hover:bg-secondary/40"}`}
        >
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">All jobs</div>
          <div className="text-2xl font-bold tracking-tight tabular mt-1">{jobs.length}</div>
        </Card>
        {STATUSES.map((s) => {
          const st = summary[s.id] || { count: 0, value: 0 };
          return (
            <Card
              key={s.id}
              onClick={() => setFilter(s.id)}
              data-testid={`kanban-${s.id}`}
              className={`rounded-sm p-3 cursor-pointer transition-all ${filter === s.id ? "ring-2 ring-primary" : "hover:bg-secondary/40"}`}
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold tracking-tight tabular mt-1">{st.count}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{fmtINR(st.value || 0)}</div>
            </Card>
          );
        })}
      </div>

      {/* Jobs list */}
      <Card className="rounded-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border text-[10px] uppercase tracking-widest font-semibold bg-secondary/40">
          <div className="col-span-2">Job #</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-2">Garment</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-1 text-right">Price</div>
          <div className="col-span-1">Due</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {visibleJobs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No tailor jobs yet. Click <b>New Tailor Job</b> to create one.
          </div>
        ) : visibleJobs.map((j) => {
          const st = STATUSES.find((s) => s.id === j.status) || STATUSES[0];
          return (
            <div key={j.id} data-testid={`job-row-${j.id}`}
              className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-b border-border/60 text-sm hover:bg-secondary/30">
              <div className="col-span-2 min-w-0 font-mono text-[12px] truncate">{j.job_no}</div>
              <div className="col-span-2 min-w-0">
                <div className="font-medium truncate">{j.customer_name}</div>
                {j.customer_phone && <div className="text-[11px] text-muted-foreground truncate">{j.customer_phone}</div>}
              </div>
              <div className="col-span-2 min-w-0">
                <div className="truncate">{j.garment_type}</div>
                {j.assigned_tailor_name && (
                  <div className="text-[11px] text-muted-foreground truncate">Tailor: {j.assigned_tailor_name}</div>
                )}
              </div>
              <div className="col-span-1 min-w-0 text-right tabular">{j.quantity}</div>
              <div className="col-span-1 min-w-0 text-right tabular truncate">{fmtINR(j.price || 0)}</div>
              <div className="col-span-1 min-w-0 text-[11px] text-muted-foreground truncate">
                {j.due_date ? new Date(j.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
              </div>
              <div className="col-span-1 min-w-0">
                <Badge className={`rounded-sm text-[10px] uppercase border ${st.accent} whitespace-nowrap`}>{st.label}</Badge>
              </div>
              <div className="col-span-2 flex items-center gap-1 justify-end flex-wrap">
                {j.status !== "delivered" && j.status !== "cancelled" && (
                  <>
                    {j.status === "received" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 rounded-sm"
                        onClick={() => changeStatus(j, "cutting")}
                        data-testid={`advance-${j.id}`}>Start</Button>
                    )}
                    {j.status === "cutting" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 rounded-sm"
                        onClick={() => changeStatus(j, "stitching")}
                        data-testid={`advance-${j.id}`}>Stitching</Button>
                    )}
                    {j.status === "stitching" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 rounded-sm gap-1"
                        onClick={() => changeStatus(j, "ready")}
                        data-testid={`advance-${j.id}`}>
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </Button>
                    )}
                    {j.status === "ready" && (
                      <Button size="sm" className="h-7 px-2 rounded-sm gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => changeStatus(j, "delivered")}
                        data-testid={`advance-${j.id}`}>
                        <CheckCircle2 className="w-3 h-3" /> Deliver
                      </Button>
                    )}
                  </>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(j)} data-testid={`edit-${j.id}`}>
                  <Ruler className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(j.id)} data-testid={`del-${j.id}`}>
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
