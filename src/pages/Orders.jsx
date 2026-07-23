import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { ClipboardList, ArrowRight, Search, Package, IndianRupee, Trash2, Truck } from "lucide-react";

const STATUS_COLORS = {
  pending:   "bg-amber-500/20 text-amber-700 border-amber-500/30",
  delivered: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  invoiced:  "bg-purple-500/20 text-purple-700 border-purple-500/30",
  cancelled: "bg-rose-500/20 text-rose-700 border-rose-500/30",
};

export default function Orders() {
  const { industry } = useAuth();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/orders");
      setRows(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, [industry]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => (r.number || "").toLowerCase().includes(s) || (r.customer_name || "").toLowerCase().includes(s));
  }, [q, rows]);

  const setStatus = async (r, status) => {
    try {
      await api.post(`/orders/${r.id}/status?status=${status}`);
      toast.success(`Marked as ${status}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const convertToInvoice = async (r) => {
    if (!window.confirm(`Generate invoice for order ${r.number}?`)) return;
    try {
      const { data } = await api.post(`/orders/${r.id}/convert-to-invoice`);
      toast.success(`Invoice ${data.number} generated`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const del = async (r) => {
    if (!window.confirm(`Delete order ${r.number}?`)) return;
    try {
      await api.delete(`/orders/${r.id}`);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="p-8 space-y-4" data-testid="orders-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Sales Pipeline</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Sales Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Fulfil orders that came from accepted quotations, then invoice them.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Search order no / customer…" className="pl-9 h-10 rounded-sm min-w-[280px]"
            value={q} onChange={(e) => setQ(e.target.value)} data-testid="orders-search" />
        </div>
      </div>

      <Card className="rounded-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto opacity-40 mb-3" />
            {q ? `No orders match "${q}".` : "No orders yet — convert a quotation to create one."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>From Quote</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} data-testid={`order-row-${r.id}`}>
                  <TableCell className="font-mono text-xs">{r.number}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.quote_number || "—"}</TableCell>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell><span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-muted-foreground" />{r.items?.length || 0}</span></TableCell>
                  <TableCell className="text-right tabular-nums"><span className="flex items-center justify-end gap-1"><IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />{r.grand_total?.toFixed(2)}</span></TableCell>
                  <TableCell className="text-xs">{r.delivery_date || "—"}</TableCell>
                  <TableCell><Badge className={`rounded-sm text-[10px] uppercase ${STATUS_COLORS[r.status]}`}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "pending" && (
                        <Button variant="outline" size="sm" className="h-7 rounded-sm gap-1 text-xs border-blue-500/40 text-blue-700" onClick={() => setStatus(r, "delivered")} data-testid={`deliver-${r.id}`}>
                          <Truck className="w-3 h-3" /> Delivered
                        </Button>
                      )}
                      {r.status !== "invoiced" && r.status !== "cancelled" && (
                        <>
                          <Button variant="outline" size="sm" className="h-7 rounded-sm gap-1 text-xs" onClick={() => convertToInvoice(r)} data-testid={`to-invoice-${r.id}`}>
                            <ArrowRight className="w-3 h-3" /> To Invoice
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600" onClick={() => del(r)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {r.status === "invoiced" && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">→ Invoiced</span>
                      )}
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
