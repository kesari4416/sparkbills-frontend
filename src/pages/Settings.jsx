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

export default function Settings() {
  const [biz, setBiz] = useState({});
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [openU, setOpenU] = useState(false);
  const [openB, setOpenB] = useState(false);
  const [openRoles, setOpenRoles] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [uForm, setUForm] = useState({ email: "", password: "", name: "", role: "cashier", industry_roles: {} });
  const [bForm, setBForm] = useState({ name: "", address: "", phone: "", gstin: "", state: "Karnataka" });

  const load = async () => {
    const [b, br, u, a] = await Promise.all([
      api.get("/business"), api.get("/branches"), api.get("/users"), api.get("/audit-logs").catch(() => ({ data: [] })),
    ]);
    setBiz(b.data || {}); setBranches(br.data); setUsers(u.data); setAudit(a.data);
  };
  useEffect(() => { load(); }, []);

  const saveBiz = async () => {
    try { await api.put("/business", biz); toast.success("Business saved"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const saveUser = async () => {
    try { await api.post("/users", uForm); toast.success("User added"); setOpenU(false); setUForm({ email: "", password: "", name: "", role: "cashier", industry_roles: {} }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const openIndustryRoles = (u) => {
    setEditingUser({ ...u, industry_roles: u.industry_roles || {} });
    setOpenRoles(true);
  };
  const saveIndustryRoles = async () => {
    try {
      await api.put(`/users/${editingUser.id}`, { industry_roles: editingUser.industry_roles || {} });
      toast.success("Industry sub-roles updated");
      setOpenRoles(false);
      setEditingUser(null);
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
                        {["owner", "manager", "cashier", "accountant", "doctor", "pharmacist"].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="text-[11px] text-muted-foreground mt-1">Base role governs backend permissions (owner has full access).</div>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <div className="text-sm font-semibold">Industry-Specific Sub-roles</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-3">Assign a sub-role per industry mode. Menu items and pages are filtered based on the sub-role of the currently active industry.</div>
                    <IndustryRolesEditor
                      value={uForm.industry_roles}
                      onChange={(next) => setUForm({ ...uForm, industry_roles: next })}
                    />
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
                <TableHead>Industry Sub-roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.map((u) => {
                  const roles = u.industry_roles || {};
                  const roleEntries = Object.entries(roles);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant="secondary" className="rounded-sm text-[10px] uppercase">{u.role}</Badge></TableCell>
                      <TableCell>
                        {roleEntries.length === 0 ? (
                          <span className="text-xs text-muted-foreground">All industries — no restrictions</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {roleEntries.map(([ind, r]) => (
                              <Badge key={ind} variant="outline" className="rounded-sm text-[10px]">
                                <span className="uppercase text-muted-foreground mr-1">{ind.slice(0, 3)}:</span>
                                {SUBROLE_LABEL[r] || r}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="rounded-sm h-8 gap-1.5"
                          data-testid={`manage-roles-${u.id}`}
                          onClick={() => openIndustryRoles(u)}>
                          <ShieldCheck className="w-3.5 h-3.5" /> Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <Dialog open={openRoles} onOpenChange={setOpenRoles}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Industry Sub-roles — {editingUser?.name}</DialogTitle>
              </DialogHeader>
              {editingUser && (
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <div className="text-[11px] text-muted-foreground mb-3">
                    Assign a sub-role per industry mode. Leave a mode as <b>Unrestricted</b> to give access to all pages under that mode. Owner accounts always bypass restrictions.
                  </div>
                  <IndustryRolesEditor
                    value={editingUser.industry_roles}
                    onChange={(next) => setEditingUser({ ...editingUser, industry_roles: next })}
                  />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" className="rounded-sm" onClick={() => setOpenRoles(false)}>Cancel</Button>
                <Button className="rounded-sm" onClick={saveIndustryRoles} data-testid="save-industry-roles">Save Sub-roles</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

function IndustryRolesEditor({ value, onChange }) {
  const roles = value || {};
  const industryLabels = {
    generic: "Generic",
    retail: "Retail",
    restaurant: "Restaurant",
    hospital: "Hospital",
    pharmacy: "Pharmacy",
    service: "Service",
  };
  const setFor = (ind, sub) => {
    const next = { ...roles };
    if (!sub || sub === "__unrestricted") delete next[ind];
    else next[ind] = sub;
    onChange(next);
  };
  return (
    <div className="grid grid-cols-1 gap-2">
      {Object.keys(INDUSTRY_SUBROLES).map((ind) => (
        <div key={ind} className="grid grid-cols-[130px_1fr] gap-3 items-center">
          <div className="text-sm font-medium">{industryLabels[ind] || ind}</div>
          <Select
            value={roles[ind] || "__unrestricted"}
            onValueChange={(v) => setFor(ind, v)}
          >
            <SelectTrigger className="rounded-sm h-9" data-testid={`subrole-${ind}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__unrestricted">Unrestricted (all pages)</SelectItem>
              {INDUSTRY_SUBROLES[ind].map((r) => (
                <SelectItem key={r} value={r}>{SUBROLE_LABEL[r] || r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
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
