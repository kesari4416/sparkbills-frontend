import { useEffect, useState } from "react";
import { api, formatApiError, fmtINR } from "@/lib/apiClient";
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
import { Plus, Search, Users, Trash2, Pencil } from "lucide-react";

const empty = {
  name: "", phone: "", email: "", gstin: "", address: "",
  state: "Karnataka", state_code: "29", opening_balance: 0, customer_type: "walk-in",
};

export default function Customers() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await api.get("/customers", { params: { search } });
    setItems(data);
  };
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [search]);

  const openNew = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name || "", phone: c.phone || "", email: c.email || "",
      gstin: c.gstin || "", address: c.address || "",
      state: c.state || "Karnataka", state_code: c.state_code || "29",
      opening_balance: c.opening_balance || 0,
      customer_type: c.customer_type || "walk-in",
    });
    setOpen(true);
  };
  const save = async () => {
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
        toast.success("Customer updated");
      } else {
        await api.post("/customers", form);
        toast.success("Customer added");
      }
      setForm(empty); setEditingId(null); setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const del = async (id) => {
    if (!confirm("Delete customer?")) return;
    try { await api.delete(`/customers/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="customers-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Master Data</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Customers</h1>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(empty); } }}>
          <DialogTrigger asChild>
            <Button className="rounded-sm gap-2" data-testid="new-customer-btn" onClick={openNew}><Plus className="w-4 h-4" /> New Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Customer" : "New Customer"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name</Label><Input data-testid="cust-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-sm mt-1" /></div>
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
              <Button data-testid="save-customer" className="rounded-sm" onClick={save}>
                {editingId ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-sm p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Search name / phone" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-sm" data-testid="cust-search" />
        </div>
      </Card>

      <Card className="rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Name</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Phone</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">GSTIN</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">State</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Balance</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id} data-testid={`cust-row-${c.id}`}>
                <TableCell className="font-medium"><Users className="w-3 h-3 inline text-muted-foreground mr-2" />{c.name}</TableCell>
                <TableCell>{c.phone || "—"}</TableCell>
                <TableCell className="text-xs">{c.gstin || "—"}</TableCell>
                <TableCell>{c.state}</TableCell>
                <TableCell className={`text-right tabular ${c.balance > 0 ? "text-destructive" : "text-muted-foreground"}`}>{fmtINR(c.balance || 0)}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`cust-edit-${c.id}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(c.id)} data-testid={`cust-del-${c.id}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground">No customers yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
