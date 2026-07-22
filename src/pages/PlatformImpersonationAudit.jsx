import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { LogIn, LogOut, History } from "lucide-react";
import { toast } from "sonner";

function fmt(ts) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

export default function PlatformImpersonationAudit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/platform/impersonation-audit")
      .then((r) => setRows(r.data))
      .catch((e) => toast.error(formatApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-4 text-white" data-testid="platform-audit-page">
      <div className="flex items-center gap-3">
        <History className="w-5 h-5 text-blue-400" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400">Platform Control</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Impersonation Audit</h1>
          <p className="text-sm text-blue-200/60 mt-1">Every start/stop of a &quot;Login as client&quot; session — for compliance &amp; incident response.</p>
        </div>
      </div>

      <Card className="rounded-sm overflow-hidden bg-white/[0.03] border-white/10 text-white">
        {loading ? (
          <div className="p-8 text-center text-blue-200/60">Loading audit log…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-blue-200/50">
            <History className="w-10 h-10 mx-auto opacity-40 mb-3" />
            No impersonation events yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-blue-300/70">When</TableHead>
                <TableHead className="text-blue-300/70">Action</TableHead>
                <TableHead className="text-blue-300/70">Super Admin</TableHead>
                <TableHead className="text-blue-300/70">Impersonated</TableHead>
                <TableHead className="text-blue-300/70">Client</TableHead>
                <TableHead className="text-blue-300/70">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="text-xs">{fmt(r.created_at)}</TableCell>
                  <TableCell>
                    {r.action === "start" ? (
                      <Badge className="rounded-sm text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"><LogIn className="w-3 h-3" />START</Badge>
                    ) : (
                      <Badge className="rounded-sm text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"><LogOut className="w-3 h-3" />STOP</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{r.super_admin_email}</TableCell>
                  <TableCell className="text-xs">{r.target_email}</TableCell>
                  <TableCell className="text-xs">{r.target_business_name || r.target_business_id}</TableCell>
                  <TableCell className="text-xs text-blue-200/60 font-mono">{r.ip || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
