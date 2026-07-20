import { useEffect, useMemo, useState } from "react";
import { api, fmtINR, API } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Plus, Minus, X, Barcode, Trash2 } from "lucide-react";

export default function POS() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [payment, setPayment] = useState({ method: "cash", amount: 0, reference: "" });
  const [discount, setDiscount] = useState(0);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    api.get("/items").then((r) => setItems(r.data));
    api.get("/customers").then((r) => setCustomers(r.data));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
    [items],
  );

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items
      .filter((i) => ["product", "medicine"].includes(i.item_type))
      .filter((i) => category === "all" || i.category === category)
      .filter((i) => !s || i.name.toLowerCase().includes(s) || i.sku?.toLowerCase().includes(s) || i.barcode?.toLowerCase().includes(s));
  }, [items, q, category]);

  const add = (it) => {
    setCart((c) => {
      const ex = c.find((x) => x.item_id === it.id);
      if (ex) return c.map((x) => x.item_id === it.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, {
        item_id: it.id, name: it.name, hsn_sac: it.hsn_sac || "",
        unit: it.unit || "PCS", quantity: 1, rate: it.sale_price || 0,
        discount_pct: 0, gst_rate: it.gst_rate || 0,
      }];
    });
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
    if (data[0]) { add(data[0]); toast.success(`Added ${data[0].name}`); }
    else toast.error("Item not found");
    setQ("");
  };

  const checkout = async (openPdf = false) => {
    if (!cart.length) return toast.error("Cart is empty");
    const payload = {
      doc_type: "invoice", industry: "retail",
      customer_id: customer?.id || null,
      customer_name: customer?.name || "Walk-in Customer",
      customer_phone: customer?.phone || "",
      customer_gstin: customer?.gstin || "",
      customer_state_code: customer?.state_code || "",
      items: cart, discount_amount: discount, round_off: true,
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
        <div className="p-4 border-b border-border flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              data-testid="pos-search"
              autoFocus
              placeholder="Search or scan barcode…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && q) { if (/^\d{6,}$/.test(q)) barcodeScan(q); else if (filtered[0]) add(filtered[0]); } }}
              className="pl-9 rounded-sm h-11"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44 rounded-sm h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
          {filtered.map((it) => (
            <button
              key={it.id}
              data-testid={`pos-item-${it.id}`}
              onClick={() => add(it)}
              className="p-3 border border-border rounded-sm text-left hover:border-primary hover:bg-accent/50 transition-colors"
            >
              <div className="text-sm font-semibold truncate">{it.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{it.category || it.item_type}</div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="tabular font-heading text-lg font-bold text-primary">{fmtINR(it.sale_price)}</span>
                <span className="text-[10px] text-muted-foreground">Stk {it.stock}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">
              <Barcode className="w-10 h-10 mx-auto opacity-30 mb-2" />
              No items found. Add products in <b>Items</b>.
            </div>
          )}
        </div>
      </div>

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
            <div key={i} className="p-3 border-b border-border flex items-center gap-2" data-testid={`cart-row-${i}`}>
              <div className="flex-1">
                <div className="text-sm font-medium truncate">{l.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{fmtINR(l.rate)} · {l.gst_rate}% GST</div>
              </div>
              <Button size="icon" variant="outline" className="w-7 h-7 rounded-sm" onClick={() => changeQty(i, -1)}><Minus className="w-3 h-3" /></Button>
              <span className="w-8 text-center tabular font-semibold">{l.quantity}</span>
              <Button size="icon" variant="outline" className="w-7 h-7 rounded-sm" onClick={() => changeQty(i, 1)}><Plus className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => rm(i)}><X className="w-3 h-3" /></Button>
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
