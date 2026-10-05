import type { ReactNode } from "react";
import { Activity, Bell, Bot, Brain, ListTodo, MessageSquare, ShieldCheck, Wrench, GitBranch, Inbox, Store, PlugZap, MapPin, LockKeyhole, Images, Library } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  ["/", "Assistant", MessageSquare],
  ["/operations", "Opérations", Activity],
  ["/agents", "Agents", Bot],
  ["/tasks", "Tâches", ListTodo],
  ["/tools", "Outils", Wrench],
  ["/reminders", "Rappels", Bell],
  ["/follow-ups", "Suivis", GitBranch],
  ["/memory", "Mémoire", Brain],
  ["/notifications", "Notifications", Inbox],
  ["/security", "Sécurité", ShieldCheck],
  ["/marketplace", "Catalogue", Store],
  ["/connections", "Connexions", PlugZap],
  ["/city", "Ville", MapPin],
  ["/operator", "Opérateur", LockKeyhole],
  ["/images", "Images", Images],
  ["/library", "Bibliothèque", Library],
] as const;

export default function TessPageLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-screen min-h-0 flex-col bg-[var(--tess-bg)] text-[var(--tess-ink)]">
    <header className="shrink-0 border-b border-[var(--tess-line)] bg-white/90 px-4 py-3 backdrop-blur dark:bg-[#111827]/90 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <NavLink to="/" className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight" aria-label="Retourner à TESS AI"><img src="/ai_icon.jpg" alt="" className="h-8 w-8 rounded-lg object-contain" /> <span className="hidden sm:inline">TESS AI</span></NavLink>
        <nav aria-label="Navigation TESS" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {links.map(([to, label, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${isActive ? "bg-[var(--tess-mint)] text-[var(--tess-ink)]" : "text-[var(--tess-muted)] hover:bg-[var(--tess-mint)] hover:text-[var(--tess-ink)]"}`}><Icon className="h-3.5 w-3.5" />{label}</NavLink>)}
        </nav>
      </div>
    </header>
    <div className="min-h-0 flex-1">{children}</div>
  </div>;
}
