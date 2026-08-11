import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import TeacherDashboard from './dashboards/TeacherDashboard';
import StudentDashboard from './dashboards/StudentDashboard';

/**
 * Dashboard Router Component
 * Routes users to their role-specific dashboard
 */
const Dashboard = () => {
  const { user } = useAuth();

  const portalMode = (() => {
    try { return localStorage.getItem('portal_mode') || 'admin'; } catch { return 'admin'; }
  })();

  const isDualRole = user?.role === 'staff' && user?.is_admin;

  if (user?.role === 'admin' || (isDualRole && portalMode === 'admin')) return <AdminRedirect />;
  if (user?.role === 'staff') return <TeacherDashboard />;
  if (user?.role === 'parent')  return <ParentRedirect />;
  return <StudentDashboard />;
};

const AdminRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => { 
    navigate('/system-admin', { replace: true }); 
  }, [navigate]);
  return null;
};

// Parents are redirected by ProtectedRoute, but handle the edge case here too
const ParentRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => { 
    navigate('/parent-dashboard', { replace: true }); 
  }, [navigate]);
  return null;
};

export default Dashboard;
