import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.js';
import PrivateRoute from './components/PrivateRoute.jsx';
import Layout from './components/Layout.jsx';
import Spinner from './components/Spinner.jsx';

const LoginPage       = lazy(() => import('./pages/LoginPage.jsx'));
const RestaurantsPage = lazy(() => import('./pages/RestaurantsPage.jsx'));
const PlatformAdminsPage = lazy(() => import('./pages/PlatformAdminsPage.jsx'));
const DashboardPage   = lazy(() => import('./pages/DashboardPage.jsx'));
const MenuPage        = lazy(() => import('./pages/MenuPage.jsx'));
const TablesPage      = lazy(() => import('./pages/TablesPage.jsx'));
const UsersPage       = lazy(() => import('./pages/UsersPage.jsx'));
const OrdersPage      = lazy(() => import('./pages/OrdersPage.jsx'));
const KitchenBoardPage = lazy(() => import('./pages/KitchenBoardPage.jsx'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  );
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/restaurants" replace />;
  return <Navigate to={`/restaurants/${user.restaurantId}/dashboard`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<RootRedirect />} />

              <Route
                path="/restaurants"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN']}>
                    <RestaurantsPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/platform-admins"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN']}>
                    <PlatformAdminsPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/restaurants/:restaurantId/dashboard"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN', 'OWNER', 'MANAGER']}>
                    <DashboardPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/restaurants/:restaurantId/menu"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER']}>
                    <MenuPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/restaurants/:restaurantId/tables"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN', 'OWNER', 'MANAGER']}>
                    <TablesPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/restaurants/:restaurantId/users"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN', 'OWNER', 'MANAGER']}>
                    <UsersPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/restaurants/:restaurantId/orders"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER']}>
                    <OrdersPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/kitchen/:restaurantId"
                element={
                  <PrivateRoute allowedRoles={['SUPER_ADMIN', 'OWNER', 'MANAGER', 'KITCHEN', 'WAITER']}>
                    <KitchenBoardPage />
                  </PrivateRoute>
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
