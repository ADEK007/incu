import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { useAuthStore, resolveUserRole } from '../../store/authStore';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, profile, loading: storeLoading } = useAuthStore();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, user: clerkUser } = useUser();
  const [status, setStatus] = useState<'checking' | 'admin' | 'denied'>('checking');

  useEffect(() => {
    let active = true;

    // While Clerk is loading, stay in checking state
    if (!isClerkLoaded) return;

    const checkAccess = async () => {
      // 1. If signed in via Clerk
      if (isClerkSignedIn && clerkUser) {
        const role = await resolveUserRole(clerkUser, clerkUser.id);
        const isAdminRole = ['admin', 'super_admin', 'manager', 'developer'].includes(role);
        if (active) {
          setStatus(isAdminRole ? 'admin' : 'denied');
        }
        return;
      }

      // 2. If store already has profile role
      if (profile?.role) {
        const isAdminRole = ['admin', 'super_admin', 'manager', 'developer'].includes(profile.role);
        if (active) {
          setStatus(isAdminRole ? 'admin' : 'denied');
        }
        return;
      }

      // Wait if fallback store is still loading
      if (storeLoading) return;

      // 3. Not logged in
      if (active) {
        setStatus('denied');
      }
    };

    void checkAccess();

    return () => { active = false; };
  }, [isClerkLoaded, isClerkSignedIn, clerkUser, profile?.role, storeLoading]);

  if (!isClerkLoaded || (storeLoading && !isClerkSignedIn) || status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;


