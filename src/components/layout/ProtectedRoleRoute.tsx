import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { useAuthStore, type AppRole, resolveUserRole } from '@/store/authStore';
import { useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export default function ProtectedRoleRoute({ children, allowedRoles }: Props) {
  const { user, profile, loading: storeLoading } = useAuthStore();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, user: clerkUser } = useUser();
  const [resolvedRole, setResolvedRole] = useState<AppRole | null>(profile?.role || null);
  const [checking, setChecking] = useState(true);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isClerkSignedIn && !user) {
    return <Navigate to="/login" replace />;
  }

  const role = resolvedRole || 'user';
  if (!allowedRoles.includes(role)) {
    if (role === 'admin' || role === 'super_admin') return <Navigate to="/admin" replace />;
    if (role === 'dealer') return <Navigate to="/dealer" replace />;
    if (role === 'farmer') return <Navigate to="/farmer" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
