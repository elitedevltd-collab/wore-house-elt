import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { StockBalancePage } from './pages/StockBalancePage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { IssuesPage } from './pages/IssuesPage';
import { TransfersPage } from './pages/TransfersPage';
import { CountsPage } from './pages/CountsPage';
import { AuditPage } from './pages/AuditPage';
import { LabelsPage } from './pages/LabelsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CustomersPage } from './pages/CustomersPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { SalesOrdersPage } from './pages/SalesOrdersPage';
import { InventoryControlPage } from './pages/InventoryControlPage';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="stock" element={<StockBalancePage />} />
        <Route path="receipts" element={<ReceiptsPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="transfers" element={<TransfersPage />} />
        <Route path="counts" element={<CountsPage />} />
        <Route path="labels" element={<LabelsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="sales-orders" element={<SalesOrdersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="inventory-control" element={<InventoryControlPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </UIProvider>
  );
}
