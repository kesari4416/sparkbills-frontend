import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR, formatApiError, API } from "@/lib/apiClient";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Utensils, ClipboardList, ChefHat, Send, Minus, X, Search,
  UtensilsCrossed, ShoppingBag, Truck, Wallet, PackageOpen, Bike,
} from "lucide-react";

const STATUS_COLORS = {
  pending: "chip-warning",
  preparing: "chip-blue",
  ready: "chip-success",
  served: "chip-blue",
  billed: "chip-blue",
  cancelled: "chip-danger",
};

const ORDER_TYPES = [
  { id: "dine-in", label: "Dine-In", icon: UtensilsCrossed },
  { id: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { id: "swiggy", label: "Swiggy", icon: Bike },
  { id: "zomato", label: "Zomato", icon: Bike },
  { id: "delivery", label: "Direct", icon: Truck },
];

export default function Restaurant() {
  const nav = useNavigate();
  const [tables, setTables] = useState([]);
  const [kots, setKots] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [openNewTable, setOpenNewTable] = useState(false);
  const [tblForm, setTblForm] = useState({ name: "", section: "Main", capacity: 4 });

  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState("dine-in");
  const [selectedCat, setSelectedCat] = useState("All");
  const [addonPicker, setAddonPicker] = useState(null); // {item, selectedAddons:{name:true}, variantIdx:null}
  const [discount, setDiscount] = useState(0); // ₹
  const [packaging, setPackaging] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const loadAll = async () => {
    const [t, k, i, c] = await Promise.all([
      api.get("/tables"), api.get("/kots"),
      api.get("/items", { params: { item_type: "menu" } }),
      api.get("/customers"),
    ]);
    setTables(t.data); setKots(k.data); setItems(i.data); setCustomers(c.data);
  };
  useEffect(() => { loadAll(); }, []);

  const categories = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      const c = i.category || "Uncategorised";
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [{ name: "All", count: items.length }, ...Array.from(map, ([name, count]) => ({ name, count }))];
  }, [items]);

  const filteredMenu = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter((i) => {
      if (selectedCat !== "All" && (i.category || "Uncategorised") !== selectedCat) return false;
      if (s && !i.name.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [items, search, selectedCat]);

  const addItem = (it) => {
    // If item has addons or variants, open the picker
    const hasAddons = (it.addons && it.addons.length > 0) || (it.variants && it.variants.length > 0);
    if (hasAddons) {
      setAddonPicker({ item: it, selectedAddons: {}, variantIdx: (it.variants && it.variants.length ? -1 : null) });
      return;
    }
    setCart((c) => {
      const ex = c.find((x) => x.item_id === it.id && !x.addons?.length && !x.variant);
      if (ex) return c.map((x) => x === ex ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, {
        item_id: it.id, name: it.name, quantity: 1, rate: it.sale_price || 0,
        gst_rate: it.gst_rate || 5, discount_pct: 0, hsn_sac: it.hsn_sac || "", unit: "PCS",
      }];
    });
  };

  const confirmAddonPicker = () => {
    const p = addonPicker;
    if (!p) return;
    const it = p.item;
    const chosenAddons = (it.addons || []).filter((a) => p.selectedAddons[a.name]);
    const variant = (p.variantIdx !== null && p.variantIdx >= 0 && it.variants) ? it.variants[p.variantIdx] : null;
    const addonSum = chosenAddons.reduce((s, a) => s + (a.price || 0), 0);
    const variantDelta = variant ? (variant.price_delta || 0) : 0;
    const displayName = variant ? `${it.name} (${variant.name})` : it.name;
    setCart((c) => [...c, {
      item_id: it.id,
      name: displayName,
      quantity: 1,
      rate: (it.sale_price || 0) + variantDelta + addonSum,
      gst_rate: it.gst_rate || 5,
      discount_pct: 0,
      hsn_sac: it.hsn_sac || "",
      unit: "PCS",
      variant: variant?.name || null,
      addons: chosenAddons,
    }]);
    setAddonPicker(null);
  };
  const changeQty = (idx, d) =>
    setCart((c) => c.map((x, i) => i === idx ? { ...x, quantity: Math.max(0, x.quantity + d) } : x).filter((x) => x.quantity > 0));
  const rmItem = (idx) => setCart((c) => c.filter((_, i) => i !== idx));
  const resetCart = () => {
    setCart([]); setDiscount(0); setPackaging(0); setDeliveryFee(0);
    setSelectedTable(null); setSelectedCustomer(null); setOrderType("dine-in");
  };

  const totals = useMemo(() => {
    let taxable = 0, tax = 0;
    cart.forEach((l) => {
      const gross = l.quantity * l.rate;
      taxable += gross;
      tax += gross * (l.gst_rate / 100);
    });
    const extras = (Number(packaging) || 0) + (Number(deliveryFee) || 0);
    let grand = taxable - (Number(discount) || 0) + tax + extras;
    grand = Math.max(0, grand);
    const roundOff = Math.round(grand) - grand;
    grand = Math.round(grand);
    return { taxable, tax, extras, grand, roundOff, itemCount: cart.reduce((s, x) => s + x.quantity, 0) };
  }, [cart, discount, packaging, deliveryFee]);

  const sendKotOnly = async () => {
    if (!cart.length) return toast.error("Add items first");
    try {
      await api.post("/kots", {
        table_id: selectedTable?.id || null,
        order_type: orderType,
        customer_name: selectedCustomer?.name || "",
        customer_phone: selectedCustomer?.phone || "",
        items: cart,
      });
      toast.success("KOT sent to kitchen");
      loadAll();
      resetCart();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const payAndBill = async () => {
    if (!cart.length) return toast.error("Add items first");
    const payload = {
      doc_type: "invoice", industry: "restaurant",
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || "Walk-in Customer",
      customer_phone: selectedCustomer?.phone || "",
      customer_state_code: selectedCustomer?.state_code || "",
      order_type: orderType, table_id: selectedTable?.id || null,
      items: cart, discount_amount: Number(discount) || 0, round_off: true,
      notes: [
        packaging ? `Packaging ₹${packaging}` : null,
        deliveryFee ? `Delivery ₹${deliveryFee}` : null,
      ].filter(Boolean).join(" · "),
      payments: [{ method: orderType === "dine-in" ? "cash" : "upi", amount: totals.grand }],
    };
    try {
      const { data } = await api.post("/invoices", payload);
      toast.success(`Bill ${data.number} · ${fmtINR(data.grand_total)}`);
      window.open(`${API}/invoices/${data.id}/pdf`, "_blank");
      resetCart(); loadAll();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const saveTable = async () => {
    try { await api.post("/tables", tblForm); toast.success("Table added"); setOpenNewTable(false); setTblForm({ name: "", section: "Main", capacity: 4 }); loadAll(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const updKotStatus = async (k, status) => { await api.patch(`/kots/${k.id}/status`, { status }); loadAll(); };

  return (
    <div className="p-6 lg:p-8" data-testid="restaurant-page">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold">Restaurant / Café</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Point of Sale</h1>
      </div>

      <Tabs defaultValue="pos">
        <TabsList className="rounded-md">
          <TabsTrigger value="pos" data-testid="tab-pos"><ClipboardList className="w-3.5 h-3.5 mr-2" />POS / New Order</TabsTrigger>
          <TabsTrigger value="floor" data-testid="tab-floor"><Utensils className="w-3.5 h-3.5 mr-2" />Floor Plan</TabsTrigger>
          <TabsTrigger value="kds" data-testid="tab-kds"><ChefHat className="w-3.5 h-3.5 mr-2" />Kitchen Display</TabsTrigger>
        </TabsList>

        {/* ============== POS ============== */}
        <TabsContent value="pos" className="mt-4">
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-260px)] min-h-[560px]">
            {/* Categories */}
            <Card className="col-span-2 rounded-xl overflow-hidden flex flex-col" data-testid="pos-categories">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Categories</div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {categories.map((c) => (
                  <button
                    key={c.name}
                    data-testid={`cat-${c.name}`}
                    onClick={() => setSelectedCat(c.name)}
                    className={`w-full text-left px-4 py-3 border-l-2 transition-colors ${
                      selectedCat === c.name
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-transparent hover:bg-secondary/60"
                    }`}
                  >
                    <div className="text-sm">{c.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.count} items</div>
                  </button>
                ))}
                {items.length === 0 && (
                  <div className="p-4 text-xs text-muted-foreground">
                    Add menu items in <b>Items</b> with type &ldquo;menu&rdquo; to build categories.
                  </div>
                )}
              </div>
            </Card>

            {/* Menu Items */}
            <Card className="col-span-6 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    data-testid="pos-menu-search"
                    placeholder="Search menu items…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-md h-10 border-border"
                  />
                </div>
                <Badge variant="outline" className="rounded-md">{filteredMenu.length} items</Badge>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                {filteredMenu.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    <UtensilsCrossed className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    No menu items in {selectedCat}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredMenu.map((it) => (
                      <button
                        key={it.id}
                        data-testid={`menu-${it.id}`}
                        onClick={() => addItem(it)}
                        className="p-3 border border-border rounded-xl text-left bg-card hover:border-primary hover:bg-primary/[0.02] transition-all card-elev-hover"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-3 h-3 border rounded-sm mt-0.5 shrink-0 flex items-center justify-center ${it.is_veg === false ? "border-red-500" : "border-emerald-500"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${it.is_veg === false ? "bg-red-500" : "bg-emerald-500"}`} />
                          </div>
                          <div className="text-sm font-semibold leading-tight line-clamp-2">{it.name}</div>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                          {it.category || "Uncategorised"}
                        </div>
                        <div className="tabular font-heading font-bold text-primary text-lg mt-2">
                          {fmtINR(it.sale_price)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Current Order panel */}
            <Card className="col-span-4 rounded-xl overflow-hidden flex flex-col bg-card">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Current Order</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select value={selectedTable?.id || "none"} onValueChange={(v) => setSelectedTable(tables.find((t) => t.id === v) || null)}>
                    <SelectTrigger className="rounded-md h-9 text-xs" data-testid="pos-table"><SelectValue placeholder="Select Table" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Table</SelectItem>
                      {tables.map((t) => <SelectItem key={t.id} value={t.id}>Table {t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedCustomer?.id || "walkin"} onValueChange={(v) => setSelectedCustomer(customers.find((c) => c.id === v) || null)}>
                    <SelectTrigger className="rounded-md h-9 text-xs" data-testid="pos-customer"><SelectValue placeholder="Customer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walkin">Walk-in Customer</SelectItem>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <PackageOpen className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    Tap menu items to build the order.
                  </div>
                ) : (
                  cart.map((l, i) => (
                    <div key={i} className="p-3 border-b border-border flex items-center gap-2" data-testid={`order-row-${i}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{l.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular">{fmtINR(l.rate)} · {l.gst_rate}% GST</div>
                        {l.addons?.length > 0 && (
                          <div className="text-[10px] text-primary/70 truncate">+ {l.addons.map((a) => a.name).join(", ")}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 border border-border rounded-md">
                        <button className="w-6 h-6 flex items-center justify-center hover:bg-secondary" onClick={() => changeQty(i, -1)}><Minus className="w-3 h-3" /></button>
                        <span className="w-7 text-center tabular font-semibold text-sm">{l.quantity}</span>
                        <button className="w-6 h-6 flex items-center justify-center hover:bg-secondary" onClick={() => changeQty(i, 1)}><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="w-16 text-right tabular font-semibold text-sm">{fmtINR(l.quantity * l.rate)}</div>
                      <button className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => rmItem(i)}><X className="w-3 h-3" /></button>
                    </div>
                  ))
                )}
              </div>

              {/* Totals + inputs */}
              <div className="border-t border-border p-3 space-y-2 bg-secondary/40">
                <Row label={`Items (${totals.itemCount})`} value={totals.taxable} />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground flex-1">Discount ₹</span>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-24 h-7 rounded-md text-right tabular text-xs bg-card" data-testid="pos-discount" />
                </div>
                <Row label="GST" value={totals.tax} />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground flex-1">Packaging ₹</span>
                  <Input type="number" value={packaging} onChange={(e) => setPackaging(parseFloat(e.target.value) || 0)} className="w-24 h-7 rounded-md text-right tabular text-xs bg-card" data-testid="pos-packaging" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground flex-1">Delivery Fee ₹</span>
                  <Input
                    type="number" value={deliveryFee}
                    onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                    disabled={orderType === "dine-in"}
                    className="w-24 h-7 rounded-md text-right tabular text-xs bg-card disabled:opacity-40"
                    data-testid="pos-delivery"
                  />
                </div>
                {totals.roundOff !== 0 && <Row label="Round off" value={totals.roundOff} />}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-heading font-bold">Total</span>
                  <span className="font-heading font-bold text-2xl tabular text-primary" data-testid="pos-grand-total">{fmtINR(totals.grand)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom bar: Dine-In | Takeaway | Swiggy | Zomato | Direct | Pay */}
          <div className="mt-4 grid grid-cols-6 gap-2">
            {ORDER_TYPES.map((o) => {
              const Icon = o.icon;
              const active = orderType === o.id;
              return (
                <button
                  key={o.id}
                  data-testid={`order-type-${o.id}`}
                  onClick={() => setOrderType(o.id)}
                  className={`h-14 rounded-xl border-2 flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                  {o.label}
                </button>
              );
            })}
            <button
              data-testid="pos-pay"
              onClick={payAndBill}
              disabled={!cart.length}
              className="h-14 rounded-xl gradient-brand text-white flex items-center justify-center gap-2 font-bold text-base shadow-lg shadow-blue-500/25 hover:opacity-95 disabled:opacity-40 disabled:shadow-none"
            >
              <Wallet className="w-5 h-5" />
              Pay {fmtINR(totals.grand)}
            </button>
          </div>

          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="rounded-md" onClick={resetCart} data-testid="pos-clear">Clear</Button>
            <Button variant="outline" size="sm" className="rounded-md gap-2" onClick={sendKotOnly} disabled={!cart.length} data-testid="pos-send-kot">
              <Send className="w-3.5 h-3.5" /> Send KOT to Kitchen
            </Button>
          </div>
        </TabsContent>

        {/* ============== FLOOR PLAN ============== */}
        <TabsContent value="floor" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Occupied</span>
            </div>
            <Dialog open={openNewTable} onOpenChange={setOpenNewTable}>
              <DialogTrigger asChild><Button size="sm" className="rounded-md gap-2" data-testid="new-table-btn"><Plus className="w-3.5 h-3.5" />Add Table</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name / No.</Label><Input value={tblForm.name} onChange={(e) => setTblForm({ ...tblForm, name: e.target.value })} className="rounded-md mt-1" data-testid="tbl-name" placeholder="T1" /></div>
                  <div><Label>Section</Label><Input value={tblForm.section} onChange={(e) => setTblForm({ ...tblForm, section: e.target.value })} className="rounded-md mt-1" /></div>
                  <div><Label>Capacity</Label><Input type="number" value={tblForm.capacity} onChange={(e) => setTblForm({ ...tblForm, capacity: parseInt(e.target.value) || 4 })} className="rounded-md mt-1" /></div>
                </div>
                <DialogFooter><Button className="rounded-md" onClick={saveTable} data-testid="save-table">Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.map((t) => {
              const occupied = t.status === "occupied";
              const tKots = kots.filter((k) => k.table_id === t.id && k.status !== "cancelled" && k.status !== "billed");
              return (
                <Card key={t.id} className={`p-4 rounded-xl cursor-pointer transition-colors card-elev ${occupied ? "border-primary bg-primary/5" : "hover:border-primary/40"}`} data-testid={`table-${t.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-heading text-2xl font-bold">{t.name}</div>
                    <Badge variant="outline" className="rounded-md text-[10px] uppercase">{t.section}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Seats {t.capacity}</div>
                  <div className={`text-[10px] uppercase tracking-widest mt-3 font-semibold ${occupied ? "text-primary" : "text-muted-foreground"}`}>
                    {t.status} {tKots.length > 0 && `· ${tKots.length} KOTs`}
                  </div>
                  <Button size="sm" className="w-full rounded-md text-xs mt-3" onClick={() => setSelectedTable(t)} data-testid={`order-${t.id}`}>Open Order</Button>
                </Card>
              );
            })}
            {tables.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">Add your first table to start.</div>
            )}
          </div>
        </TabsContent>

        {/* ============== KDS ============== */}
        <TabsContent value="kds" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["pending", "preparing", "ready"].map((s) => (
              <div key={s}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{s}</div>
                {kots.filter((k) => k.status === s).map((k) => (
                  <Card key={k.id} className="rounded-xl p-3 mb-2 card-elev" data-testid={`kds-${k.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm font-semibold">{k.kot_number}</div>
                      <Badge variant="outline" className={`rounded-md text-[10px] uppercase font-semibold ${STATUS_COLORS[k.status]}`}>{k.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{k.order_type} {k.table_id && `· Table`}</div>
                    <div className="mt-2 space-y-0.5 text-sm">
                      {k.items?.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{it.name}</span>
                          <span className="tabular font-medium">×{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {s === "pending" && <Button size="sm" className="rounded-md text-xs h-7 flex-1" onClick={() => updKotStatus(k, "preparing")}>Start</Button>}
                      {s === "preparing" && <Button size="sm" className="rounded-md text-xs h-7 flex-1" onClick={() => updKotStatus(k, "ready")}>Ready</Button>}
                      {s === "ready" && <Button size="sm" className="rounded-md text-xs h-7 flex-1" onClick={() => updKotStatus(k, "served")}>Served</Button>}
                    </div>
                  </Card>
                ))}
                {kots.filter((k) => k.status === s).length === 0 && (
                  <div className="text-xs text-muted-foreground p-3">Empty</div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add-on / Variant Picker */}
      <Dialog open={!!addonPicker} onOpenChange={(o) => !o && setAddonPicker(null)}>
        <DialogContent className="max-w-md" data-testid="addon-picker">
          <DialogHeader>
            <DialogTitle>{addonPicker?.item?.name}</DialogTitle>
          </DialogHeader>
          {addonPicker && (
            <div className="space-y-4">
              {addonPicker.item.variants?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Choose size</div>
                  <div className="grid grid-cols-3 gap-2">
                    {addonPicker.item.variants.map((v, i) => (
                      <button key={i}
                        onClick={() => setAddonPicker({ ...addonPicker, variantIdx: i })}
                        className={`p-2 border rounded-md text-sm ${addonPicker.variantIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                        data-testid={`variant-${i}`}>
                        <div className="font-semibold">{v.name}</div>
                        <div className="text-xs tabular">{v.price_delta > 0 ? "+" : ""}{fmtINR(v.price_delta)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {addonPicker.item.addons?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Add-ons</div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {addonPicker.item.addons.map((a, i) => {
                      const checked = !!addonPicker.selectedAddons[a.name];
                      return (
                        <label key={i} className={`flex items-center justify-between p-2 border rounded-md cursor-pointer ${checked ? "border-primary bg-primary/5" : "border-border"}`} data-testid={`addon-${i}`}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={(e) => setAddonPicker({
                              ...addonPicker,
                              selectedAddons: { ...addonPicker.selectedAddons, [a.name]: e.target.checked },
                            })} />
                            <span className="text-sm">{a.name}</span>
                          </div>
                          <span className="tabular font-medium text-sm">+ {fmtINR(a.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setAddonPicker(null)}>Cancel</Button>
            <Button className="rounded-md" onClick={confirmAddonPicker} data-testid="addon-confirm">Add to Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">{fmtINR(value)}</span>
    </div>
  );
}
