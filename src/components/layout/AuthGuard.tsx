import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { useAuthStore, type AppRole, resolveUserRole } from '../../store/authStore';
import { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const { user, profile, loading: storeLoading } = useAuthStore();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, user: clerkUser } = useUser();
  const [resolvedRole, setResolvedRole] = useState<AppRole | null>(profile?.role || null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    if (!isClerkLoaded) return;

    (async () => {
      if (isClerkSignedIn && clerkUser) {
        const r = await resolveUserRole(clerkUser, clerkUser.id);
        if (active) {
          setResolvedRole(r);
          setChecking(false);
        }
        return;
      }

      if (profile?.role) {
        if (active) {
          setResolvedRole(profile.role);
          setChecking(false);
        }
        return;
      }

      if (!storeLoading) {
        if (active) {
          setResolvedRole(null);
          setChecking(false);
        }
      }
    })();

    return () => { active = false; };
  }, [isClerkLoaded, isClerkSignedIn, clerkUser, profile?.role, storeLoading]);

  if (!isClerkLoaded || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isClerkSignedIn && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = resolvedRole || 'user';
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
