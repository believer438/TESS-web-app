import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AIHomePage from "@/pages/AIHomePage";
import AuthRequiredDialog from "@/components/auth/AuthRequiredDialog";

export default function AuthRequiredPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") navigate("/", { replace: true }); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [navigate]);

  const openAuth = (mode: "login" | "register") => {
    navigate(`/login?redirect=${encodeURIComponent(redirectTo)}&mode=${mode}`);
  };

  return (
    <div className="relative h-screen overflow-hidden bg-white dark:bg-[#0b0d10]">
      <AIHomePage />
      <AuthRequiredDialog redirectTo={redirectTo} onClose={() => navigate("/", { replace: true })} onOpenAuth={openAuth} />
    </div>
  );
}
