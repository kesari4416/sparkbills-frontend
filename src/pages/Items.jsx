import { useEffect, useState } from "react";
import { api, formatApiError, API } from "@/lib/apiClient";
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
import { toast } from "sonner";
import { Plus, Search, Package, Pencil, Trash2, Barcode } from "lucide-react";

const ITEM_TYPES = [
  { id: "product", label: "Product" },
  { id: "medicine", label: "Medicine" },
  { id: "menu", label: "Menu Item" },
  { id: "service", label: "Service" },
];

const emptyItem = {
  name: "", item_type: "product", sku: "", barcode: "", hsn_sac: "",
  unit: "PCS", category: "", sale_price: 0, purchase_price: 0, mrp: 0,
  gst_rate: 18, stock: 0, low_stock_alert: 5, is_veg: true,
  manufacturer: "", prescription_required: false, variants: [], addons: [], batches: [],
};

export default function Items() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [selected, setSelected] = useState({}); // {id: copies}
  const [labelDialog, setLabelDialog] = useState(false);
  const [labelSize, setLabelSize] = useState("38x25");
  const [labelPrinting, setLabelPrinting] = useState(false);

  const toggleSel = (id) => setSelected((s) => {
    const next = { ...s };
    if (next[id]) delete next[id]; else next[id] = 1;
    return next;
  });
  const setCopies = (id, n) => setSelected((s) => ({ ...s, [id]: Math.max(1, n) }));
  const clearSel = () => setSelected({});

  const printLabels = async () => {
    const ids = Object.keys(selected);
    if (!ids.length) return toast.error("Select items first");
    setLabelPrinting(true);
    try {
      const resp = await api.post("/items/labels-pdf",
        { item_ids: ids, copies: selected, label_size: labelSize, show_price: true, show_name: true },
        { responseType: "blob" });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setLabelDialog(false);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLabelPrinting(false); }
  };

  const load = async () => {
    const params = { search };
    if (type !== "all") params.item_type = type;
    const { data } = await api.get("/items", { params });
    setItems(data);
  };

  useEffect(() => { load(); }, [type]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openNew = () => { setEditing(null); setForm(emptyItem); setOpen(true); };
  const openEdit = (i) => { setEditing(i); setForm({ ...emptyItem, ...i }); setOpen(true); };

  const save = async () => {
    try {
      if (editing) await api.put(`/items/${editing.id}`, form);
      else await api.post("/items", form);
      toast.success(editing ? "Item updated" : "Item added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => {
    if (!confirm("Delete this item?")) return;
    await api.delete(`/items/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8" data-testid="items-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Master Data</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Items & Products</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-sm gap-2"
            data-testid="print-labels-btn"
            onClick={() => setLabelDialog(true)}
            disabled={!Object.keys(selected).length}>
            <Barcode className="w-4 h-4" /> Print Labels ({Object.keys(selected).length})
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-sm gap-2" data-testid="new-item-btn" onClick={openNew}>
              <Plus className="w-4 h-4" /> New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Item" : "New Item"}</DialogTitle><DialogDescription>Set up product / menu item / medicine with pricing, tax and add-ons.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input data-testid="item-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
                  <SelectTrigger className="rounded-sm mt-1" data-testid="item-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>HSN / SAC</Label>
                <Input value={form.hsn_sac} onChange={(e) => setForm({ ...form, hsn_sac: e.target.value })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-sm mt-1" placeholder="PCS / KG / L" />
              </div>
              <div>
                <Label>Sale Price (₹)</Label>
                <Input type="number" data-testid="item-price" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Purchase Price (₹)</Label>
                <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>MRP (₹)</Label>
                <Input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Select value={String(form.gst_rate)} onValueChange={(v) => setForm({ ...form, gst_rate: parseFloat(v) })}>
                  <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 5, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Opening Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" />
              </div>
              <div>
                <Label>Low Stock Alert</Label>
                <Input type="number" value={form.low_stock_alert} onChange={(e) => setForm({ ...form, low_stock_alert: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" />
              </div>
              {form.item_type === "medicine" && (
                <>
                  <div className="col-span-2">
                    <Label>Manufacturer</Label>
                    <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="rounded-sm mt-1" />
                  </div>
                </>
              )}
              {form.item_type === "menu" && (
                <>
                  <div className="col-span-2 flex items-center gap-2 mt-1">
                    <input type="checkbox" id="veg" checked={form.is_veg !== false}
                      onChange={(e) => setForm({ ...form, is_veg: e.target.checked })}
                      className="rounded-sm" data-testid="item-veg" />
                    <Label htmlFor="veg" className="cursor-pointer">Vegetarian item</Label>
                  </div>
                  <div className="col-span-2 border-t border-border pt-3 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Add-ons (extra cheese, sauce, sides…)</Label>
                      <Button type="button" size="sm" variant="outline" className="rounded-sm h-7 gap-1"
                        onClick={() => setForm({ ...form, addons: [...(form.addons || []), { name: "", price: 0 }] })}
                        data-testid="add-addon">
                        <Plus className="w-3 h-3" /> Add-on
                      </Button>
                    </div>
                    {(form.addons || []).length === 0 ? (
                      <div className="text-xs text-muted-foreground">No add-ons defined.</div>
                    ) : (
                      <div className="space-y-2">
                        {form.addons.map((a, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input placeholder="Add-on name" value={a.name}
                              onChange={(e) => {
                                const arr = [...form.addons]; arr[i] = { ...a, name: e.target.value };
                                setForm({ ...form, addons: arr });
                              }} className="rounded-sm h-8 flex-1" data-testid={`addon-name-${i}`} />
                            <Input type="number" placeholder="₹" value={a.price}
                              onChange={(e) => {
                                const arr = [...form.addons]; arr[i] = { ...a, price: parseFloat(e.target.value) || 0 };
                                setForm({ ...form, addons: arr });
                              }} className="rounded-sm h-8 w-24 text-right tabular" data-testid={`addon-price-${i}`} />
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => setForm({ ...form, addons: form.addons.filter((_, x) => x !== i) })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-2 mt-2">
                      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Variants (small / medium / large — price delta)</Label>
                      <Button type="button" size="sm" variant="outline" className="rounded-sm h-7 gap-1"
                        onClick={() => setForm({ ...form, variants: [...(form.variants || []), { name: "", price_delta: 0 }] })}
                        data-testid="add-variant">
                        <Plus className="w-3 h-3" /> Variant
                      </Button>
                    </div>
                    {(form.variants || []).length === 0 ? (
                      <div className="text-xs text-muted-foreground">No variants defined.</div>
                    ) : (
                      <div className="space-y-2">
                        {form.variants.map((v, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input placeholder="Variant name" value={v.name}
                              onChange={(e) => {
                                const arr = [...form.variants]; arr[i] = { ...v, name: e.target.value };
                                setForm({ ...form, variants: arr });
                              }} className="rounded-sm h-8 flex-1" data-testid={`variant-name-${i}`} />
                            <Input type="number" placeholder="± ₹" value={v.price_delta}
                              onChange={(e) => {
                                const arr = [...form.variants]; arr[i] = { ...v, price_delta: parseFloat(e.target.value) || 0 };
                                setForm({ ...form, variants: arr });
                              }} className="rounded-sm h-8 w-24 text-right tabular" data-testid={`variant-price-${i}`} />
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => setForm({ ...form, variants: form.variants.filter((_, x) => x !== i) })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="rounded-sm" data-testid="save-item" onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Label sheet dialog */}
      <Dialog open={labelDialog} onOpenChange={setLabelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Barcode Labels</DialogTitle>
            <DialogDescription>
              {Object.keys(selected).length} item{Object.keys(selected).length === 1 ? "" : "s"} selected.
              Set copies per item and choose label size, then generate the A4 sheet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Label size</Label>
              <Select value={labelSize} onValueChange={setLabelSize}>
                <SelectTrigger className="rounded-sm mt-1" data-testid="label-size"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="38x25">38 × 25 mm (default)</SelectItem>
                  <SelectItem value="50x25">50 × 25 mm</SelectItem>
                  <SelectItem value="40x20">40 × 20 mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-border pt-2 max-h-64 overflow-y-auto">
              {Object.entries(selected).map(([id, copies]) => {
                const it = items.find((x) => x.id === id);
                if (!it) return null;
                return (
                  <div key={id} className="flex items-center gap-2 py-1">
                    <div className="flex-1 text-sm truncate">{it.name}</div>
                    <Input type="number" min="1" value={copies}
                      onChange={(e) => setCopies(id, parseInt(e.target.value, 10) || 1)}
                      className="h-8 w-16 rounded-sm text-right tabular"
                      data-testid={`label-copies-${id}`} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleSel(id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-sm" onClick={clearSel}>Clear selection</Button>
            <Button variant="outline" className="rounded-sm" onClick={() => setLabelDialog(false)}>Cancel</Button>
            <Button className="rounded-sm" onClick={printLabels} disabled={labelPrinting} data-testid="label-print">
              {labelPrinting ? "Generating…" : "Generate PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-sm p-4 mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            data-testid="items-search"
            placeholder="Search name / SKU / barcode"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-sm"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48 rounded-sm" data-testid="items-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ITEM_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Name</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Type</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">HSN</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Price</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">GST</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-right">Stock</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id} data-testid={`item-row-${i.id}`}>
                <TableCell>
                  <input type="checkbox" checked={!!selected[i.id]}
                    onChange={() => toggleSel(i.id)}
                    className="rounded-sm"
                    data-testid={`select-item-${i.id}`} />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    {i.name}
                    {i.sku && <span className="text-xs text-muted-foreground">· {i.sku}</span>}
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary" className="rounded-sm text-[10px] uppercase">{i.item_type}</Badge></TableCell>
                <TableCell className="text-xs">{i.hsn_sac || "—"}</TableCell>
                <TableCell className="text-right tabular">₹{i.sale_price?.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular">{i.gst_rate}%</TableCell>
                <TableCell className={`text-right tabular ${i.stock <= (i.low_stock_alert || 0) && i.item_type !== "service" ? "text-destructive" : ""}`}>
                  {i.item_type === "service" ? "—" : `${i.stock} ${i.unit || ""}`}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(i)} data-testid={`edit-${i.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(i.id)} data-testid={`del-${i.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-16">No items yet — click <b>New Item</b> to add one.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
