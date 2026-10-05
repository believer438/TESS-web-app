import { useEffect } from "react";
import { buildApiUrl } from "@/lib/env";
import { markOAuthSession } from "@/lib/api-client";

export default function GoogleCallbackPage() {
  useEffect(() => {
    const current = new URL(window.location.href);
    markOAuthSession();
    const target = buildApiUrl(`/auth/google/callback${current.search}`);
    window.location.replace(target);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center dark:bg-slate-950">
      <div>
        <img src="/google-logo.png" alt="" className="mx-auto h-10 w-10 object-contain" />
        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Connexion Google en cours...
        </p>
      </div>
    </div>
  );
}
