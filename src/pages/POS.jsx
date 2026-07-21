import { useEffect, useMemo, useState } from "react";
import { api, fmtINR, API } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus, Minus, X, Barcode, Ruler, Package } from "lucide-react";

export default function POS() {
  const { industry } = useAuth();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [payment, setPayment] = useState({ method: "cash", amount: 0, reference: "" });
  const [discount, setDiscount] = useState(0);
  const [category, setCategory] = useState("all");
  const [department, setDepartment] = useState("all");
  const [sizePickerItem, setSizePickerItem] = useState(null);

  useEffect(() => {
    api.get("/items").then((r) => setItems(r.data));
    api.get("/customers").then((r) => setCustomers(r.data));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
    [items],
  );
  const departments = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.department).filter(Boolean)))],
    [items],
  );

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items
      .filter((i) => ["product", "medicine"].includes(i.item_type))
      .filter((i) => category === "all" || i.category === category)
      .filter((i) => industry !== "textile" || department === "all" || i.department === department)
      .filter((i) => !s || i.name.toLowerCase().includes(s) || i.sku?.toLowerCase().includes(s) || i.barcode?.toLowerCase().includes(s) || i.brand?.toLowerCase().includes(s));
  }, [items, q, category, department, industry]);

  const addLine = (it, sizeRow = null) => {
    const rate = sizeRow?.price > 0 ? sizeRow.price : (it.sale_price || 0);
    const lineKey = sizeRow ? `${it.id}::${sizeRow.size}` : it.id;
    setCart((c) => {
      const ex = c.find((x) => x._key === lineKey);
      if (ex) return c.map((x) => x._key === lineKey ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, {
        _key: lineKey,
        item_id: it.id,
        name: sizeRow ? `${it.name} · ${sizeRow.size}` : it.name,
        size: sizeRow?.size || null,
        serial_no: "",
        needs_serial: (it.warranty_months || 0) > 0,
        hsn_sac: it.hsn_sac || "",
        unit: it.unit || "PCS",
        quantity: 1,
        rate,
        discount_pct: 0,
        gst_rate: it.gst_rate || 0,
      }];
    });
  };

  const onItemClick = (it) => {
    // If this is a textile item with size-wise stock, prompt for size selection.
    const hasSizes = Array.isArray(it.size_stocks) && it.size_stocks.some((s) => (s.qty || 0) > 0);
    if (industry === "textile" && hasSizes) {
      setSizePickerItem(it);
      return;
    }
    addLine(it);
  };

  const changeQty = (idx, d) =>
    setCart((c) => c.map((x, i) => i === idx ? { ...x, quantity: Math.max(0, x.quantity + d) } : x).filter((x) => x.quantity > 0));
  const rm = (idx) => setCart((c) => c.filter((_, i) => i !== idx));

  const totals = useMemo(() => {
    let taxable = 0, tax = 0;
    cart.forEach((l) => {
      const gross = l.quantity * l.rate;
      const disc = gross * (l.discount_pct / 100);
      const tx = gross - disc;
      taxable += tx;
      tax += tx * (l.gst_rate / 100);
    });
    const disc = discount;
    let grand = taxable - disc + tax;
    const r = Math.round(grand);
    const roundOff = r - grand;
    grand = r;
    return { taxable, tax, discount: disc, roundOff, grand };
  }, [cart, discount]);

  const barcodeScan = async (code) => {
    const { data } = await api.get("/items", { params: { barcode: code } });
    if (data[0]) { onItemClick(data[0]); toast.success(`Added ${data[0].name}`); }
    else toast.error("Item not found");
    setQ("");
  };

  const checkout = async (openPdf = false) => {
    if (!cart.length) return toast.error("Cart is empty");
    const industryTag = industry === "textile" ? "textile" : "retail";
    const payload = {
      doc_type: "invoice", industry: industryTag,
      customer_id: customer?.id || null,
      customer_name: customer?.name || "Walk-in Customer",
      customer_phone: customer?.phone || "",
      customer_gstin: customer?.gstin || "",
      customer_state_code: customer?.state_code || "",
      items: cart.map(({ _key, size, serial_no, needs_serial, ...rest }) => ({
        ...rest,
        variant_name: size || undefined,
        serial_no: serial_no || undefined,
      })),
      discount_amount: discount, round_off: true,
      payments: payment.amount > 0 ? [{ ...payment, amount: payment.amount || totals.grand }] : [{ ...payment, amount: totals.grand }],
    };
    const { data } = await api.post("/invoices", payload);
    toast.success(`Bill ${data.number} · ${fmtINR(data.grand_total)}`);
    if (openPdf) window.open(`${API}/invoices/${data.id}/pdf`, "_blank");
    setCart([]); setPayment({ method: "cash", amount: 0, reference: "" }); setDiscount(0);
    api.get("/items").then((r) => setItems(r.data));
  };

  return (
    <div className="h-[calc(100vh-56px)] flex" data-testid="pos-page">
      {/* Left: catalog */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="p-4 border-b border-border flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              data-testid="pos-search"
              autoFocus
              placeholder={industry === "textile" ? "Search product / brand / barcode…" : "Search or scan barcode…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && q) { if (/^\d{6,}$/.test(q)) barcodeScan(q); else if (filtered[0]) onItemClick(filtered[0]); } }}
              className="pl-9 rounded-sm h-11"
            />
          </div>
          {industry === "textile" && (
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-40 rounded-sm h-11" data-testid="pos-department"><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d} value={d}>{d === "all" ? "All departments" : d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44 rounded-sm h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
          {filtered.map((it) => {
            const hasSizes = industry === "textile" && Array.isArray(it.size_stocks) && it.size_stocks.some((s) => (s.qty || 0) > 0);
            return (
              <button
                key={it.id}
                data-testid={`pos-item-${it.id}`}
                onClick={() => onItemClick(it)}
                className="p-3 border border-border rounded-sm text-left hover:border-primary hover:bg-accent/50 transition-colors"
              >
                {industry === "textile" && it.brand && (
                  <div className="text-[9px] uppercase tracking-widest text-primary font-bold">{it.brand}</div>
                )}
                <div className="text-sm font-semibold truncate">{it.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {industry === "textile" && it.color ? `${it.category || it.item_type} · ${it.color}` : (it.category || it.item_type)}
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="tabular font-heading text-lg font-bold text-primary">{fmtINR(it.sale_price)}</span>
                  {hasSizes ? (
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                      <Ruler className="w-3 h-3" /> {it.size_stocks.filter((s) => (s.qty || 0) > 0).length} sizes
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Stk {it.stock}</span>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">
              <Barcode className="w-10 h-10 mx-auto opacity-30 mb-2" />
              No items found. Add products in <b>Items</b>.
            </div>
          )}
        </div>
      </div>

      {/* Size picker dialog (textile mode) */}
      <Dialog open={!!sizePickerItem} onOpenChange={(o) => !o && setSizePickerItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-primary" />
              Choose size — {sizePickerItem?.name}
            </DialogTitle>
            <DialogDescription>
              Tap a size to add it to the cart. Stock deducts from that size on billing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {(sizePickerItem?.size_stocks || []).map((s) => {
              const out = (s.qty || 0) <= 0;
              const price = s.price > 0 ? s.price : sizePickerItem?.sale_price;
              return (
                <button
                  key={s.size}
                  data-testid={`size-pick-${s.size}`}
                  disabled={out}
                  onClick={() => {
                    addLine(sizePickerItem, s);
                    toast.success(`Added ${sizePickerItem.name} · ${s.size}`);
                    setSizePickerItem(null);
                  }}
                  className={`p-3 border rounded-sm text-center transition-colors ${
                    out
                      ? "border-border/50 bg-secondary/30 opacity-50 cursor-not-allowed"
                      : "border-border hover:border-primary hover:bg-accent/50"
                  }`}
                >
                  <div className="text-lg font-heading font-bold">{s.size}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {out ? "Out" : `${s.qty} in stock`}
                  </div>
                  <div className="text-xs tabular text-primary font-semibold mt-1">{fmtINR(price)}</div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-sm" onClick={() => setSizePickerItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Right: cart */}
      <div className="w-96 flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <Select value={customer?.id || "walkin"} onValueChange={(v) => setCustomer(customers.find((c) => c.id === v) || null)}>
            <SelectTrigger className="rounded-sm" data-testid="pos-customer"><SelectValue placeholder="Walk-in Customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="walkin">Walk-in Customer</SelectItem>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {cart.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              Cart is empty — tap items to add.
            </div>
          ) : cart.map((l, i) => (
            <div key={i} className="p-3 border-b border-border" data-testid={`cart-row-${i}`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {fmtINR(l.rate)} · {l.gst_rate}% GST
                    {l.size && <span className="ml-1 text-primary font-bold">· Size {l.size}</span>}
                  </div>
                </div>
                <Button size="icon" variant="outline" className="w-7 h-7 rounded-sm" onClick={() => changeQty(i, -1)}><Minus className="w-3 h-3" /></Button>
                <span className="w-8 text-center tabular font-semibold">{l.quantity}</span>
                <Button size="icon" variant="outline" className="w-7 h-7 rounded-sm" onClick={() => changeQty(i, 1)}><Plus className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => rm(i)}><X className="w-3 h-3" /></Button>
              </div>
              {l.needs_serial && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold whitespace-nowrap">Serial #</span>
                  <input
                    type="text"
                    placeholder="Scan or type serial/IMEI"
                    value={l.serial_no || ""}
                    onChange={(e) => setCart((c) => c.map((x, xi) => xi === i ? { ...x, serial_no: e.target.value } : x))}
                    className="flex-1 h-7 px-2 rounded-sm border border-amber-300 bg-amber-50 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    data-testid={`cart-serial-${i}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border space-y-2 text-sm">
          <Row label="Taxable" value={totals.taxable} />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex-1">Discount ₹</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-24 h-8 rounded-sm text-right tabular" data-testid="pos-discount" />
          </div>
          <Row label="GST" value={totals.tax} />
          <Row label="Round off" value={totals.roundOff} />
          <div className="flex justify-between font-heading text-2xl font-bold pt-2 border-t border-border">
            <span>Total</span>
            <span className="tabular text-primary" data-testid="pos-total">{fmtINR(totals.grand)}</span>
          </div>

          <div className="grid grid-cols-4 gap-1 pt-2">
            {["cash", "upi", "card", "bank"].map((m) => (
              <Button
                key={m}
                data-testid={`pay-${m}`}
                variant={payment.method === m ? "default" : "outline"}
                size="sm"
                className="rounded-sm capitalize text-xs"
                onClick={() => setPayment({ ...payment, method: m })}
              >{m}</Button>
            ))}
          </div>

          <Button className="w-full rounded-sm h-12 gap-2 mt-2" onClick={() => checkout(false)} data-testid="pos-checkout" disabled={!cart.length}>
            Charge {fmtINR(totals.grand)}
          </Button>
          <Button variant="outline" className="w-full rounded-sm" onClick={() => checkout(true)} disabled={!cart.length}>
            Charge & Print
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{fmtINR(value)}</span>
    </div>
  );
}
