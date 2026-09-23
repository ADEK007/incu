import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRouteForRole, getProfileRole, useAuthStore } from "@/store/authStore";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!cancelled) navigate("/", { replace: true });
        return;
      }

      const { setUser, fetchProfile } = useAuthStore.getState();
      setUser(session.user);
      setMessage("Loading your profile...");
      await fetchProfile(session.user.id);

      if (cancelled) return;

      const role = await getProfileRole(session.user.id).catch(() => 'user' as const);
      navigate(getDefaultRouteForRole(role), { replace: true });
    };

    run();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  );
};

export default AuthCallback;
