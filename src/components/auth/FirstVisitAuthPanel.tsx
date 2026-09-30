// Copie Zentrix Academy : src/components/auth/FirstVisitAuthPanel.tsx
import { FormEvent, useEffect, useState } from "react";
import { Chrome, Loader2, X } from "lucide-react";
import { apiLogin, apiRegister, setToken } from "@/lib/api-client";

interface FirstVisitAuthPanelProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  defaultMode?: "login" | "register";
}

export default function FirstVisitAuthPanel({
  open,
  onClose,
  onAuthenticated,
  defaultMode = "login",
}: FirstVisitAuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setError(null);
  }, [open, defaultMode]);

  if (!open) return null;

  const saveSession = (emailVal: string, nameVal?: string) => {
    localStorage.setItem(
      "zentrix-academy_session",
      JSON.stringify({
        provider: "password",
        fullName: nameVal,
        email: emailVal,
        createdAt: new Date().toISOString(),
      }),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        await apiRegister(email, fullName, password);
        const loginRes = await apiLogin(email, password);
        setToken(loginRes.access_token);
        saveSession(email, fullName);
      } else {
        const loginRes = await apiLogin(email, password);
        setToken(loginRes.access_token);
        saveSession(email);
      }
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        aria-label="Fermer le panneau d'authentification"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0f1118] text-white shadow-[0_0_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">Acces compte</p>
              <h2 className="mt-2 text-2xl font-black leading-tight">Connexion</h2>
              <p className="mt-2 text-sm text-slate-300">Tout se gere ici dans ce panneau.</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 inline-flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 text-white/70 transition-colors hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="mb-5 grid grid-cols-2 border border-white/10">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`h-11 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-[#FF6B00] text-white" : "bg-transparent text-slate-300 hover:bg-white/5"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setMode("register"); setError(null); }}
              className={`h-11 text-sm font-semibold transition-colors ${
                mode === "register" ? "bg-[#FF6B00] text-white" : "bg-transparent text-slate-300 hover:bg-white/5"
              }`}
            >
              Inscription
            </button>
          </div>

          {error && (
            <div className="mb-4 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nom complet"
                required
                disabled={loading}
                className="h-12 w-full border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-[#FF6B00] disabled:opacity-50"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              disabled={loading}
              className="h-12 w-full border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-[#FF6B00] disabled:opacity-50"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              disabled={loading}
              className="h-12 w-full border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-[#FF6B00] disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 bg-[#FF6B00] px-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#e56000] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Se connecter" : "Creer un compte"}
            </button>
          </form>

          <div className="my-4 h-px bg-white/10" />

          <button
            disabled
            className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 border border-white/15 bg-white/10 px-4 text-sm font-semibold text-slate-400"
            title="Connexion Google non disponible"
          >
            <Chrome className="h-4 w-4" />
            Continuer avec Google
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Connexion Google en cours de configuration
          </p>
        </div>
      </aside>
    </div>
  );
}
