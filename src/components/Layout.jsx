import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.js';
import { authApi } from '../api/auth.js';
import { restaurantsApi } from '../api/restaurants.js';

const NAV_ICONS = {
  dashboard: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  restaurants: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  menu: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  tables: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  users: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  orders: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  kitchen: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  ),
};

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-700 text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function SidebarContent({ restaurantId, restaurantName, user, onClose }) {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isKitchen = user?.role === 'KITCHEN';
  const rid = restaurantId || user?.restaurantId;

  return (
    <nav className="flex-1 space-y-1 p-4">
      {isSuperAdmin && (
        <>
          <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Global
          </p>
          <NavItem to="/restaurants" icon={NAV_ICONS.restaurants} label="Restaurants" />
          <div className="my-3 border-t border-gray-200" />
        </>
      )}

      {rid && !isKitchen && (
        <>
          <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Restaurant
          </p>
          {restaurantName && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-primary-50 border border-primary-100">
              <p className="text-xs font-semibold text-primary-700 truncate">{restaurantName}</p>
            </div>
          )}

          {(isSuperAdmin || ['OWNER', 'MANAGER'].includes(user?.role)) && (
            <NavItem
              to={`/restaurants/${rid}/dashboard`}
              icon={NAV_ICONS.dashboard}
              label="Tableau de bord"
            />
          )}

          {!isKitchen && (
            <NavItem
              to={`/restaurants/${rid}/menu`}
              icon={NAV_ICONS.menu}
              label="Menu"
            />
          )}

          {(isSuperAdmin || ['OWNER', 'MANAGER'].includes(user?.role)) && (
            <NavItem
              to={`/restaurants/${rid}/tables`}
              icon={NAV_ICONS.tables}
              label="Tables"
            />
          )}

          {(isSuperAdmin || ['OWNER', 'MANAGER'].includes(user?.role)) && (
            <NavItem
              to={`/restaurants/${rid}/users`}
              icon={NAV_ICONS.users}
              label="Utilisateurs"
            />
          )}

          {!isKitchen && (
            <NavItem
              to={`/restaurants/${rid}/orders`}
              icon={NAV_ICONS.orders}
              label="Commandes"
            />
          )}

          <div className="my-3 border-t border-gray-200" />
        </>
      )}

      {rid && (
        <NavItem
          to={`/kitchen/${rid}`}
          icon={NAV_ICONS.kitchen}
          label="Cuisine"
        />
      )}
    </nav>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const params = useParams();
  const { user, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');

  const restaurantId = params.restaurantId;

  useEffect(() => {
    const rid = restaurantId || user?.restaurantId;
    if (!rid) { setRestaurantName(''); return; }
    restaurantsApi.get(rid).then((r) => setRestaurantName(r.name)).catch(() => setRestaurantName(''));
  }, [restaurantId, user?.restaurantId]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // ignore errors on logout
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const roleColors = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800',
    OWNER: 'bg-blue-100 text-blue-800',
    MANAGER: 'bg-green-100 text-green-800',
    WAITER: 'bg-yellow-100 text-yellow-800',
    KITCHEN: 'bg-orange-100 text-orange-800',
  };

  const roleLabels = {
    SUPER_ADMIN: 'Super Admin',
    OWNER: 'Propriétaire',
    MANAGER: 'Gérant',
    WAITER: 'Serveur',
    KITCHEN: 'Cuisine',
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
          <div className="h-8 w-8 rounded-lg bg-primary-700 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">CFG</span>
        </div>

        <SidebarContent
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          user={user}
          onClose={() => setSidebarOpen(false)}
        />

        {/* User section at bottom */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className={`badge text-xs ${roleColors[user?.role] || 'bg-gray-100 text-gray-700'}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-3 w-full btn btn-secondary btn-sm flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            Bonjour, <span className="font-medium text-gray-900">{user?.firstName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
