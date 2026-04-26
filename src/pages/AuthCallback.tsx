import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // 🔥 check if user exists in your profiles table
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // ❌ Not registered before → block
        await supabase.auth.signOut();
        alert("You must register first!");
        navigate("/register");
      } else {
        // ✅ OK
        navigate("/");
      }
    };

    checkUser();
  }, []);

  return <p>Checking...</p>;
};

export default AuthCallback;