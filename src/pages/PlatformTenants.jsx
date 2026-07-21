import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Search, Building2, PauseCircle, PlayCircle, Trash2, Users, Receipt, IndianRupee, LogIn,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const INDUSTRY_LABEL = {
  retail: "Retail & Supermarket",
  fruits_veg: "Fruits & Vegetables",
  restaurant: "Restaurant & Café",
  cafe: "Tea & Snacks",
  textile: "Textile & Fashion",
  pharmacy: "Pharmacy",
  hardware: "Hardware Shop",
  electronics: "Electronics & Home Appliances",
};

const EMPTY_FORM = {
  business_name: "",
  owner_email: "",
  owner_password: "",
  owner_name: "",
  gstin: "",
  state: "Karnataka",
  phone: "",
  allowed_industries: ["restaurant"],
};

export default function PlatformTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(null);
  const { impersonateTenant } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/platform/tenants");
      setTenants(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return tenants;
    const s = q.toLowerCase();
    return tenants.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(s) ||
        (t.email || "").toLowerCase().includes(s) ||
        (t.gstin || "").toLowerCase().includes(s),
    );
  }, [q, tenants]);

  const toggleInd = (key, on) => {
    setForm((f) => {
      const s = new Set(f.allowed_industries);
      if (on) s.add(key); else s.delete(key);
      return { ...f, allowed_industries: Array.from(s) };
    });
  };

  const create = async () => {
    if (form.allowed_industries.length === 0) {
      toast.error("Pick at least one industry"); return;
    }
    setSaving(true);
    try {
      await api.post("/platform/tenants", form);
      toast.success("Tenant created");
      setOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const suspend = async (t) => {
    if (!window.confirm(`Suspend "${t.name}"? All logins will be blocked.`)) return;
    try {
      await api.patch(`/platform/tenants/${t.id}/suspend`);
      toast.success("Tenant suspended");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const activate = async (t) => {
    try {
      await api.patch(`/platform/tenants/${t.id}/activate`);
      toast.success("Tenant activated");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (t) => {
    if (!window.confirm(`DELETE tenant "${t.name}" and ALL its data? This cannot be undone.`)) return;
    if (!window.confirm(`Type-guard: confirm delete of ${t.name}?`)) return;
    try {
      await api.delete(`/platform/tenants/${t.id}`);
      toast.success("Tenant deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const impersonate = async (t) => {
    if (!window.confirm(`Log in as ${t.name}? This is audited. Every action you take will be attributed to their owner account.`)) return;
    setImpersonating(t.id);
    try {
      const data = await impersonateTenant(t.id);
      toast.success(`Now impersonating ${data.business_name}`);
      navigate("/app");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setImpersonating(null); }
  };

  return (
    <div className="p-8 space-y-4 text-white" data-testid="platform-tenants-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400">Platform Control</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Tenants</h1>
          <p className="text-sm text-blue-200/60 mt-1">All Sparkbills businesses on this deployment.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-blue-300/50" />
            <Input
              data-testid="tenants-search"
              placeholder="Search name / email / GSTIN…"
              className="pl-9 h-10 rounded-md bg-black/30 border-white/10 text-white placeholder:text-blue-200/40 min-w-[280px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-md gap-2 bg-blue-600 hover:bg-blue-500" data-testid="new-tenant-btn">
                <Plus className="w-4 h-4" /> New Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Provision new tenant</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Business Name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="rounded-sm mt-1" data-testid="new-biz-name" /></div>
                  <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-sm mt-1" /></div>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">Owner (First user)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="rounded-sm mt-1" data-testid="new-owner-name" /></div>
                    <div><Label>Owner Email</Label><Input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} className="rounded-sm mt-1" data-testid="new-owner-email" /></div>
                    <div className="col-span-2"><Label>Owner Password</Label><Input type="password" value={form.owner_password} onChange={(e) => setForm({ ...form, owner_password: e.target.value })} className="rounded-sm mt-1" data-testid="new-owner-password" /></div>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">
                    Enabled Industries — lock this tenant to what they use
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(INDUSTRY_LABEL).map(([k, label]) => {
                      const on = form.allowed_industries.includes(k);
                      return (
                        <label
                          key={k}
                          className={`flex items-center gap-3 rounded-sm border px-3 py-2 cursor-pointer transition-colors ${
                            on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/30"
                          }`}
                          data-testid={`new-ind-${k}`}
                        >
                          <Checkbox checked={on} onCheckedChange={(v) => toggleInd(k, v)} />
                          <div className="text-sm">{label}</div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="rounded-sm" onClick={create} disabled={saving || !form.business_name || !form.owner_email || !form.owner_password || !form.owner_name} data-testid="save-tenant">
                  {saving ? "Creating…" : "Create Tenant"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-sm overflow-hidden bg-white/[0.03] border-white/10 text-white">
        {loading ? (
          <div className="p-8 text-center text-blue-200/60">Loading tenants…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-blue-200/50">
            <Building2 className="w-10 h-10 mx-auto opacity-40 mb-3" />
            {q ? `No tenants match "${q}".` : "No tenants yet. Click New Tenant to provision one."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-blue-300/70">Business</TableHead>
                <TableHead className="text-blue-300/70">Industries</TableHead>
                <TableHead className="text-blue-300/70">Users</TableHead>
                <TableHead className="text-blue-300/70">Invoices</TableHead>
                <TableHead className="text-blue-300/70 text-right">Revenue</TableHead>
                <TableHead className="text-blue-300/70">Status</TableHead>
                <TableHead className="text-blue-300/70 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="border-white/5 hover:bg-white/[0.02]" data-testid={`tenant-row-${t.id}`}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-[11px] text-blue-200/50">{t.email || "—"} · {t.gstin || "no GSTIN"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(t.allowed_industries || []).slice(0, 3).map((k) => (
                        <Badge key={k} variant="outline" className="rounded-sm text-[10px] border-blue-500/30 text-blue-200">
                          {INDUSTRY_LABEL[k] || k}
                        </Badge>
                      ))}
                      {(t.allowed_industries || []).length > 3 && (
                        <span className="text-[10px] text-blue-200/50">+{(t.allowed_industries || []).length - 3}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-300/60" />{t.users_count}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-blue-300/60" />{t.invoices_count}</div></TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="flex items-center justify-end gap-1"><IndianRupee className="w-3.5 h-3.5 text-blue-300/60" />{t.total_revenue?.toLocaleString?.("en-IN") || 0}</div>
                  </TableCell>
                  <TableCell>
                    {t.is_suspended ? (
                      <Badge className="rounded-sm text-[10px] bg-rose-500/20 text-rose-300 border-rose-500/30">SUSPENDED</Badge>
                    ) : (
                      <Badge className="rounded-sm text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">ACTIVE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" className="h-8 rounded-sm gap-1.5 bg-transparent border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                        onClick={() => impersonate(t)} disabled={impersonating === t.id} data-testid={`impersonate-${t.id}`}>
                        <LogIn className="w-3.5 h-3.5" /> {impersonating === t.id ? "…" : "Login as"}
                      </Button>
                      {t.is_suspended ? (
                        <Button variant="outline" size="sm" className="h-8 rounded-sm gap-1.5 bg-transparent border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => activate(t)} data-testid={`activate-${t.id}`}>
                          <PlayCircle className="w-3.5 h-3.5" /> Activate
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="h-8 rounded-sm gap-1.5 bg-transparent border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                          onClick={() => suspend(t)} data-testid={`suspend-${t.id}`}>
                          <PauseCircle className="w-3.5 h-3.5" /> Suspend
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 rounded-sm gap-1.5 bg-transparent border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                        onClick={() => del(t)} data-testid={`delete-${t.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
