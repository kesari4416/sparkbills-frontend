import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/layouts/AppLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Restaurant from "@/pages/Restaurant";
import Hospital from "@/pages/Hospital";
import Pharmacy from "@/pages/Pharmacy";
import Invoices from "@/pages/Invoices";
import NewInvoice from "@/pages/NewInvoice";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Purchases from "@/pages/Purchases";
import Customers from "@/pages/Customers";
import Suppliers from "@/pages/Suppliers";
import Items from "@/pages/Items";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Vouchers from "@/pages/Vouchers";
import Ledger from "@/pages/Ledger";
import StockOps from "@/pages/StockOps";
import Shift from "@/pages/Shift";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/landing" element={<Navigate to="/login" replace />} />
      <Route
        path="/app"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="restaurant" element={<Restaurant />} />
        <Route path="hospital" element={<Hospital />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<NewInvoice />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="quotations" element={<Invoices docType="quotation" />} />
        <Route path="proforma" element={<Invoices docType="proforma" />} />
        <Route path="sales-orders" element={<Invoices docType="sales_order" />} />
        <Route path="delivery-challans" element={<Invoices docType="delivery_challan" />} />
        <Route path="credit-notes" element={<Invoices docType="credit_note" />} />
        <Route path="debit-notes" element={<Invoices docType="debit_note" />} />
        <Route path="sales-returns" element={<Invoices docType="sales_return" />} />
        <Route path="vouchers" element={<Vouchers />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="stock-ops" element={<StockOps />} />
        <Route path="shift" element={<Shift />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="items" element={<Items />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
