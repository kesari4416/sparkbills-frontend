import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { AlertTriangle, Package, Clock, Pill } from "lucide-react";

export default function Pharmacy() {
  const [low, setLow] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    api.get("/items/alerts/low-stock").then((r) => setLow(r.data));
    api.get("/items/alerts/expiry").then((r) => setExpiring(r.data));
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="pharmacy-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Pharmacy</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Inventory Board</h1>
        </div>
        <Button className="rounded-sm gap-2" onClick={() => nav("/app/pos")}>
          <Pill className="w-4 h-4" /> Open Pharmacy POS
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <div className="font-heading font-semibold">Low Stock ({low.length})</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Item</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Stock</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Reorder At</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {low.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium"><Package className="w-3 h-3 inline text-muted-foreground mr-2" />{i.name}</TableCell>
                  <TableCell className="text-right tabular text-destructive font-semibold">{i.stock} {i.unit}</TableCell>
                  <TableCell className="text-right tabular text-muted-foreground">{i.low_stock_alert}</TableCell>
                </TableRow>
              ))}
              {low.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">Everything is well stocked. 🎯</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        <Card className="rounded-sm overflow-hidden">
          <div className="p-4 flex items-center gap-2 border-b border-border">
            <Clock className="w-4 h-4 text-primary" />
            <div className="font-heading font-semibold">Expiring Soon (≤90 days)</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Medicine</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Batch</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Expiry</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {expiring.flatMap((med) =>
                (med.expiring_batches || []).map((b, i) => (
                  <TableRow key={`${med.id}-${i}`}>
                    <TableCell className="font-medium">{med.name}</TableCell>
                    <TableCell className="font-mono text-xs">{b.batch_no}</TableCell>
                    <TableCell><Badge variant="outline" className="rounded-sm text-[10px] text-destructive border-destructive/30">{b.expiry_date}</Badge></TableCell>
                  </TableRow>
                ))
              )}
              {expiring.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">No batches expiring soon.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
