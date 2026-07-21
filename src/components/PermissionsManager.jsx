import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, ShieldCheck, Layers, Users as UsersIcon, RefreshCw, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const INDUSTRY_LABEL = {
  retail: "Retail & Supermarket",
  fruits_veg: "Fruits & Vegetables",
  restaurant: "Restaurant & Café",
  cafe: "Tea & Snacks Shop",
  textile: "Textile & Fashion",
  pharmacy: "Pharmacy",
  hardware: "Hardware Shop",
};

// Human labels for role keys (mirrors backend DEFAULT_ROLE_PERMISSIONS).
const ROLE_LABELS = {
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  "kot-chef": "Kitchen Staff",
  "stock-keeper": "Stock Keeper",
  pharmacist: "Pharmacist",
  salesperson: "Salesperson",
  tailor: "Tailor",
  accountant: "Accountant",
};

// Which roles are meaningful for each industry (drives which columns we show).
const INDUSTRY_ROLES = {
  retail: ["manager", "cashier", "stock-keeper", "accountant"],
  fruits_veg: ["manager", "cashier", "stock-keeper", "accountant"],
  restaurant: ["manager", "cashier", "waiter", "kot-chef", "accountant"],
  cafe: ["manager", "cashier", "waiter", "kot-chef", "accountant"],
  textile: ["manager", "cashier", "salesperson", "tailor", "stock-keeper", "accountant"],
  pharmacy: ["manager", "pharmacist", "cashier", "accountant"],
  hardware: ["manager", "cashier", "salesperson", "stock-keeper", "accountant"],
};

export default function PermissionsManager() {
  const { refreshPerms, user } = useAuth();
  const isSuperAdmin = user?.role === "owner";       // Super Admin — full bypass, edits tenant config
  const isTenantAdmin = user?.role === "admin";      // Tenant Admin — scoped to industry, edits roles only
  const isManager = !isSuperAdmin && !isTenantAdmin && (
    user?.role === "manager" ||
    Object.values(user?.industry_roles || {}).includes("manager")
  );
  const canEditModules = isSuperAdmin;
  const canEditRoles = isSuperAdmin || isTenantAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState({ modules: {}, default_role_permissions: {} });
  const [modules, setModules] = useState({});          // {module: bool}
  const [rolePerms, setRolePerms] = useState({});      // {role: [modules]}
  const [allowedInds, setAllowedInds] = useState([]);  // read-only: which industries this tenant can use
  const [industryFilter, setIndustryFilter] = useState("restaurant");

  const load = async () => {
    setLoading(true);
    try {
      const [cat, cur] = await Promise.all([
        api.get("/permissions/catalog"),
        api.get("/permissions"),
      ]);
      setCatalog(cat.data);
      setModules(cur.data.modules || {});
      setRolePerms(cur.data.role_permissions || {});
      const inds = cur.data.allowed_industries || [];
      setAllowedInds(inds);
      if (inds.length > 0 && !inds.includes(industryFilter)) {
        setIndustryFilter(inds[0]);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Modules relevant to selected industry (or "*").
  const industryModules = useMemo(() => {
    const out = [];
    Object.entries(catalog.modules || {}).forEach(([key, meta]) => {
      const inds = meta.industries || [];
      if (inds.includes("*") || inds.includes(industryFilter)) {
        out.push({ key, ...meta });
      }
    });
    return out;
  }, [catalog, industryFilter]);

  // Group by category for readability.
  const byCategory = useMemo(() => {
    const g = {};
    industryModules.forEach((m) => {
      g[m.category] = g[m.category] || [];
      g[m.category].push(m);
    });
    return g;
  }, [industryModules]);

  const toggleModule = (key, on) => {
    setModules((prev) => ({ ...prev, [key]: !!on }));
  };

  const toggleRolePerm = (role, moduleKey, on) => {
    setRolePerms((prev) => {
      const cur = new Set(prev[role] || []);
      if (on) cur.add(moduleKey); else cur.delete(moduleKey);
      return { ...prev, [role]: Array.from(cur) };
    });
  };

  const resetRoleToDefault = (role) => {
    const def = catalog.default_role_permissions?.[role] || [];
    setRolePerms((prev) => ({ ...prev, [role]: def }));
    toast.success(`${ROLE_LABELS[role] || role} reset to default permissions`);
  };

  const saveModules = async () => {
    setSaving(true);
    try {
      await api.put("/permissions/modules", { modules });
      toast.success("Module toggles saved");
      await refreshPerms();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const saveRoles = async () => {
    setSaving(true);
    try {
      await api.put("/permissions/roles", { role_permissions: rolePerms });
      toast.success("Role permissions saved");
      await refreshPerms();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading permissions…</div>;
  }

  const rolesForIndustry = INDUSTRY_ROLES[industryFilter] || Object.keys(ROLE_LABELS);

  return (
    <div className="space-y-4" data-testid="permissions-manager">
      <Tabs defaultValue={canEditModules ? "modules" : "roles"}>
        <TabsList className="rounded-sm">
          <TabsTrigger value="modules" data-testid="perm-tab-modules" disabled={!canEditModules}>
            <Layers className="w-3.5 h-3.5 mr-2" />Layer 1: Tenant Modules
            {!canEditModules && <Lock className="w-3 h-3 ml-1.5 text-muted-foreground" />}
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="perm-tab-roles">
            <UsersIcon className="w-3.5 h-3.5 mr-2" />Layer 2: Role Permissions
          </TabsTrigger>
        </TabsList>

        {/* -------- LAYER 1: TENANT MODULES -------- */}
        <TabsContent value="modules" className="mt-4">
          <Card className="rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-heading text-lg font-bold">Enabled modules for your business</div>
                <div className="text-xs text-muted-foreground">
                  Turn off modules you don&apos;t use — they&apos;ll disappear from every user&apos;s sidebar.
                </div>
              </div>
              <Button className="rounded-sm gap-2" onClick={saveModules} disabled={saving} data-testid="save-modules">
                <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Modules"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(byCategory).map(([cat, mods]) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">{cat}</div>
                  <div className="space-y-2">
                    {mods.map((m) => (
                      <div key={m.key} className="flex items-center justify-between rounded-sm border border-border px-3 py-2 hover:bg-secondary/30">
                        <div>
                          <div className="text-sm font-medium">{m.label}</div>
                          <code className="text-[10px] text-muted-foreground">{m.key}</code>
                        </div>
                        <Switch
                          checked={modules[m.key] !== false}
                          onCheckedChange={(v) => toggleModule(m.key, v)}
                          data-testid={`toggle-module-${m.key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* -------- LAYER 2: ROLE MATRIX -------- */}
        <TabsContent value="roles" className="mt-4">
          <Card className="rounded-sm p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-4 sticky left-0">
              <div>
                <div className="font-heading text-lg font-bold">Role → Module matrix</div>
                <div className="text-xs text-muted-foreground">
                  For enabled modules only, tick which roles can access each. Greyed rows are disabled at the tenant level.
                </div>
              </div>
              <Button className="rounded-sm gap-2" onClick={saveRoles} disabled={saving || !canEditRoles} data-testid="save-role-perms">
                <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Roles"}
              </Button>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 sticky left-0 bg-card min-w-[220px]">Module</th>
                  {rolesForIndustry.map((r) => (
                    <th key={r} className="px-2 py-2 text-center min-w-[110px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold">{ROLE_LABELS[r] || r}</span>
                        <button
                          className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                          onClick={() => resetRoleToDefault(r)}
                          data-testid={`reset-role-${r}`}
                        >
                          Reset default
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {industryModules.map((m) => {
                  const enabled = modules[m.key] !== false;
                  return (
                    <tr key={m.key} className={`border-b border-border/60 ${enabled ? "" : "opacity-40"}`}>
                      <td className="py-2 pr-4 sticky left-0 bg-card">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.label}</span>
                          {!enabled && <Badge variant="outline" className="rounded-sm text-[9px]">DISABLED</Badge>}
                        </div>
                        <code className="text-[10px] text-muted-foreground">{m.key}</code>
                      </td>
                      {rolesForIndustry.map((r) => {
                        const checked = (rolePerms[r] || []).includes(m.key);
                        return (
                          <td key={r} className="text-center px-2 py-2">
                            <Checkbox
                              checked={checked}
                              disabled={!enabled || !canEditRoles || (isManager && r === "manager")}
                              onCheckedChange={(v) => toggleRolePerm(r, m.key, v)}
                              data-testid={`perm-${r}-${m.key}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
