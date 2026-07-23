import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR, formatApiError, API } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
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
  CalendarClock, CheckCircle2, Users2, Armchair, Trash2,
  Bell, HandPlatter, Timer,
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

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Restaurant() {
  const nav = useNavigate();
  const { industry } = useAuth();
  const useToken = industry === "cafe"; // Tea & Snacks Shop = token-based; Restaurant = table-based
  const [tables, setTables] = useState([]);
  const [kots, setKots] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedWaiter, setSelectedWaiter] = useState(() => localStorage.getItem("last_waiter_id") || "");
  const [openNewTable, setOpenNewTable] = useState(false);
  const [tblForm, setTblForm] = useState({ name: "", section: "Main", capacity: 4 });

  // Floor Plan state
  const [activeTab, setActiveTab] = useState("pos");
  const [floorTab, setFloorTab] = useState("reservations");
  const [resDate, setResDate] = useState(todayStr());
  const [openBook, setOpenBook] = useState(false);
  const [bookForm, setBookForm] = useState({
    table_id: "", customer_name: "", customer_phone: "",
    guest_count: 2, start_at: "", duration_min: 90, notes: "",
  });

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
    const [t, k, i, c, r, u] = await Promise.all([
      api.get("/tables"), api.get("/kots"),
      api.get("/items", { params: { item_type: "menu" } }),
      api.get("/customers"),
      api.get("/reservations", { params: { date: resDate } }),
      api.get("/settings/users").catch(() => ({ data: [] })),
    ]);
    setTables(t.data); setKots(k.data); setItems(i.data); setCustomers(c.data);
    setReservations(r.data); setUsers(u.data);
  };
  useEffect(() => { loadAll(); }, [resDate]);
  // Auto-refresh KDS + waiter board every 8s so kitchen/waiter see updates.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const k = await api.get("/kots");
        setKots(k.data);
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const waiterUsers = useMemo(
    () => users.filter((u) => (u.industry_roles || {})["restaurant"] === "waiter"
                          || (u.industry_roles || {})["cafe"] === "waiter"),
    [users],
  );
  const waiterName = (id) => users.find((u) => u.id === id)?.name || "";

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
    if (!useToken && !selectedTable) return toast.error("Select a table first");
    try {
      // 1. Send the order to the kitchen (KOTs collection).
      const { data: kot } = await api.post("/kots", {
        table_id: selectedTable?.id || null,
        order_type: orderType,
        customer_name: selectedCustomer?.name || "",
        customer_phone: selectedCustomer?.phone || "",
        waiter_id: selectedWaiter || null,
        waiter_name: waiterName(selectedWaiter),
        items: cart,
      });
      // 2. Also persist an UNPAID bill for the same line-items so the
      // cashier can complete final payment later. Before this fix the
      // cart data lived only inside the KOT — resetCart() wiped it and
      // the customer's total was lost.
      const idLabel = useToken ? `Token ${kot.token_no}` : `Table ${selectedTable?.name || "-"}`;
      let bill = null;
      try {
        const billPayload = {
          doc_type: "invoice",
          customer_id: selectedCustomer?.id || null,
          customer_name: selectedCustomer?.name || (useToken ? `Token ${kot.token_no}` : `Table ${selectedTable?.name || ""}`),
          customer_phone: selectedCustomer?.phone || "",
          customer_state_code: selectedCustomer?.state_code || "",
          order_type: orderType,
          table_id: selectedTable?.id || null,
          items: cart,
          discount_amount: Number(discount) || 0,
          round_off: true,
          notes: [
            `KOT ${kot.kot_number}`,
            packaging ? `Packaging ₹${packaging}` : null,
            deliveryFee ? `Delivery ₹${deliveryFee}` : null,
          ].filter(Boolean).join(" · "),
          payments: [], // unpaid — cashier records payment from the Bills screen later
        };
        const { data } = await api.post("/invoices", billPayload);
        bill = data;
      } catch (billErr) {
        // Don't block the kitchen if the bill save fails — surface the
        // reason and still show the KOT confirmation.
        toast.error(`KOT sent, but bill could not be saved: ${formatApiError(billErr)}`);
      }
      if (bill) {
        toast.success(`Order sent · ${idLabel} · Bill ${bill.number} saved (UNPAID)`);
      } else {
        toast.success(`Order sent to kitchen · ${idLabel}${kot.waiter_name ? ` · ${kot.waiter_name}` : ""}`);
      }
      if (selectedWaiter) localStorage.setItem("last_waiter_id", selectedWaiter);
      loadAll();
      resetCart();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const payAndBill = async () => {
    if (!cart.length) return toast.error("Add items first");
    const payload = {
      doc_type: "invoice",
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

  // ============ Reservations & Table actions ============
  const saveReservation = async () => {
    if (!bookForm.customer_name.trim()) return toast.error("Customer name required");
    if (!bookForm.start_at) return toast.error("Pick a date & time");
    try {
      await api.post("/reservations", {
        table_id: bookForm.table_id || null,
        customer_name: bookForm.customer_name.trim(),
        customer_phone: bookForm.customer_phone.trim(),
        guest_count: parseInt(bookForm.guest_count) || 1,
        start_at: bookForm.start_at,
        duration_min: parseInt(bookForm.duration_min) || 90,
        notes: bookForm.notes,
      });
      toast.success("Table booked");
      setOpenBook(false);
      setBookForm({ table_id: "", customer_name: "", customer_phone: "", guest_count: 2, start_at: "", duration_min: 90, notes: "" });
      loadAll();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const setResStatus = async (r, status) => {
    try { await api.patch(`/reservations/${r.id}/status`, { status }); loadAll(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const removeReservation = async (r) => {
    if (!window.confirm(`Cancel reservation for ${r.customer_name}?`)) return;
    try { await api.delete(`/reservations/${r.id}`); loadAll(); toast.success("Reservation removed"); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const freeTable = async (t) => {
    try { await api.patch(`/tables/${t.id}/free`); loadAll(); toast.success(`Table ${t.name} freed`); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  // If industry switches to cafe while we're on the Floor tab, jump back to POS.
  useEffect(() => {
    if (useToken && activeTab === "floor") setActiveTab("pos");
  }, [useToken, activeTab]);

  const availableTables = useMemo(() => tables.filter((t) => t.status !== "occupied"), [tables]);
  const occupiedTables = useMemo(() => tables.filter((t) => t.status === "occupied"), [tables]);
  const totalSeats = useMemo(() => tables.reduce((s, t) => s + (t.capacity || 0), 0), [tables]);
  const occupiedSeats = useMemo(
    () => occupiedTables.reduce((s, t) => s + (t.capacity || 0), 0),
    [occupiedTables]
  );

  return (
    <div className="p-6 lg:p-8" data-testid="restaurant-page">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold">{useToken ? "Tea & Snacks Shop" : "Restaurant / Café"}</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">{useToken ? "Counter POS" : "Point of Sale"}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-md">
          <TabsTrigger value="pos" data-testid="tab-pos"><ClipboardList className="w-3.5 h-3.5 mr-2" />POS / New Order</TabsTrigger>
          {!useToken && (
            <TabsTrigger value="floor" data-testid="tab-floor"><Utensils className="w-3.5 h-3.5 mr-2" />Floor Plan</TabsTrigger>
          )}
          <TabsTrigger value="kds" data-testid="tab-kds"><ChefHat className="w-3.5 h-3.5 mr-2" />Kitchen Display</TabsTrigger>
          <TabsTrigger value="waiter" data-testid="tab-waiter">
            <HandPlatter className="w-3.5 h-3.5 mr-2" />Waiter Board
            {kots.filter((k) => k.status === "ready").length > 0 && (
              <span className="ml-2 bg-emerald-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {kots.filter((k) => k.status === "ready").length}
              </span>
            )}
          </TabsTrigger>
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
                <div className={`mt-2 grid ${useToken ? "grid-cols-1" : "grid-cols-2"} gap-2`}>
                  {!useToken && (
                    <Select value={selectedTable?.id || "none"} onValueChange={(v) => setSelectedTable(v === "none" ? null : (tables.find((t) => t.id === v) || null))}>
                      <SelectTrigger className="rounded-md h-9 text-xs" data-testid="pos-table"><SelectValue placeholder="Select Table" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Table</SelectItem>
                        {(() => {
                          // Only show tables that are actually free — plus the currently
                          // selected table if it happens to be marked occupied (so the
                          // waiter can still see what's active in the dropdown). Fixes
                          // the "shows all tables" leak in POS → Current Order.
                          const list = tables.filter((t) => t.status !== "occupied" || t.id === selectedTable?.id);
                          if (list.length === 0) {
                            return <div className="px-3 py-2 text-xs text-muted-foreground">All tables are occupied.</div>;
                          }
                          return list.map((t) => (
                            <SelectItem key={t.id} value={t.id}>Table {t.name}{t.section ? ` · ${t.section}` : ""}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={selectedCustomer?.id || "walkin"} onValueChange={(v) => setSelectedCustomer(customers.find((c) => c.id === v) || null)}>
                    <SelectTrigger className="rounded-md h-9 text-xs" data-testid="pos-customer"><SelectValue placeholder="Customer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walkin">Walk-in Customer</SelectItem>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2">
                  <Select value={selectedWaiter || "none"} onValueChange={(v) => setSelectedWaiter(v === "none" ? "" : v)}>
                    <SelectTrigger className="rounded-md h-9 text-xs" data-testid="pos-waiter">
                      <SelectValue placeholder="Assign waiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Unassigned —</SelectItem>
                      {waiterUsers.length === 0 && users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                      {waiterUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name} · Waiter</SelectItem>
                      ))}
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
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SummaryTile testId="floor-total" icon={Utensils} label="Total tables" value={tables.length} />
            <SummaryTile testId="floor-available" icon={CheckCircle2} label="Available" value={availableTables.length} tone="emerald" />
            <SummaryTile testId="floor-occupied" icon={Users2} label="Occupied" value={occupiedTables.length} tone="rose" />
            <SummaryTile testId="floor-seats" icon={Armchair} label="Seats in use" value={`${occupiedSeats} / ${totalSeats}`} tone="blue" />
          </div>

          <Tabs value={floorTab} onValueChange={setFloorTab}>
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <TabsList className="rounded-md">
                <TabsTrigger value="reservations" data-testid="floor-tab-reservations"><CalendarClock className="w-3.5 h-3.5 mr-2" />Time-based Booking</TabsTrigger>
                <TabsTrigger value="available" data-testid="floor-tab-available"><CheckCircle2 className="w-3.5 h-3.5 mr-2" />Available</TabsTrigger>
                <TabsTrigger value="occupied" data-testid="floor-tab-occupied"><Users2 className="w-3.5 h-3.5 mr-2" />Occupied</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                {floorTab === "reservations" && (
                  <>
                    <Input
                      type="date" value={resDate} onChange={(e) => setResDate(e.target.value)}
                      className="w-40 rounded-md h-9 text-sm" data-testid="floor-res-date"
                    />
                    <Button size="sm" className="rounded-md gap-2" onClick={() => setOpenBook(true)} data-testid="book-table-btn">
                      <CalendarClock className="w-3.5 h-3.5" />Book Table
                    </Button>
                  </>
                )}
                <Dialog open={openNewTable} onOpenChange={setOpenNewTable}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-md gap-2" data-testid="new-table-btn">
                      <Plus className="w-3.5 h-3.5" />Add Table
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Name / No.</Label><Input value={tblForm.name} onChange={(e) => setTblForm({ ...tblForm, name: e.target.value })} className="rounded-md mt-1" data-testid="tbl-name" placeholder="T1" /></div>
                      <div><Label>Section</Label><Input value={tblForm.section} onChange={(e) => setTblForm({ ...tblForm, section: e.target.value })} className="rounded-md mt-1" /></div>
                      <div><Label>Chairs / Capacity</Label><Input type="number" value={tblForm.capacity} onChange={(e) => setTblForm({ ...tblForm, capacity: parseInt(e.target.value) || 4 })} className="rounded-md mt-1" /></div>
                    </div>
                    <DialogFooter><Button className="rounded-md" onClick={saveTable} data-testid="save-table">Save</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* ---- Reservations ---- */}
            <TabsContent value="reservations">
              {reservations.length === 0 ? (
                <EmptyState icon={CalendarClock} title="No reservations for this date"
                  hint="Click Book Table to add a time-based booking." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reservations.map((r) => {
                    const tbl = tables.find((t) => t.id === r.table_id);
                    const when = new Date(r.start_at);
                    const timeStr = isNaN(when) ? r.start_at : when.toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
                    return (
                      <Card key={r.id} className="p-4 rounded-xl card-elev" data-testid={`res-${r.id}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-heading text-lg font-bold">{r.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{r.customer_phone || "No phone"}</div>
                          </div>
                          <Badge variant="outline" className={`rounded-md text-[10px] uppercase ${
                            r.status === "seated" ? "chip-blue" :
                              r.status === "completed" ? "chip-success" :
                                r.status === "cancelled" || r.status === "no-show" ? "chip-danger" : "chip-warning"
                          }`}>{r.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{timeStr}</span>
                          <span className="flex items-center gap-1"><Users2 className="w-3.5 h-3.5" />{r.guest_count} guests</span>
                          <span>{r.duration_min} min</span>
                        </div>
                        <div className="text-xs mt-2">
                          {tbl ? <>Table <b>{tbl.name}</b> · {tbl.section}</> : <span className="text-muted-foreground">No table assigned</span>}
                        </div>
                        {r.notes && <div className="text-[11px] text-muted-foreground mt-1 italic">{r.notes}</div>}
                        <div className="flex gap-1 mt-3">
                          {r.status === "booked" && (
                            <Button size="sm" className="rounded-md text-xs h-7 flex-1" onClick={() => setResStatus(r, "seated")} data-testid={`res-seat-${r.id}`}>Seat now</Button>
                          )}
                          {r.status === "seated" && (
                            <Button size="sm" variant="outline" className="rounded-md text-xs h-7 flex-1" onClick={() => setResStatus(r, "completed")} data-testid={`res-complete-${r.id}`}>Mark done</Button>
                          )}
                          <Button size="sm" variant="ghost" className="rounded-md h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeReservation(r)} data-testid={`res-del-${r.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ---- Available ---- */}
            <TabsContent value="available">
              {availableTables.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No free tables right now" hint="All tables are seated or reserved." />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {availableTables.map((t) => {
                    const isReserved = !!t.reserved_by;
                    return (
                      <Card key={t.id} className={`p-4 rounded-xl card-elev border ${isReserved ? "border-amber-400/60 bg-amber-500/5" : "border-emerald-500/30 hover:border-emerald-500"} transition-colors`} data-testid={`avail-${t.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-heading text-2xl font-bold">{t.name}</div>
                          <Badge variant="outline" className="rounded-md text-[10px] uppercase">{t.section}</Badge>
                        </div>
                        <ChairRow total={t.capacity} used={0} />
                        <div className={`text-[10px] uppercase tracking-widest mt-3 font-semibold ${isReserved ? "text-amber-600" : "text-emerald-600"}`}>
                          {isReserved ? "Reserved" : "Available"}
                        </div>
                        <Button size="sm" className="w-full rounded-md text-xs mt-3" onClick={() => { setSelectedTable(t); setActiveTab("pos"); }} data-testid={`avail-open-${t.id}`}>Open order</Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ---- Occupied ---- */}
            <TabsContent value="occupied">
              {occupiedTables.length === 0 ? (
                <EmptyState icon={Users2} title="No occupied tables" hint="Everything is available." />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {occupiedTables.map((t) => {
                    const tKots = kots.filter((k) => k.table_id === t.id && k.status !== "cancelled" && k.status !== "billed");
                    return (
                      <Card key={t.id} className="p-4 rounded-xl border-primary bg-primary/5 card-elev" data-testid={`occupied-${t.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-heading text-2xl font-bold text-primary">{t.name}</div>
                          <Badge variant="outline" className="rounded-md text-[10px] uppercase chip-blue">{t.section}</Badge>
                        </div>
                        <ChairRow total={t.capacity} used={t.capacity} />
                        <div className="text-[10px] uppercase tracking-widest mt-3 font-semibold text-primary">
                          Occupied {tKots.length > 0 && `· ${tKots.length} KOTs`}
                        </div>
                        <div className="flex gap-1 mt-3">
                          <Button size="sm" className="flex-1 rounded-md text-xs" onClick={() => { setSelectedTable(t); setActiveTab("pos"); }} data-testid={`occupied-open-${t.id}`}>Open</Button>
                          <Button size="sm" variant="outline" className="rounded-md text-xs" onClick={() => freeTable(t)} data-testid={`occupied-free-${t.id}`}>Free</Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Book Table dialog */}
          <Dialog open={openBook} onOpenChange={setOpenBook}>
            <DialogContent data-testid="book-dialog">
              <DialogHeader><DialogTitle>Time-based Table Booking</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Customer Name</Label>
                  <Input value={bookForm.customer_name} onChange={(e) => setBookForm({ ...bookForm, customer_name: e.target.value })} className="rounded-md mt-1" data-testid="book-name" />
                </div>
                <div><Label>Phone</Label>
                  <Input value={bookForm.customer_phone} onChange={(e) => setBookForm({ ...bookForm, customer_phone: e.target.value })} className="rounded-md mt-1" data-testid="book-phone" />
                </div>
                <div><Label>Guests</Label>
                  <Input type="number" min="1" value={bookForm.guest_count} onChange={(e) => setBookForm({ ...bookForm, guest_count: e.target.value })} className="rounded-md mt-1" data-testid="book-guests" />
                </div>
                <div><Label>Date & Time</Label>
                  <Input type="datetime-local" value={bookForm.start_at} onChange={(e) => setBookForm({ ...bookForm, start_at: e.target.value })} className="rounded-md mt-1" data-testid="book-time" />
                </div>
                <div><Label>Duration (min)</Label>
                  <Input type="number" value={bookForm.duration_min} onChange={(e) => setBookForm({ ...bookForm, duration_min: e.target.value })} className="rounded-md mt-1" data-testid="book-duration" />
                </div>
                <div className="col-span-2"><Label>Table (optional)</Label>
                  <Select value={bookForm.table_id || "none"} onValueChange={(v) => setBookForm({ ...bookForm, table_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="rounded-md mt-1" data-testid="book-table"><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Auto-assign / any table</SelectItem>
                      {tables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name} · {t.section} · {t.capacity} chairs</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Notes</Label>
                  <Input value={bookForm.notes} onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })} placeholder="Birthday, high chair needed, etc." className="rounded-md mt-1" data-testid="book-notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-md" onClick={() => setOpenBook(false)}>Cancel</Button>
                <Button className="rounded-md" onClick={saveReservation} data-testid="book-save">Book Table</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============== KDS ============== */}
        <TabsContent value="kds" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["pending", "preparing", "ready"].map((s) => (
              <div key={s}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{s}</div>
                {kots.filter((k) => k.status === s).map((k) => {
                  const tbl = tables.find((t) => t.id === k.table_id);
                  const badgeText = useToken
                    ? (k.token_no || "—")
                    : (tbl ? `T ${tbl.name}` : (k.order_type === "dine-in" ? "—" : k.order_type.toUpperCase()));
                  return (
                  <Card key={k.id} className="rounded-xl p-3 mb-2 card-elev" data-testid={`kds-${k.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center bg-primary text-primary-foreground font-heading font-bold rounded-md px-2.5 py-0.5 text-sm tabular" data-testid={`kds-badge-${k.id}`}>
                          {badgeText}
                        </span>
                        <div className="font-mono text-xs text-muted-foreground">{k.kot_number}</div>
                      </div>
                      <Badge variant="outline" className={`rounded-md text-[10px] uppercase font-semibold ${STATUS_COLORS[k.status]}`}>{k.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>{k.order_type}</span>
                      {k.waiter_name && <span className="flex items-center gap-1"><HandPlatter className="w-3 h-3" />{k.waiter_name}</span>}
                    </div>
                    <div className="mt-2 space-y-0.5 text-sm">
                      {k.items?.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{it.name}</span>
                          <span className="tabular font-medium">×{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {s === "pending" && <Button size="sm" className="rounded-md text-xs h-7 flex-1" onClick={() => updKotStatus(k, "preparing")} data-testid={`kds-start-${k.id}`}>Start</Button>}
                      {s === "preparing" && <Button size="sm" className="rounded-md text-xs h-7 flex-1 gap-1" onClick={() => updKotStatus(k, "ready")} data-testid={`kds-ready-${k.id}`}><Bell className="w-3 h-3" />Ready · Ring waiter</Button>}
                      {s === "ready" && <Button size="sm" variant="outline" className="rounded-md text-xs h-7 flex-1" onClick={() => updKotStatus(k, "served")} data-testid={`kds-served-${k.id}`}>Served</Button>}
                    </div>
                  </Card>
                );
                })}
                {kots.filter((k) => k.status === s).length === 0 && (
                  <div className="text-xs text-muted-foreground p-3">Empty</div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
        {/* ============== WAITER BOARD ============== */}
        <TabsContent value="waiter" className="mt-4">
          <div className="mb-3 text-xs text-muted-foreground">
            {useToken
              ? <>Customer orders at counter → <b>token issued</b> → kitchen prepares → marks <b className="text-emerald-600">Ready</b> → staff hands over to the customer holding the token.</>
              : <>Waiter takes the order at the <b>table</b> → sends to kitchen → kitchen prepares → marks <b className="text-emerald-600">Ready</b> → waiter collects and serves the table.</>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { key: "ready", label: "To collect (Kitchen ready)", tone: "emerald", icon: Bell, action: { next: "served", label: "Collected & Served" } },
              { key: "preparing", label: "In the kitchen", tone: "amber", icon: Timer, action: null },
              { key: "served", label: "Delivered recently", tone: "slate", icon: CheckCircle2, action: null },
            ].map((col) => {
              const list = kots.filter((k) => k.status === col.key).slice(0, 30);
              const Icon = col.icon;
              return (
                <div key={col.key}>
                  <div className={`flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest font-semibold ${
                    col.tone === "emerald" ? "text-emerald-600" : col.tone === "amber" ? "text-amber-600" : "text-muted-foreground"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {col.label}
                    <span className="ml-auto tabular">{list.length}</span>
                  </div>
                  {list.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">
                      {col.key === "ready" ? "No orders ready. Kitchen is cooking." : "Empty"}
                    </div>
                  ) : list.map((k) => {
                    const tbl = tables.find((t) => t.id === k.table_id);
                    const badgeText = useToken
                      ? (k.token_no || "—")
                      : (tbl ? `T ${tbl.name}` : (k.order_type === "dine-in" ? "—" : k.order_type.toUpperCase()));
                    const subText = useToken
                      ? (tbl ? `Table ${tbl.name}` : k.order_type)
                      : (tbl ? tbl.section : k.order_type);
                    return (
                    <Card key={k.id} className={`rounded-xl p-3 mb-2 card-elev border ${col.key === "ready" ? "border-emerald-500/60 bg-emerald-500/5" : ""}`} data-testid={`waiter-card-${k.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center font-heading font-bold rounded-md px-2.5 py-1 text-sm tabular ${col.key === "ready" ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"}`} data-testid={`waiter-badge-${k.id}`}>
                            {badgeText}
                          </span>
                          <div>
                            <div className="font-mono text-xs text-muted-foreground">{k.kot_number}</div>
                            <div className="text-[11px] text-muted-foreground">{subText}</div>
                          </div>
                        </div>
                        {k.waiter_name && (
                          <Badge variant="outline" className="rounded-md text-[10px] chip-blue gap-1">
                            <HandPlatter className="w-3 h-3" />{k.waiter_name}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-0.5 text-sm">
                        {k.items?.map((it, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="truncate pr-2">{it.name}{it.variant ? ` (${it.variant})` : ""}</span>
                            <span className="tabular font-medium">×{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                      {col.action && (
                        <Button
                          size="sm"
                          className="w-full rounded-md text-xs mt-3 gap-1"
                          onClick={() => updKotStatus(k, col.action.next)}
                          data-testid={`waiter-collect-${k.id}`}
                        >
                          <HandPlatter className="w-3.5 h-3.5" />{col.action.label}
                        </Button>
                      )}
                    </Card>
                  );
                  })}
                </div>
              );
            })}
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

function SummaryTile({ icon: Icon, label, value, tone, testId }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    blue: "text-primary bg-primary/10",
  };
  const cls = toneMap[tone] || "text-muted-foreground bg-secondary";
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3" data-testid={testId}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cls}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
        <div className="font-heading text-2xl font-bold tabular leading-tight">{value}</div>
      </div>
    </div>
  );
}

function ChairRow({ total = 0, used = 0 }) {
  const seats = Array.from({ length: Math.max(0, total) });
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {seats.map((_, i) => (
        <Armchair
          key={i}
          className={`w-4 h-4 ${i < used ? "text-primary" : "text-muted-foreground/40"}`}
          strokeWidth={2}
        />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1 tabular">{used}/{total}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto opacity-30 mb-3" />
      <div className="font-heading text-lg font-semibold">{title}</div>
      {hint && <div className="text-xs mt-1">{hint}</div>}
    </div>
  );
}
