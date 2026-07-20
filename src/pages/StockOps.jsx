import { useEffect, useMemo, useState } from "react";
import { api, fmtINR, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Package, ArrowLeftRight, PackageMinus, Search } from "lucide-react";

export default function StockOps() {
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [openAdj, setOpenAdj] = useState(false);
  const [openTrn, setOpenTrn] = useState(false);
  const [adjForm, setAdjForm] = useState({ reason: "damage", notes: "", items: [] });
  const [trnForm, setTrnForm] = useState({ from_branch_id: "", to_branch_id: "", notes: "", items: [] });
  const [pickerFor, setPickerFor] = useState(null); // 'adj' | 'trn'
  const [pickerQ, setPickerQ] = useState("");

  const load = async () => {
    const [i, b, a, t] = await Promise.all([
      api.get("/items"), api.get("/branches"),
      api.get("/stock-adjustments"), api.get("/stock-transfers"),
    ]);
    setItems(i.data); setBranches(b.data); setAdjustments(a.data); setTransfers(t.data);
  };
  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    const s = pickerQ.toLowerCase();
    return items.filter((i) => ["product", "medicine"].includes(i.item_type) && (!s || i.name.toLowerCase().includes(s))).slice(0, 12);
  }, [items, pickerQ]);

  const addLine = (it, target) => {
    const line = { item_id: it.id, name: it.name, quantity: target === "adj" ? -1 : 1 };
    if (target === "adj") setAdjForm((f) => ({ ...f, items: [...f.items, line] }));
    else setTrnForm((f) => ({ ...f, items: [...f.items, line] }));
    setPickerQ("");
  };
  const upd = (target, idx, patch) => {
    if (target === "adj") setAdjForm((f) => ({ ...f, items: f.items.map((l, i) => i === idx ? { ...l, ...patch } : l) }));
    else setTrnForm((f) => ({ ...f, items: f.items.map((l, i) => i === idx ? { ...l, ...patch } : l) }));
  };
  const rm = (target, idx) => {
    if (target === "adj") setAdjForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    else setTrnForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const saveAdj = async () => {
    if (!adjForm.items.length) return toast.error("Add items");
    try { await api.post("/stock-adjustments", adjForm); toast.success("Stock adjustment saved"); setOpenAdj(false); setAdjForm({ reason: "damage", notes: "", items: [] }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const saveTrn = async () => {
    if (!trnForm.from_branch_id || !trnForm.to_branch_id) return toast.error("Choose branches");
    if (!trnForm.items.length) return toast.error("Add items");
    try { await api.post("/stock-transfers", trnForm); toast.success("Transfer recorded"); setOpenTrn(false); setTrnForm({ from_branch_id: "", to_branch_id: "", notes: "", items: [] }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="stockops-page">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold">Inventory</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Stock Operations</h1>
      </div>

      <Tabs defaultValue="adj">
        <TabsList className="rounded-md">
          <TabsTrigger value="adj" data-testid="tab-adj"><PackageMinus className="w-3.5 h-3.5 mr-2" />Adjustments</TabsTrigger>
          <TabsTrigger value="trn" data-testid="tab-trn"><ArrowLeftRight className="w-3.5 h-3.5 mr-2" />Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="adj" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={openAdj} onOpenChange={setOpenAdj}>
              <DialogTrigger asChild><Button className="rounded-md gap-2" data-testid="new-adj-btn"><Plus className="w-4 h-4" />New Adjustment</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle><DialogDescription>Increase or decrease stock with a reason (damage, correction, opening, etc).</DialogDescription></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Reason</Label>
                    <Select value={adjForm.reason} onValueChange={(v) => setAdjForm({ ...adjForm, reason: v })}>
                      <SelectTrigger className="rounded-md mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["damage", "theft", "expiry", "correction", "shortage", "other"].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Notes</Label><Input value={adjForm.notes} onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })} className="rounded-md mt-1" /></div>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input placeholder="Search item to adjust…" value={pickerQ} onChange={(e) => { setPickerQ(e.target.value); setPickerFor("adj"); }} className="pl-9 rounded-md" />
                </div>
                {pickerQ && pickerFor === "adj" && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                    {filteredItems.map((it) => (
                      <button key={it.id} className="w-full flex justify-between p-2 hover:bg-accent text-left text-sm border-b border-border last:border-0" onClick={() => addLine(it, "adj")}>
                        <span>{it.name}</span><span className="text-muted-foreground">Stock {it.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Change (±)</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {adjForm.items.map((l, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{l.name}</TableCell>
                        <TableCell><Input type="number" value={l.quantity} onChange={(e) => upd("adj", idx, { quantity: parseFloat(e.target.value) || 0 })} className="h-8 w-24 rounded-md text-right tabular" /></TableCell>
                        <TableCell><Input value={l.reason || ""} onChange={(e) => upd("adj", idx, { reason: e.target.value })} className="h-8 rounded-md" /></TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => rm("adj", idx)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <DialogFooter><Button variant="outline" onClick={() => setOpenAdj(false)} className="rounded-md">Cancel</Button><Button className="rounded-md" onClick={saveAdj} data-testid="save-adj">Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="rounded-xl overflow-hidden card-elev">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Number</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Items</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.number}</TableCell>
                    <TableCell className="text-xs">{a.date}</TableCell>
                    <TableCell><Badge variant="outline" className="rounded-md text-[10px] uppercase">{a.reason}</Badge></TableCell>
                    <TableCell className="text-xs">{a.items?.length || 0} items · {a.items?.map((i) => `${i.name} (${i.quantity > 0 ? "+" : ""}${i.quantity})`).join(", ")}</TableCell>
                  </TableRow>
                ))}
                {adjustments.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No adjustments yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="trn" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={openTrn} onOpenChange={setOpenTrn}>
              <DialogTrigger asChild><Button className="rounded-md gap-2" data-testid="new-trn-btn"><Plus className="w-4 h-4" />New Transfer</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Branch-to-Branch Transfer</DialogTitle><DialogDescription>Move stock between branches. Source stock decreases and destination increases.</DialogDescription></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>From Branch</Label>
                    <Select value={trnForm.from_branch_id} onValueChange={(v) => setTrnForm({ ...trnForm, from_branch_id: v })}>
                      <SelectTrigger className="rounded-md mt-1"><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>To Branch</Label>
                    <Select value={trnForm.to_branch_id} onValueChange={(v) => setTrnForm({ ...trnForm, to_branch_id: v })}>
                      <SelectTrigger className="rounded-md mt-1"><SelectValue placeholder="Destination" /></SelectTrigger>
                      <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input placeholder="Search item to transfer…" value={pickerQ} onChange={(e) => { setPickerQ(e.target.value); setPickerFor("trn"); }} className="pl-9 rounded-md" />
                </div>
                {pickerQ && pickerFor === "trn" && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                    {filteredItems.map((it) => (
                      <button key={it.id} className="w-full flex justify-between p-2 hover:bg-accent text-left text-sm border-b border-border last:border-0" onClick={() => addLine(it, "trn")}>
                        <span>{it.name}</span><span className="text-muted-foreground">Stock {it.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {trnForm.items.map((l, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{l.name}</TableCell>
                        <TableCell><Input type="number" value={l.quantity} onChange={(e) => upd("trn", idx, { quantity: parseFloat(e.target.value) || 0 })} className="h-8 w-24 rounded-md text-right tabular" /></TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => rm("trn", idx)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <DialogFooter><Button variant="outline" onClick={() => setOpenTrn(false)} className="rounded-md">Cancel</Button><Button className="rounded-md" onClick={saveTrn} data-testid="save-trn">Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="rounded-xl overflow-hidden card-elev">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Number</TableHead><TableHead>Date</TableHead><TableHead>From → To</TableHead><TableHead>Items</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {transfers.map((t) => {
                  const fromB = branches.find((b) => b.id === t.from_branch_id)?.name;
                  const toB = branches.find((b) => b.id === t.to_branch_id)?.name;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.number}</TableCell>
                      <TableCell className="text-xs">{t.date}</TableCell>
                      <TableCell className="text-sm"><span className="font-semibold">{fromB}</span> → <span className="font-semibold">{toB}</span></TableCell>
                      <TableCell className="text-xs">{t.items?.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</TableCell>
                    </TableRow>
                  );
                })}
                {transfers.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No transfers yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
