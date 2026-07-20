import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR, API } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, Search, Download, Eye } from "lucide-react";

const DOC_TITLES = {
  invoice: "Invoices", non_gst_invoice: "Bills of Supply",
  quotation: "Quotations", proforma: "Proforma Invoices",
  credit_note: "Credit Notes", debit_note: "Debit Notes",
  sales_return: "Sales Returns", purchase_return: "Purchase Returns",
};

const STATUS_STYLE = {
  paid: "chip-success",
  partial: "chip-warning",
  unpaid: "chip-danger",
};

export default function Invoices({ docType }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    const params = {};
    if (docType) params.doc_type = docType;
    if (status !== "all") params.status = status;
    const { data } = await api.get("/invoices", { params });
    setItems(data);
  };
  useEffect(() => { load(); }, [docType, status]);

  const filtered = items.filter((i) =>
    !search ||
    i.number?.toLowerCase().includes(search.toLowerCase()) ||
    i.customer_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const title = docType ? DOC_TITLES[docType] : "Invoices";
  const openPdf = (id) => window.open(`${API}/invoices/${id}/pdf`, "_blank");

  return (
    <div className="p-6 lg:p-8" data-testid="invoices-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Sales</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">{title}</h1>
        </div>
        <Button
          className="rounded-sm gap-2" data-testid="new-invoice-btn"
          onClick={() => navigate(`/app/invoices/new${docType ? `?type=${docType}` : ""}`)}
        >
          <Plus className="w-4 h-4" /> New {docType ? title.slice(0, -1) : "Invoice"}
        </Button>
      </div>

      <Card className="rounded-sm p-4 mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Search number / customer" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-sm" data-testid="inv-search" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 rounded-sm" data-testid="inv-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="rounded-sm overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[10px] uppercase tracking-widest">Number</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Date</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Customer</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest">Status</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Total</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-right">Balance</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((i) => (
              <TableRow key={i.id} data-testid={`inv-${i.id}`} className="cursor-pointer" onClick={() => navigate(`/app/invoices/${i.id}`)}>
                <TableCell className="font-mono text-xs">
                  <FileText className="w-3 h-3 inline text-muted-foreground mr-2" />
                  {i.number}
                </TableCell>
                <TableCell className="text-xs">{i.date}</TableCell>
                <TableCell>{i.customer_name || "Walk-in"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`rounded-sm text-[10px] uppercase ${STATUS_STYLE[i.status] || ""}`}>{i.status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular font-semibold">{fmtINR(i.grand_total)}</TableCell>
                <TableCell className="text-right tabular text-muted-foreground">{fmtINR(i.balance_due)}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" onClick={() => navigate(`/app/invoices/${i.id}`)} data-testid={`view-${i.id}`}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => openPdf(i.id)} data-testid={`pdf-${i.id}`}><Download className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">No {title.toLowerCase()} yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
