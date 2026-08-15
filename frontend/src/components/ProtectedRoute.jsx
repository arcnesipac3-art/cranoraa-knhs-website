import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, ROLE_HOME } from '../constants/roles';
import { protectedRoutes } from '../constants/routes';

function getRouteKey(pathname) {
  return pathname.replace(/^\/+/, '').replace(/\/+$/, '').split('?')[0].split('/')[0];
}

const ProtectedRoute = ({ children }) => {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-hidden="true"></div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect parent from /dashboard to /parent-dashboard
  if (user.role === Role.PARENT && location.pathname === '/dashboard') {
    return <Navigate to="/parent-dashboard" replace />;
  }

  // Check route access using protectedRoutes from routes.js
  const routeKey = getRouteKey(location.pathname);
  const routeDef = protectedRoutes.find(r => r.path === routeKey);
  const allowedRoles = routeDef?.roles;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Staff with is_admin flag can access admin-only routes (unless in teacher portal mode)
    if (user.role === Role.STAFF && (user.is_admin || user.is_superuser)) {
      const portalMode = (() => {
        try { return localStorage.getItem('portal_mode') || 'admin'; } catch { return 'admin'; }
      })();
      if (portalMode === 'admin') return children;
    }
    return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;