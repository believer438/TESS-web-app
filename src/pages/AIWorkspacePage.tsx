// Copie Zentrix Academy : src/pages/AIWorkspacePage.tsx
import { useState } from "react";
import { ArrowRight, Bell, BookOpen, Brain, Check, ChevronDown, Code2, Database, FileText, Folder, Grid2X2, History, Lightbulb, Menu, MessageSquare, Search, Send, Settings, Sparkles, Sun, UserRound, X } from "lucide-react";
import { apiAIChatStream } from "@/lib/api-client";

type Message = { role: "user" | "assistant"; content: string };

const navItems = [
  { label: "Nouvelle conversation", icon: MessageIcon },
  { label: "Historique", icon: HistoryIcon },
  { label: "Mes fichiers", icon: FileText },
  { label: "Mes projets", icon: FolderIcon },
  { label: "Mémoire", icon: DatabaseIcon },
  { label: "Outils & Plugins", icon: GridIcon },
  { label: "Paramètres", icon: Settings },
];

function MessageIcon({ className = "" }: { className?: string }) { return <span className={className}><MessageSquare className="h-5 w-5" /></span>; }
function HistoryIcon({ className = "" }: { className?: string }) { return <span className={className}><History className="h-5 w-5" /></span>; }
function FolderIcon({ className = "" }: { className?: string }) { return <span className={className}><Folder className="h-5 w-5" /></span>; }
function DatabaseIcon({ className = "" }: { className?: string }) { return <span className={className}><Database className="h-5 w-5" /></span>; }
function GridIcon({ className = "" }: { className?: string }) { return <span className={className}><Grid2X2 className="h-5 w-5" /></span>; }

const modes = [
  { label: "Réfléchir", detail: "Analyse approfondie", icon: Brain },
  { label: "Normal", detail: "Réponse rapide", icon: Sparkles },
];

const actionCards = [
  { title: "Apprendre", body: "Cours, leçons et exercices", icon: BookOpen, tone: "bg-blue-50 text-blue-600" },
  { title: "Créer", body: "Code, projets et outils", icon: Code2, tone: "bg-emerald-50 text-emerald-600" },
  { title: "Rechercher", body: "Cours et ressources Zentrix", icon: Search, tone: "bg-indigo-50 text-indigo-600" },
  { title: "Résoudre", body: "Solutions et conseils", icon: Lightbulb, tone: "bg-amber-50 text-amber-600" },
];

const examples = [
  "Explique-moi la différence entre TCP et UDP",
  "Comment configurer un routeur Cisco ?",
  "Aide-moi à résoudre cette erreur de code",
  "Quelles sont les meilleures ressources pour apprendre Python ?",
  "Donne-moi un plan d’étude pour le développement web",
  "Fais-moi un résumé de ce document",
];

export default function AIWorkspacePage() {
  const [drawer, setDrawer] = useState(false);
  const [mode, setMode] = useState(1);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);

  const send = async (value = input) => {
    const text = value.trim();
    if (!text || sending) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }, { role: "assistant" as const, content: "" }];
    setMessages(next);
    setSending(true);
    let answer = "";
    try {
      for await (const delta of apiAIChatStream(text, { mode: "assistant", longThinking: mode === 0, history: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })) })) {
        answer += delta;
        setMessages((current) => current.map((m, i) => i === current.length - 1 ? { ...m, content: answer } : m));
      }
    } catch {
      setMessages((current) => current.map((m, i) => i === current.length - 1 ? { ...m, content: "Une erreur est survenue. Réessayez." } : m));
    } finally { setSending(false); }
  };

  return <div className="flex h-full min-h-0 overflow-hidden bg-white text-slate-900">
    <div className={`fixed inset-0 z-40 bg-slate-950/25 transition-opacity lg:hidden ${drawer ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setDrawer(false)} />
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[300px] -translate-x-full flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none ${drawer ? "translate-x-0" : ""}`}>
      <div className="flex items-center gap-3 px-2"><img src="/ai_icon.jpg" alt="TESS AI" className="h-10 w-10 rounded-xl object-cover" /><div><p className="text-lg font-bold">TESS AI</p><p className="text-[11px] text-blue-500">Votre assistant intelligent</p></div><button className="ml-auto lg:hidden" onClick={() => setDrawer(false)}><X className="h-5 w-5" /></button></div>
      <nav className="mt-8 space-y-1">{navItems.map(({ label, icon: Icon }, i) => <button key={label} onClick={() => i === 0 && setMessages([])} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${i === 0 ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}><Icon className="h-5 w-5" />{label}</button>)}</nav>
      <div className="my-5 border-t border-slate-100" /><p className="px-3 text-xs font-semibold text-slate-500">Modes d’IA</p>
      <div className="mt-2 space-y-1">{modes.map(({ label, detail, icon: Icon }, i) => <button key={label} onClick={() => setMode(i)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${mode === i ? "bg-blue-50" : "hover:bg-slate-50"}`}><Icon className={`h-5 w-5 ${mode === i ? "text-blue-600" : "text-slate-500"}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block text-[11px] text-slate-400">{detail}</span></span>{mode === i && <Check className="h-4 w-4 text-blue-600" />}</button>)}</div>
      <div className="mt-auto space-y-4"><div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-semibold text-slate-700">Informations</p><p className="mt-2 text-[11px] text-slate-500"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />TESS AI v1.0.0</p><p className="mt-1 text-[10px] text-slate-400">Propulsé par Cerebras · Groq · OpenRouter</p></div><div className="relative overflow-hidden rounded-2xl bg-slate-900 p-4 text-white"><img src="/dashboard-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /><p className="relative max-w-[150px] text-sm font-semibold leading-6">Chaque question est une étape vers votre réussite.</p><ArrowRight className="relative mt-3 h-4 w-4" /></div><div className="flex items-center gap-3 px-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white"><UserRound className="h-4 w-4" /></div><div><p className="text-xs font-semibold">Believer</p><p className="text-[10px] text-emerald-500">● En ligne</p></div><ChevronDown className="ml-auto h-4 w-4 text-slate-400" /></div></div>
    </aside>
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-slate-100 px-4 sm:px-8"><button className="rounded-xl border border-slate-200 p-2 lg:hidden" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></button><div className="flex items-center gap-2 lg:hidden"><img src="/ai_icon.jpg" alt="TESS AI" className="h-8 w-8 rounded-lg object-cover" /><div><p className="text-sm font-bold">TESS AI</p><p className="text-[9px] text-blue-500">Votre assistant intelligent</p></div></div><div className="mx-auto hidden h-10 max-w-2xl flex-1 items-center gap-3 rounded-full border border-slate-200 px-4 text-xs text-slate-400 md:flex"><Search className="h-4 w-4" />Rechercher une conversation, un sujet, une ressource…<span className="ml-auto rounded-md bg-slate-50 px-2 py-1 text-[10px]">Ctrl + K</span></div><div className="ml-auto flex items-center gap-3 text-slate-500"><Search className="h-5 w-5 md:hidden" /><button type="button" aria-label="Notifications" className="relative hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-50 md:flex"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" /></button><button type="button" aria-label="Changer de thème" className="hidden h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-base transition hover:bg-slate-100 md:flex"><Sun className="h-4 w-4" /></button><button type="button" aria-label="Ouvrir le profil" className="hidden items-center gap-2 rounded-full px-1.5 py-1 transition hover:bg-slate-50 sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">B</span><span className="hidden text-left lg:block"><span className="block text-xs font-semibold text-slate-800">Believer</span><span className="block text-[10px] text-emerald-500">● En ligne</span></span><ChevronDown className="hidden h-3.5 w-3.5 lg:block" /></button></div></header>
      <div className="min-h-0 flex-1 overflow-y-auto"><section className="mx-auto w-full max-w-[1100px] px-5 pb-32 pt-12 sm:px-8 sm:pt-16">{messages.length === 0 ? <><div className="mx-auto max-w-2xl text-center"><img src="/ai_icon.jpg" alt="TESS AI" className="mx-auto h-20 w-20 rounded-3xl object-cover shadow-lg shadow-blue-200" /><h1 className="mt-7 text-3xl font-bold tracking-tight sm:text-4xl">Bonjour Believer 👋</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Je suis <b className="text-slate-700">TESS</b>, votre assistant IA. Posez-moi vos questions, je suis là pour vous aider à apprendre, comprendre, résoudre et progresser.</p></div><div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">{actionCards.map(({ title, body, icon: Icon, tone }) => <button key={title} onClick={() => setInput(title)} className="rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-4 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{body}</p></button>)}</div><div className="mt-10"><h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-blue-600" />Exemples de questions</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{examples.map((example) => <button key={example} onClick={() => send(example)} className="flex items-center justify-between rounded-full border border-blue-100 bg-blue-50/40 px-4 py-2.5 text-left text-xs text-blue-700 transition hover:bg-blue-50"><span>{example}</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /></button>)}</div></div></> : <div className="mx-auto max-w-3xl space-y-4">{messages.map((message, i) => <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{message.content || "TESS réfléchit…"}</div></div>)}</div>}</section></div>
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:px-8"><div className="mx-auto max-w-[1060px]"><div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-lg shadow-blue-100/40"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} placeholder="Posez n’importe quelle question…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-blue-300" /><button onClick={() => void send()} disabled={!input.trim() || sending} className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div><p className="mt-2 text-center text-[10px] text-slate-400">Entrée pour envoyer · Activez « Réfléchir » pour une analyse plus approfondie.</p></div></div>
    </main>
  </div>;
}
