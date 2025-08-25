import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-[800px] h-[600px] flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard, non-authenticated to auth
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
};

export default Index;
