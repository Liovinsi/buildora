import { Navigate, useLocation } from 'react-router';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';

export function RequireCustomer({ children }) {
  const { isLoggedIn } = useCustomerAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
