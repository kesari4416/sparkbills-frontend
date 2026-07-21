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
import { Plus, Search, Package, Pencil, Trash2, Barcode, Coffee, Apple, ShoppingBag, Wrench, Pill, Tv } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  manufacturer: "", generic_name: "", prescription_required: false,
  variants: [], addons: [], batches: [],
  brand: "", department: "", color: "", size_stocks: [],
  model_number: "", warranty_months: 0, energy_rating: "", imei_required: false,
};

const DEPARTMENTS = ["Men", "Women", "Kids", "Home", "Unisex"];
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const PHARMACY_CATEGORIES = [
  "Tablets", "Capsules", "Syrups", "Injections", "Drops", "Creams",
  "Ointments", "Powders", "Surgical", "Baby Care", "Personal Care",
  "Supplements", "Ayurvedic", "Homeopathy",
];
const ELECTRONICS_DEPARTMENTS = [
  "Televisions", "Refrigerators", "Washing Machines", "Air Conditioners",
  "Kitchen Appliances", "Computers", "Accessories", "CCTV",
];
const ELECTRONICS_BRANDS = [
  "Samsung", "LG", "Sony", "Panasonic", "Whirlpool", "Godrej", "Haier",
  "IFB", "Dell", "HP", "Lenovo", "Prestige", "Daikin", "Voltas", "Philips",
];

export default function Items() {
  const { industry } = useAuth();
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
  const [seeding, setSeeding] = useState(false);

  const seedTeaShop = async () => {
    if (!confirm("This will add ~95 sample tea & snacks items to your catalogue. Existing items are kept intact. Continue?")) return;
    setSeeding(true);
    try {
      const { data } = await api.post("/items/seed/tea-shop");
      toast.success(`Seeded ${data.inserted} items (${data.skipped} already existed).`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSeeding(false); }
  };

  const seedFruitsVeg = async () => {
    if (!confirm("This will add ~75 sample fruits & vegetables to your catalogue with categories, HSN codes and GST. Existing items are kept intact. Continue?")) return;
    setSeeding(true);
    try {
      const { data } = await api.post("/items/seed/fruits-veg");
      toast.success(`Seeded ${data.inserted} produce items (${data.skipped} already existed).`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSeeding(false); }
  };

  const seedSupermarket = async () => {
    if (!confirm("This will add ~110 sample supermarket SKUs across 14 categories (Groceries, Spices, Dairy, Snacks, Beverages, Frozen, Personal Care, Cleaning, Baby, Stationery etc.) with HSN + GST. Existing items are kept intact. Continue?")) return;
    setSeeding(true);
    try {
      const { data } = await api.post("/items/seed/supermarket");
      toast.success(`Seeded ${data.inserted} SKUs (${data.skipped} already existed).`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSeeding(false); }
  };

  const seedTextile = async (replace = false) => {
    const msg = replace
      ? "This will DELETE every existing item in your catalogue and load ~60 textile SKUs (Men's / Women's / Kids Wear, Fabric, Footwear, Accessories, Home Textiles, Innerwear, Wedding Wear) with HSN + GST + size variants + wholesale prices. This action cannot be undone. Continue?"
      : "This will add ~60 sample textile SKUs across 9 category groups (Men's / Women's / Kids Wear, Fabric, Footwear, Accessories, Home Textiles, Innerwear, Wedding Wear) with HSN + GST + size variants + wholesale prices. Existing items are kept intact. Continue?";
    if (!confirm(msg)) return;
    setSeeding(true);
    try {
      const url = replace ? "/items/seed/textile?replace=true" : "/items/seed/textile";
      const { data } = await api.post(url);
      const parts = [];
      if (data.deleted) parts.push(`deleted ${data.deleted} old items`);
      if (data.inserted) parts.push(`loaded ${data.inserted} SKUs`);
      if (data.skipped) parts.push(`${data.skipped} already existed`);
      toast.success(parts.join(" · ") || "Catalogue loaded");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSeeding(false); }
  };

  const seedHardware = async () => {
    if (!confirm("This will add ~58 sample hardware SKUs across 8 categories (Electrical, Plumbing, Construction, Paint, Painting Materials, Fasteners, Tools & Machinery, Safety & Adhesives) with HSN + GST. Existing items are kept intact. Continue?")) return;
    setSeeding(true);
    try {
      const { data } = await api.post("/items/seed/hardware");
      toast.success(`Seeded ${data.inserted} SKUs (${data.skipped} already existed).`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSeeding(false); }
  };

  const seedPharmacy = async (replace = false) => {
    const msg = replace
      ? "This will DELETE every existing item in your catalogue and load ~48 medicines across 14 pharma categories (Tablets, Capsules, Syrups, Injections, Drops, Creams, Ointments, Powders, Surgical, Baby Care, Personal Care, Supplements, Ayurvedic, Homeopathy) — every SKU ships with real batch #, MFG/EXP dates and starting stock. This action cannot be undone. Continue?"
      : "This will add ~48 sample medicines across 14 pharma categories with batch numbers, MFG/EXP dates and starting stock. Existing items are kept intact. Continue?";
    if (!confirm(msg)) return;
    setSeeding(true);
    try {
      const url = replace ? "/items/seed/pharmacy?replace=true" : "/items/seed/pharmacy";
      const { data } = await api.post(url);
      const parts = [];
      if (data.deleted) parts.push(`deleted ${data.deleted} old items`);
      if (data.inserted) parts.push(`loaded ${data.inserted} medicines`);
      if (data.skipped) parts.push(`${data.skipped} already existed`);
      toast.success(parts.join(" · ") || "Catalogue loaded");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSeeding(false); }
  };

  const seedElectronics = async (replace = false) => {
    const msg = replace
      ? "This will DELETE every existing item in your catalogue and load ~36 electronics SKUs across 8 departments (Televisions, Refrigerators, Washing Machines, Air Conditioners, Kitchen Appliances, Computers, Accessories, CCTV) with brand + model + warranty periods. This action cannot be undone. Continue?"
      : "This will add ~36 sample electronics SKUs across 8 departments with brand, model, warranty period, and starting stock. Existing items are kept intact. Continue?";
    if (!confirm(msg)) return;
    setSeeding(true);
    try {
      const url = replace ? "/items/seed/electronics?replace=true" : "/items/seed/electronics";
      const { data } = await api.post(url);
      const parts = [];
      if (data.deleted) parts.push(`deleted ${data.deleted} old items`);
      if (data.inserted) parts.push(`loaded ${data.inserted} appliances`);
      if (data.skipped) parts.push(`${data.skipped} already existed`);
      toast.success(parts.join(" · ") || "Catalogue loaded");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSeeding(false); }
  };

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
          {industry === "cafe" && (
            <Button variant="outline" className="rounded-sm gap-2"
              data-testid="seed-tea-shop-btn"
              onClick={seedTeaShop}
              disabled={seeding}>
              <Coffee className="w-4 h-4" /> {seeding ? "Loading..." : "Load Tea & Snacks Menu"}
            </Button>
          )}
          {industry === "fruits_veg" && (
            <Button variant="outline" className="rounded-sm gap-2"
              data-testid="seed-fruits-veg-btn"
              onClick={seedFruitsVeg}
              disabled={seeding}>
              <Apple className="w-4 h-4" /> {seeding ? "Loading..." : "Load Fruits & Vegetables"}
            </Button>
          )}
          {industry === "retail" && (
            <Button variant="outline" className="rounded-sm gap-2"
              data-testid="seed-supermarket-btn"
              onClick={seedSupermarket}
              disabled={seeding}>
              <ShoppingBag className="w-4 h-4" /> {seeding ? "Loading..." : "Load Supermarket Catalogue"}
            </Button>
          )}
          {industry === "textile" && (
            <>
              <Button variant="outline" className="rounded-sm gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                data-testid="seed-textile-replace-btn"
                onClick={() => seedTextile(true)}
                disabled={seeding}>
                <Trash2 className="w-4 h-4" /> {seeding ? "Loading..." : "Reset & Load Textile Only"}
              </Button>
              <Button variant="outline" className="rounded-sm gap-2"
                data-testid="seed-textile-btn"
                onClick={() => seedTextile(false)}
                disabled={seeding}>
                <ShoppingBag className="w-4 h-4" /> {seeding ? "Loading..." : "Load Textile Catalogue"}
              </Button>
            </>
          )}
          {industry === "hardware" && (
            <Button variant="outline" className="rounded-sm gap-2"
              data-testid="seed-hardware-btn"
              onClick={seedHardware}
              disabled={seeding}>
              <Wrench className="w-4 h-4" /> {seeding ? "Loading..." : "Load Hardware Catalogue"}
            </Button>
          )}
          {industry === "pharmacy" && (
            <>
              <Button variant="outline" className="rounded-sm gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                data-testid="seed-pharmacy-replace-btn"
                onClick={() => seedPharmacy(true)}
                disabled={seeding}>
                <Trash2 className="w-4 h-4" /> {seeding ? "Loading..." : "Reset & Load Pharmacy Only"}
              </Button>
              <Button variant="outline" className="rounded-sm gap-2"
                data-testid="seed-pharmacy-btn"
                onClick={() => seedPharmacy(false)}
                disabled={seeding}>
                <Pill className="w-4 h-4" /> {seeding ? "Loading..." : "Load Pharmacy Catalogue"}
              </Button>
            </>
          )}
          {industry === "electronics" && (
            <>
              <Button variant="outline" className="rounded-sm gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                data-testid="seed-electronics-replace-btn"
                onClick={() => seedElectronics(true)}
                disabled={seeding}>
                <Trash2 className="w-4 h-4" /> {seeding ? "Loading..." : "Reset & Load Electronics Only"}
              </Button>
              <Button variant="outline" className="rounded-sm gap-2"
                data-testid="seed-electronics-btn"
                onClick={() => seedElectronics(false)}
                disabled={seeding}>
                <Tv className="w-4 h-4" /> {seeding ? "Loading..." : "Load Electronics Catalogue"}
              </Button>
            </>
          )}
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
            <DialogHeader><DialogTitle>{editing ? "Edit Item" : "New Item"}</DialogTitle><DialogDescription>{industry === "textile" ? "Add a textile product — one entry manages size-wise stock automatically." : "Set up product / menu item / medicine with pricing, tax and add-ons."}</DialogDescription></DialogHeader>
            {industry === "textile" ? (
              <TextileItemForm form={form} setForm={setForm} />
            ) : (
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
                    <Label>Generic Name / Composition</Label>
                    <Input value={form.generic_name}
                      onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                      placeholder="e.g. Paracetamol 650mg"
                      className="rounded-sm mt-1" data-testid="med-generic" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category || ""}
                      onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="rounded-sm mt-1" data-testid="med-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PHARMACY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Manufacturer</Label>
                    <Input value={form.manufacturer}
                      onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                      placeholder="e.g. Sun Pharma / Cipla"
                      className="rounded-sm mt-1" data-testid="med-manufacturer" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 mt-1">
                    <input type="checkbox" id="rx" checked={form.prescription_required === true}
                      onChange={(e) => setForm({ ...form, prescription_required: e.target.checked })}
                      className="rounded-sm" data-testid="med-rx" />
                    <Label htmlFor="rx" className="cursor-pointer">Prescription required (Schedule H)</Label>
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
            )}
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
              {industry === "textile" ? (
                <>
                  <TableHead className="text-[10px] uppercase tracking-widest">Brand</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest">Color</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest">Sizes</TableHead>
                </>
              ) : (
                <TableHead className="text-[10px] uppercase tracking-widest">Type</TableHead>
              )}
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
                {industry === "textile" ? (
                  <>
                    <TableCell className="text-xs">{i.brand || "—"}</TableCell>
                    <TableCell className="text-xs">{i.color || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {(i.size_stocks || []).length > 0
                        ? (i.size_stocks || []).filter((s) => s.qty > 0).map((s) => `${s.size}:${s.qty}`).join(" · ") || "—"
                        : "—"}
                    </TableCell>
                  </>
                ) : (
                  <TableCell><Badge variant="secondary" className="rounded-sm text-[10px] uppercase">{i.item_type}</Badge></TableCell>
                )}
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
              <TableRow><TableCell colSpan={industry === "textile" ? 10 : 8} className="text-center text-muted-foreground py-16">No items yet — click <b>New Item</b> to add one.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
// TextileItemForm — India-friendly single-product + size-wise stock UX.
// Consumes/mutates the same `form` state as the generic dialog.
// ------------------------------------------------------------
const DEPARTMENTS_LIST = ["Men", "Women", "Kids", "Home", "Unisex"];
const STANDARD_SIZES_LIST = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function TextileItemForm({ form, setForm }) {
  const patchRow = (i, patch) => {
    const arr = [...(form.size_stocks || [])];
    arr[i] = { ...arr[i], ...patch };
    setForm({ ...form, size_stocks: arr });
  };
  const rmRow = (i) =>
    setForm({ ...form, size_stocks: (form.size_stocks || []).filter((_, x) => x !== i) });
  const fillDefault = () =>
    setForm({ ...form, size_stocks: STANDARD_SIZES_LIST.map((s) => ({ size: s, qty: 0, price: 0 })) });
  const addRow = () =>
    setForm({ ...form, size_stocks: [...(form.size_stocks || []), { size: "", qty: 0, price: 0 }] });

  const totalQty = (form.size_stocks || []).reduce((a, r) => a + (parseFloat(r.qty) || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-2">
        <Label>Product Name *</Label>
        <Input data-testid="item-name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Men's Cotton Round Neck T-Shirt"
          className="rounded-sm mt-1" />
      </div>
      <div>
        <Label>Barcode <span className="text-[10px] text-muted-foreground">(auto)</span></Label>
        <Input value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          placeholder="Auto-generated on save"
          className="rounded-sm mt-1 font-mono text-xs" />
      </div>

      <div>
        <Label>Brand</Label>
        <Input value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          placeholder="e.g. Peter England"
          className="rounded-sm mt-1" data-testid="item-brand" />
      </div>
      <div>
        <Label>Department</Label>
        <Select value={form.department || ""}
          onValueChange={(v) => setForm({ ...form, department: v })}>
          <SelectTrigger className="rounded-sm mt-1" data-testid="item-department">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS_LIST.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Category</Label>
        <Input value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="e.g. Shirt / Kurta / Saree"
          className="rounded-sm mt-1" data-testid="item-category" />
      </div>

      <div>
        <Label>Color</Label>
        <Input value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
          placeholder="e.g. Blue / Assorted"
          className="rounded-sm mt-1" data-testid="item-color" />
      </div>
      <div>
        <Label>HSN Code</Label>
        <Input value={form.hsn_sac}
          onChange={(e) => setForm({ ...form, hsn_sac: e.target.value })}
          placeholder="e.g. 6109"
          className="rounded-sm mt-1" />
      </div>
      <div>
        <Label>Unit</Label>
        <Input value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          placeholder="PCS / MTR / PAIR"
          className="rounded-sm mt-1" />
      </div>

      <div>
        <Label>Purchase Price (₹)</Label>
        <Input type="number" value={form.purchase_price}
          onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })}
          className="rounded-sm mt-1 tabular" />
      </div>
      <div>
        <Label>Selling Price / Rate (₹) *</Label>
        <Input type="number" data-testid="item-price" value={form.sale_price}
          onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })}
          className="rounded-sm mt-1 tabular" />
      </div>
      <div>
        <Label>GST (%)</Label>
        <Select value={String(form.gst_rate)}
          onValueChange={(v) => setForm({ ...form, gst_rate: parseFloat(v) })}>
          <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 5, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Size-wise stock grid */}
      <div className="col-span-3 border-t border-border pt-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Size-wise Stock
            </Label>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Rate applies to every size unless you enter an override.
            </div>
          </div>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="outline" className="rounded-sm h-7 gap-1"
              onClick={fillDefault} data-testid="fill-default-sizes">
              Fill XS – XXXL
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-sm h-7 gap-1"
              onClick={addRow} data-testid="add-size-row">
              <Plus className="w-3 h-3" /> Row
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-sm overflow-hidden">
          <div className="grid grid-cols-12 px-3 py-2 bg-secondary/40 text-[10px] uppercase tracking-widest font-semibold">
            <div className="col-span-3">Size</div>
            <div className="col-span-3 text-right">Quantity</div>
            <div className="col-span-4 text-right">
              Selling Price <span className="normal-case text-muted-foreground">(blank = rate)</span>
            </div>
            <div className="col-span-2 text-right"></div>
          </div>
          {(form.size_stocks || []).length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No sizes yet — click <b>Fill XS – XXXL</b> to add the standard size grid, or add a custom row.
            </div>
          ) : (form.size_stocks || []).map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-1.5 border-t border-border/60 items-center">
              <div className="col-span-3">
                <Input value={r.size}
                  onChange={(e) => patchRow(i, { size: e.target.value })}
                  className="rounded-sm h-8" data-testid={`size-name-${i}`}
                  placeholder="XS" />
              </div>
              <div className="col-span-3">
                <Input type="number" min="0" value={r.qty}
                  onChange={(e) => patchRow(i, { qty: parseFloat(e.target.value) || 0 })}
                  className="rounded-sm h-8 text-right tabular"
                  data-testid={`size-qty-${i}`} />
              </div>
              <div className="col-span-4">
                <Input type="number" min="0" value={r.price || ""}
                  placeholder={String(form.sale_price)}
                  onChange={(e) => patchRow(i, { price: parseFloat(e.target.value) || 0 })}
                  className="rounded-sm h-8 text-right tabular"
                  data-testid={`size-price-${i}`} />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => rmRow(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(form.size_stocks || []).length > 0 && (
            <div className="grid grid-cols-12 px-3 py-2 border-t-2 border-border bg-primary/5 text-sm">
              <div className="col-span-3 font-semibold">Total stock</div>
              <div className="col-span-3 text-right tabular font-bold" data-testid="size-total-qty">
                {totalQty} pcs
              </div>
              <div className="col-span-6"></div>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Low Stock Alert</Label>
        <Input type="number" value={form.low_stock_alert}
          onChange={(e) => setForm({ ...form, low_stock_alert: parseFloat(e.target.value) || 0 })}
          className="rounded-sm mt-1 tabular" />
      </div>
      <div className="col-span-2 flex items-end text-[11px] text-muted-foreground">
        Total stock is auto-synced to the sum of size quantities on save.
      </div>
    </div>
  );
}
