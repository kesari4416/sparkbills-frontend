import { useEffect, useState } from "react";
import { api, formatApiError, fmtINR } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Truck, Trash2, Pencil } from "lucide-react";

const empty = {
  name: "", phone: "", email: "", gstin: "", address: "",
  state: "Karnataka", state_code: "29", opening_balance: 0,
};

export default function Suppliers() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);
  const { industry } = useAuth();
  const load = async () => setItems((await api.get("/suppliers")).data);
  // Refetch on workspace switch so the list matches the active industry.
  useEffect(() => { load(); }, [industry]);

  const openNew = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name || "", phone: s.phone || "", email: s.email || "",
      gstin: s.gstin || "", address: s.address || "",
      state: s.state || "Karnataka", state_code: s.state_code || "29",
      opening_balance: s.opening_balance || 0,
    });
    setOpen(true);
  };
  const save = async () => {
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", form);
        toast.success("Supplier added");
      }
      setOpen(false); setEditingId(null); setForm(empty); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const del = async (id) => {
    if (!confirm("Delete this supplier?")) return;
    try { await api.delete(`/suppliers/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="suppliers-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Master Data</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Suppliers</h1>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(empty); } }}>
          <DialogTrigger asChild>
            <Button className="rounded-sm gap-2" data-testid="new-supplier-btn" onClick={openNew}>
              <Plus className="w-4 h-4" /> New Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Supplier" : "New Supplier"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name</Label><Input data-testid="sup-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>State Code</Label><Input value={form.state_code} onChange={(e) => setForm({ ...form, state_code: e.target.value })} className="rounded-sm mt-1" /></div>
              <div><Label>Opening Balance</Label><Input type="number" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-sm mt-1" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
              <Button data-testid="save-supplier" className="rounded-sm" onClick={save}>
                {editingId ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-sm overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[10px] uppercase tracking-widest">Name</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Phone</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">GSTIN</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Payable</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id} data-testid={`sup-row-${s.id}`}>
                <TableCell className="font-medium"><Truck className="w-3 h-3 inline text-muted-foreground mr-2" />{s.name}</TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell className="text-xs">{s.gstin || "—"}</TableCell>
                <TableCell className={`text-right tabular ${s.balance > 0 ? "text-destructive" : "text-muted-foreground"}`}>{fmtINR(s.balance || 0)}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)} data-testid={`sup-edit-${s.id}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(s.id)} data-testid={`sup-del-${s.id}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-16 text-muted-foreground">No suppliers yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
