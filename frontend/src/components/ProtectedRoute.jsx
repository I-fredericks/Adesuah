import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user || !localStorage.getItem('token')) {
    window.location.href = '/login';
    return null;
  }

  return children;
};

export default ProtectedRoute;
