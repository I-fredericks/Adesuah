import { Spinner } from './ui';

const ProtectedRoute = ({ children, require }) => {
  const { user, loading, isPlatform, isManagement, canManageFees, canTeach } = useAuth();

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

  if (require) {
    const allowed = { platform: isPlatform, management: isManagement, fees: canManageFees, teach: canTeach };
    if (require.some((r) => !allowed[r])) {
      return (
        <div className="p-8 text-center text-slate-500">
          You do not have permission to view this page.
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
