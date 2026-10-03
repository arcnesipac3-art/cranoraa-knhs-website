import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, ROLE_HOME } from '../constants/roles';
import { protectedRoutes } from '../constants/routes';
import { hasModuleAccess, moduleForPath } from '../constants/modules';

function getRouteKey(pathname) {
  return pathname.replace(/^\/+/, '').replace(/\/+$/, '').split('?')[0].split('/')[0];
}

const ProtectedRoute = ({ children }) => {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b border-primary" aria-hidden="true"></div>
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
    if (user.role === Role.STAFF && user.is_admin) {
      const portalMode = (() => {
        try { return localStorage.getItem('portal_mode') || 'admin'; } catch { return 'admin'; }
      })();
      if (portalMode === 'admin') return children;
    }
    return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;
  }

  // Department module access (Decision §11-A). This comes AFTER the role check
  // deliberately, mirroring the backend, where role is first and authoritative
  // and departments can only narrow what it already allowed. The API refuses
  // these requests regardless — this just replaces a page full of 403s with a
  // redirect. `hasModuleAccess` fails open while `effective_modules` is still
  // loading, so a slow profile response can never bounce someone to home.
  const requiredModule = moduleForPath(location.pathname);
  if (!hasModuleAccess(user, requiredModule)) {
    return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;