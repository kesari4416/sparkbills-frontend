import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
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
import { Building2, Users, Building, Plus, Save, Download, Bike, ShieldCheck } from "lucide-react";
import { INDUSTRY_SUBROLES, SUBROLE_LABEL } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { businessPerms } = useAuth();
  const allowedInds = (businessPerms?.allowed_industries || []).filter(Boolean);
  // Modules the tenant has enabled — used to render per-user permission grid.
  const enabledModules = Object.entries(businessPerms?.modules || {})
    .filter(([, on]) => on)
    .map(([k]) => k);
  const roleDefaults = businessPerms?.role_permissions || {};
  // Build the Base Role option list from what the tenant's industries actually use.
  const roleOptions = (() => {
    const set = new Set(["owner", "admin"]);   // platform-side always available
    const inds = allowedInds.length > 0 ? allowedInds : Object.keys(INDUSTRY_SUBROLES);
    inds.forEach((i) => (INDUSTRY_SUBROLES[i] || []).forEach((r) => set.add(r)));
    set.add("accountant"); // accountant applies across industries
    return Array.from(set);
  })();
  const [catalog, setCatalog] = useState({ modules: {} });
  const [biz, setBiz] = useState({});
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [openU, setOpenU] = useState(false);
  const [openB, setOpenB] = useState(false);
  const [uForm, setUForm] = useState({ email: "", password: "", name: "", role: "cashier", module_permissions: [], use_role_defaults: true });
  const [bForm, setBForm] = useState({ name: "", address: "", phone: "", gstin: "", state: "Karnataka" });

  const load = async () => {
    const [b, br, u, a, cat] = await Promise.all([
      api.get("/business"), api.get("/branches"), api.get("/users"), api.get("/audit-logs").catch(() => ({ data: [] })),
      api.get("/permissions/catalog").catch(() => ({ data: { modules: {} } })),
    ]);
    setBiz(b.data || {}); setBranches(br.data); setUsers(u.data); setAudit(a.data);
    setCatalog(cat.data || { modules: {} });
  };
  useEffect(() => { load(); }, []);

  const saveBiz = async () => {
    try { await api.put("/business", biz); toast.success("Business saved"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const saveUser = async () => {
    try {
      const payload = {
        email: uForm.email, password: uForm.password, name: uForm.name, role: uForm.role,
        module_permissions: uForm.use_role_defaults ? null : uForm.module_permissions,
      };
      await api.post("/users", payload);
      toast.success("User added");
      setOpenU(false);
      setUForm({ email: "", password: "", name: "", role: "cashier", module_permissions: [], use_role_defaults: true });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const saveBranch = async () => {
    try { await api.post("/branches", bForm); toast.success("Branch added"); setOpenB(false); setBForm({ name: "", address: "", phone: "", gstin: "", state: "Karnataka" }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const downloadBackup = async () => {
    const { data } = await api.get("/backup");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8" data-testid="settings-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Settings</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Business Configuration</h1>
        </div>
        <Button variant="outline" className="rounded-sm gap-2" onClick={downloadBackup} data-testid="download-backup">
          <Download className="w-4 h-4" /> Download Backup
        </Button>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="rounded-sm">
          <TabsTrigger value="business" data-testid="tab-business"><Building2 className="w-3.5 h-3.5 mr-2" />Business</TabsTrigger>
          <TabsTrigger value="branches" data-testid="tab-branches"><Building className="w-3.5 h-3.5 mr-2" />Branches</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users"><Users className="w-3.5 h-3.5 mr-2" />Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations"><Bike className="w-3.5 h-3.5 mr-2" />Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <Card className="rounded-sm p-6 max-w-3xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Business Name</Label><Input value={biz.name || ""} onChange={(e) => setBiz({ ...biz, name: e.target.value })} className="rounded-sm mt-1" data-testid="biz-name" /></div>
              <div><Label>GSTIN</Label><Input value={biz.gstin || ""} onChange={(e) => setBiz({ ...biz, gstin: e.target.value })} className="rounded-sm mt-1" data-testid="biz-gstin" /></div>
              <div><Label>State</Label><Input value={biz.state || ""} onChange={(e) => setBiz({ ...biz, state: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Phone</Label><Input value={biz.phone || ""} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Email</Label><Input value={biz.email || ""} onChange={(e) => setBiz({ ...biz, email: e.target.value })} className="rounded-sm mt-1" /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={biz.address || ""} onChange={(e) => setBiz({ ...biz, address: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Invoice Prefix</Label><Input value={biz.invoice_prefix || "INV"} onChange={(e) => setBiz({ ...biz, invoice_prefix: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Financial Year Start Month</Label><Input type="number" min="1" max="12" value={biz.fy_start_month || 4} onChange={(e) => setBiz({ ...biz, fy_start_month: parseInt(e.target.value) || 4 })} className="rounded-sm mt-1" /></div>
              <div className="col-span-2 pt-2 border-t border-border">
                <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mt-2 mb-1">Payment Details (shown on invoice PDF as QR)</div>
              </div>
              <div><Label>UPI ID</Label><Input value={biz.upi_id || ""} onChange={(e) => setBiz({ ...biz, upi_id: e.target.value })} placeholder="yourname@upi" className="rounded-sm mt-1" data-testid="biz-upi" /></div>
              <div><Label>Bank Name</Label><Input value={biz.bank_name || ""} onChange={(e) => setBiz({ ...biz, bank_name: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Account Number</Label><Input value={biz.bank_account || ""} onChange={(e) => setBiz({ ...biz, bank_account: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>IFSC Code</Label><Input value={biz.bank_ifsc || ""} onChange={(e) => setBiz({ ...biz, bank_ifsc: e.target.value })} className="rounded-sm mt-1" /></div>
            </div>
            <Button className="rounded-sm mt-4 gap-2" onClick={saveBiz} data-testid="save-biz"><Save className="w-4 h-4" /> Save Business</Button>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={openB} onOpenChange={setOpenB}>
              <DialogTrigger asChild><Button className="rounded-sm gap-2"><Plus className="w-4 h-4" />Add Branch</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Branch</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={bForm.name} onChange={(e) => setBForm({ ...bForm, name: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Address</Label><Input value={bForm.address} onChange={(e) => setBForm({ ...bForm, address: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Phone</Label><Input value={bForm.phone} onChange={(e) => setBForm({ ...bForm, phone: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>GSTIN</Label><Input value={bForm.gstin} onChange={(e) => setBForm({ ...bForm, gstin: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>State</Label><Input value={bForm.state} onChange={(e) => setBForm({ ...bForm, state: e.target.value })} className="rounded-sm mt-1" /></div>
                </div>
                <DialogFooter><Button className="rounded-sm" onClick={saveBranch}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>GSTIN</TableHead><TableHead>State</TableHead><TableHead>Default</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-xs">{b.gstin || "—"}</TableCell>
                    <TableCell>{b.state}</TableCell>
                    <TableCell>{b.is_default && <Badge variant="outline" className="rounded-sm text-[10px]">DEFAULT</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={openU} onOpenChange={setOpenU}>
              <DialogTrigger asChild><Button className="rounded-sm gap-2" data-testid="new-user-btn"><Plus className="w-4 h-4" />Add User</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  <div><Label>Name</Label><Input value={uForm.name} onChange={(e) => setUForm({ ...uForm, name: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Email</Label><Input type="email" value={uForm.email} onChange={(e) => setUForm({ ...uForm, email: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Password</Label><Input type="password" value={uForm.password} onChange={(e) => setUForm({ ...uForm, password: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Base Role</Label>
                    <Select value={uForm.role} onValueChange={(v) => setUForm({ ...uForm, role: v })}>
                      <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => <SelectItem key={r} value={r} className="capitalize">{SUBROLE_LABEL[r] || r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="text-[11px] text-muted-foreground mt-1">Roles are filtered to your enabled industries.</div>
                  </div>

                  {/* Per-user Tenant Module Permissions */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <div className="text-sm font-semibold">Tenant Module Access</div>
                    </div>
                    <label className="flex items-center gap-2 mb-3 cursor-pointer">
                      <Checkbox
                        checked={uForm.use_role_defaults}
                        onCheckedChange={(v) => setUForm({ ...uForm, use_role_defaults: !!v })}
                        data-testid="use-role-defaults"
                      />
                      <span className="text-xs">
                        Use default permissions for <b className="capitalize">{SUBROLE_LABEL[uForm.role] || uForm.role}</b>
                        {roleDefaults[uForm.role]?.length > 0 && (
                          <span className="text-muted-foreground"> ({roleDefaults[uForm.role].length} modules)</span>
                        )}
                      </span>
                    </label>
                    {!uForm.use_role_defaults && (
                      <div className="rounded-sm border border-border p-3 space-y-1 max-h-[280px] overflow-y-auto">
                        <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">
                          Pick modules this user can access
                        </div>
                        {enabledModules.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No enabled modules — turn some on in Layer 1 first.</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
                            {enabledModules.map((mk) => {
                              const meta = catalog.modules?.[mk];
                              if (!meta) return null;
                              const checked = uForm.module_permissions.includes(mk);
                              return (
                                <label key={mk} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/30 rounded-sm px-1.5 py-1">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      const s = new Set(uForm.module_permissions);
                                      if (v) s.add(mk); else s.delete(mk);
                                      setUForm({ ...uForm, module_permissions: Array.from(s) });
                                    }}
                                    data-testid={`user-perm-${mk}`}
                                  />
                                  <span>{meta.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <div className="pt-2 flex gap-2">
                          <button type="button" className="text-[10px] uppercase tracking-widest text-primary hover:underline"
                            onClick={() => setUForm({ ...uForm, module_permissions: [...enabledModules] })}
                            data-testid="perm-select-all">
                            Select all
                          </button>
                          <span className="text-muted-foreground">·</span>
                          <button type="button" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                            onClick={() => setUForm({ ...uForm, module_permissions: [] })}>
                            Clear
                          </button>
                          <span className="text-muted-foreground">·</span>
                          <button type="button" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                            onClick={() => {
                              const roleMods = (roleDefaults[uForm.role] || []).filter((m) => enabledModules.includes(m));
                              setUForm({ ...uForm, module_permissions: roleMods });
                            }}
                            data-testid="perm-prefill-role">
                            Prefill from role defaults
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter><Button className="rounded-sm" onClick={saveUser} data-testid="save-user">Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Base Role</TableHead>
                <TableHead>Module Access</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.map((u) => {
                  const perUser = Array.isArray(u.module_permissions) && u.module_permissions.length > 0;
                  const roleCount = (roleDefaults[u.role] || []).length;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant="secondary" className="rounded-sm text-[10px] uppercase">{SUBROLE_LABEL[u.role] || u.role}</Badge></TableCell>
                      <TableCell>
                        {u.role === "owner" || u.role === "admin" ? (
                          <Badge className="rounded-sm text-[10px] bg-emerald-500/20 text-emerald-700 border-emerald-500/30">FULL ACCESS</Badge>
                        ) : perUser ? (
                          <Badge variant="outline" className="rounded-sm text-[10px]">CUSTOM · {u.module_permissions.length} modules</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Role default ({roleCount})</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead className="text-right">Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{a.created_at?.replace("T", " ").slice(0, 16)}</TableCell>
                    <TableCell className="text-xs">{a.user_email}</TableCell>
                    <TableCell className="text-xs uppercase">{a.action}</TableCell>
                    <TableCell className="font-mono text-xs">{a.entity_number}</TableCell>
                    <TableCell className="text-right tabular">{a.amount ? `₹ ${a.amount.toFixed(2)}` : "—"}</TableCell>
                  </TableRow>
                ))}
                {audit.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No activity yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="mt-4">
          <AggregatorIntegrations biz={biz} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AggregatorIntegrations({ biz }) {
  const [sending, setSending] = useState(false);
  const [platform, setPlatform] = useState("swiggy");

  const webhookUrl = `${window.location.origin.replace(/\/$/, "")}/api/webhooks/${platform}`;

  const simulate = async () => {
    setSending(true);
    try {
      await api.post("/aggregator/simulate", {
        platform,
        business_id: biz?.id || "",
        platform_order_id: `${platform.toUpperCase()}-${Date.now()}`,
        customer_name: `${platform === "swiggy" ? "Swiggy" : "Zomato"} Test Customer`,
        customer_phone: "9999999999",
        items: [
          { name: "Paneer Butter Masala", quantity: 1, rate: 320, gst_rate: 5, hsn_sac: "2106" },
          { name: "Butter Naan", quantity: 2, rate: 60, gst_rate: 5, hsn_sac: "1905" },
        ],
        subtotal: 440,
        packaging_charge: 20,
        delivery_charge: 30,
        platform_commission: 92, // ~21%
        discount: 40,
        tax: 22,
        grand_total: 472,
        payment_mode: "prepaid",
      });
      toast.success(`Test ${platform} order ingested — see KDS + Aggregator Settlement report.`);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSending(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
      <Card className="rounded-sm p-6">
        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Food Aggregators</div>
        <div className="font-heading text-xl font-bold mb-4">Swiggy & Zomato Webhooks</div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure this webhook URL in your merchant portal to auto-ingest orders as KOTs
          and track platform commission in the Settlement report.
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="rounded-sm mt-1 max-w-xs" data-testid="int-platform"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="swiggy">Swiggy</SelectItem>
                <SelectItem value="zomato">Zomato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Webhook URL</Label>
            <Input readOnly value={webhookUrl} className="rounded-sm mt-1 font-mono text-xs" data-testid="int-webhook-url"
              onFocus={(e) => e.target.select()} />
            <div className="text-[11px] text-muted-foreground mt-1">
              POST body must include: <code>business_id</code>, <code>platform_order_id</code>, <code>items[]</code>, totals & commission.
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-sm p-6 bg-primary/[0.03] border-primary/20">
        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Test</div>
        <div className="font-heading text-xl font-bold mb-2">Simulate Order</div>
        <p className="text-sm text-muted-foreground mb-4">
          Fires a sample {platform.toUpperCase()} order into your business to verify the full flow — KOT creation,
          settlement record and P&amp;L impact. Safe to run multiple times.
        </p>
        <Button className="rounded-sm gap-2" onClick={simulate} disabled={sending || !biz?.id} data-testid="simulate-order">
          <Bike className="w-4 h-4" /> {sending ? "Sending…" : `Simulate ${platform === "swiggy" ? "Swiggy" : "Zomato"} Order`}
        </Button>
      </Card>
    </div>
  );
}
