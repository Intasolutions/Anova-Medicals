import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { Dashboard, Operations } from './pages/Pages';

import { AuthProvider } from './features/auth/context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './features/auth/pages/LoginPage';
import ProductSizes from './features/master-data/pages/ProductSizes';
import Designations from './features/master-data/pages/Designations';
import GlobalOperations from './features/master-data/pages/Operations';

import EmployeeRegistry from './features/employees/pages/EmployeeRegistry';
import ProductCatalog from './features/products/pages/ProductCatalog';
import InventoryDashboard from './features/inventory/pages/InventoryDashboard';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="employees" element={<EmployeeRegistry />} />
              <Route path="products" element={<ProductCatalog />} />
              <Route path="inventory" element={<InventoryDashboard />} />
              <Route path="operations" element={<Operations />} />
              
              {/* Master Data Routes */}
              <Route path="master-data/sizes" element={<ProductSizes />} />
              <Route path="master-data/designations" element={<Designations />} />
              <Route path="master-data/operations" element={<GlobalOperations />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
