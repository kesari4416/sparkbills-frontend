import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/layouts/AppLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Restaurant from "@/pages/Restaurant";
import Alterations from "@/pages/Alterations";
import Pharmacy from "@/pages/Pharmacy";
import Deliveries from "@/pages/Deliveries";
import Warranties from "@/pages/Warranties";
import Electronics from "@/pages/Electronics";
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
import Quotations from "@/pages/Quotations";
import Orders from "@/pages/Orders";
import PlatformLayout from "@/layouts/PlatformLayout";
import PlatformDashboard from "@/pages/PlatformDashboard";
import PlatformTenants from "@/pages/PlatformTenants";
import PlatformClientDetail from "@/pages/PlatformClientDetail";
import PlatformImpersonationAudit from "@/pages/PlatformImpersonationAudit";

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

function SuperAdminOnly({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.platform_role !== "super_admin") return <Navigate to="/app" replace />;
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
        path="/platform"
        element={
          <SuperAdminOnly>
            <PlatformLayout />
          </SuperAdminOnly>
        }
      >
        <Route index element={<PlatformDashboard />} />
        <Route path="tenants" element={<PlatformTenants />} />
        <Route path="tenants/:tid" element={<PlatformClientDetail />} />
        <Route path="audit" element={<PlatformImpersonationAudit />} />
      </Route>
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
        <Route path="alterations" element={<Alterations />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="electronics" element={<Electronics />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="warranties" element={<Warranties />} />
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
        <Route path="quotations" element={<Quotations />} />
        <Route path="orders" element={<Orders />} />
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
