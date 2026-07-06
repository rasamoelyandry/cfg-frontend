import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.js';

export default function PrivateRoute({ children, allowedRoles }) {
  const { user, accessToken } = useAuthStore();

  // Not authenticated
  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their home
    if (user.role === 'SUPER_ADMIN') {
      return <Navigate to="/restaurants" replace />;
    }
    if (user.role === 'KITCHEN') {
      return <Navigate to={`/kitchen/${user.restaurantId}`} replace />;
    }
    return <Navigate to={`/restaurants/${user.restaurantId}/menu`} replace />;
  }

  // If children passed, render them; otherwise render the Outlet for nested routes
  return children ? children : <Outlet />;
}
