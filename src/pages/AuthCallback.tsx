import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/");
  }, []);

  return <p>Signing you in...</p>;
};

export default AuthCallback;