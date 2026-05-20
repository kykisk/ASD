import { Navigate } from 'react-router-dom';
import { useAdminAuthStore } from '../stores/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAdminAuthStore();

  if (!isAuthenticated || user?.role !== 'SYSTEM_ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
