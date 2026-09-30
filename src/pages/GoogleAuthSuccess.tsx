// Copie Zentrix Academy : src/pages/GoogleAuthSuccess.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetMe, clearAuth, clearOAuthSession, needsLearningProfile, setToken } from "@/lib/api-client";

export default function GoogleAuthSuccess() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finalisation de la connexion Google...");

  useEffect(() => {
    apiGetMe()
      .then((profile) => {
        clearOAuthSession();
        setToken("__cookie_session__");
        navigate(needsLearningProfile(profile) ? "/login?onboarding=1&redirect=%2Fdashboard" : "/dashboard", { replace: true });
      })
      .catch(() => {
        clearAuth();
        setMessage("Connexion Google impossible. Veuillez réessayer.");
        window.setTimeout(() => navigate("/login", { replace: true }), 1200);
      });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center dark:bg-slate-950">
      <div>
        <img src="/google-logo.png" alt="" className="mx-auto h-10 w-10 object-contain" />
        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {message}
        </p>
      </div>
    </div>
  );
}
