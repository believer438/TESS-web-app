// TESS AI chat surface.
import { useRef, useEffect, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode, TouchEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import HoverTooltip from "@/components/ui/hover-tooltip";
import {
  X, Sparkles, Bot, Plus, SquarePen, FileSearch, Brain, Menu, Phone, Loader2, MessageSquare, BookOpen, Pin, MoreHorizontal,
  ArrowUp, ArrowDown, Square, Copy, Pencil, RotateCcw, BrainCircuit, Image as ImageIcon, Check,
  Mic, Pause, Play, AudioLines, Share2, Volume2, BookOpenText, Search,
  History, FolderOpen, Database, Wrench, Settings, Moon, Sun, Monitor, Globe2, PanelLeft, Clock3, UserRound, LogIn,
  Activity, ListTodo, Bell, ShieldCheck, ChevronRight, CircleHelp, LogOut, Gift, ThumbsUp, ThumbsDown, Store, PlugZap, MapPin, LockKeyhole,
} from "lucide-react";
import { type AIActivitySource, type AIActivityStep, type AIMessage } from "@/lib/backend-types";
import {
  apiAIChatStream,
  apiGetMe,
  apiErrorMessage,
  isAuthenticated,
  apiAIVoiceTranscribe,
  apiAIVoiceSynthesizeStream,
  apiTessListAgents,
  apiTessListTools,
  apiGetConversations,
  apiGetConversationMessages,
  clearAuth,
  type AIConversation as StoredAIConversation,
  type LearningProfile, type UserProfile,
} from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/hooks/useTheme";
import { getPageContext, type PageContextData } from "@/hooks/usePageContext";
import AIMarkdown from "@/components/ai/AIMarkdown";
import AIActivity from "@/components/ai/AIActivity";
import AttachmentCard from "@/components/ai/AttachmentCard";
import ComposerPlusMenu from "@/components/ai/ComposerPlusMenu";
import VoiceAIOrb, { type VoiceOrbState } from "@/components/ai/VoiceAIOrb";
import MobileAssistantShell from "@/components/ai/MobileAssistantShell";
import MessageAudioPlayer, { type MessageAudioPlayerState } from "@/components/ai/MessageAudioPlayer";
import AuthRequiredDialog from "@/components/auth/AuthRequiredDialog";
import AIComposer, { type ComposerMode, type ComposerResource } from "@/components/ai/AIComposer";
import { tessSubmitFeedback } from "@/lib/tess-client";

type SpeechRecognitionResultEvent = Event & {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
};
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type AIMode = "assistant" | "document" | "course";

interface AIPanelChatProps {
  isOpen:            boolean;
  onClose:           () => void;
  contextCourse?:    string;
  contextCoursId?:   number;
  contextCourseId?:  number;
  contextChapterId?: number;
  mode?:             AIMode;
  push?:             boolean;
  isExpanded?:       boolean;
  /** Keep the TESS navigation visible as a desktop workspace sidebar. */
  desktopWorkspace?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  initialConversationId?: string | null;
  routeConversations?: boolean;
  conversationRouteBase?: string;
  conversationRouteState?: unknown;
  openChatToken?: number;
  showClose?: boolean;
}

const MODE_CONFIG: Record<AIMode, {
  title:       string;
  icon:        typeof Bot;
  color:       string;
  placeholder: string;
}> = {
  assistant: {
    title:       "TESS",
    icon:        Bot,
    color:       "from-cyan-400 to-teal-500",
    placeholder: "Posez n'importe quelle question…",
  },
  document: {
    title:       "Analyse de document",
    icon:        FileSearch,
    color:       "from-sky-400 to-cyan-600",
    placeholder: "Posez une question sur le document…",
  },
  course: {
    title:       "TESS AI · Tuteur du cours",
    icon:        Brain,
    color:       "from-teal-400 to-emerald-600",
    placeholder: "Posez une question sur ce cours…",
  },
};

const STARTER_PROMPT_POOL = [
  { icon: ListTodo, text: "Aide-moi à organiser mes priorités de la semaine", color: "text-indigo-500 dark:text-indigo-300" },
  { icon: BookOpenText, text: "Explique-moi simplement une notion difficile", color: "text-cyan-600 dark:text-cyan-300" },
  { icon: FileSearch, text: "Résume un document et relève les points essentiels", color: "text-emerald-600 dark:text-emerald-300" },
  { icon: Search, text: "Aide-moi à comparer deux options avant de choisir", color: "text-blue-600 dark:text-blue-300" },
  { icon: BrainCircuit, text: "Décompose ce problème en étapes faciles", color: "text-violet-600 dark:text-violet-300" },
  { icon: Clock3, text: "Prépare un planning réaliste pour ma journée", color: "text-amber-600 dark:text-amber-300" },
  { icon: Sparkles, text: "Aide-moi à trouver une idée originale pour ce projet", color: "text-fuchsia-600 dark:text-fuchsia-300" },
  { icon: MessageSquare, text: "Rédige une réponse claire et professionnelle", color: "text-sky-600 dark:text-sky-300" },
  { icon: ListTodo, text: "Transforme cette idée en plan d’action concret", color: "text-teal-600 dark:text-teal-300" },
  { icon: BookOpen, text: "Crée une fiche de révision sur ce sujet", color: "text-rose-600 dark:text-rose-300" },
  { icon: FileSearch, text: "Repère les informations importantes dans ce texte", color: "text-green-600 dark:text-green-300" },
  { icon: Brain, text: "Quels sont les avantages et les risques de cette décision ?", color: "text-purple-600 dark:text-purple-300" },
  { icon: Search, text: "Explique les différences entre ces deux concepts", color: "text-cyan-600 dark:text-cyan-300" },
  { icon: ListTodo, text: "Aide-moi à préparer une réunion efficace", color: "text-orange-600 dark:text-orange-300" },
  { icon: Sparkles, text: "Améliore ce texte sans changer mon intention", color: "text-pink-600 dark:text-pink-300" },
  { icon: BookOpenText, text: "Donne-moi un exemple concret pour comprendre", color: "text-blue-600 dark:text-blue-300" },
  { icon: Clock3, text: "Aide-moi à découper ce travail en petites tâches", color: "text-lime-600 dark:text-lime-300" },
  { icon: FileSearch, text: "Fais ressortir les décisions et actions de ces notes", color: "text-emerald-600 dark:text-emerald-300" },
  { icon: BrainCircuit, text: "Vérifie mon raisonnement et signale les oublis", color: "text-violet-600 dark:text-violet-300" },
  { icon: MessageSquare, text: "Reformule ce message avec un ton plus chaleureux", color: "text-sky-600 dark:text-sky-300" },
  { icon: Search, text: "Propose des questions utiles à poser sur ce sujet", color: "text-indigo-600 dark:text-indigo-300" },
  { icon: BookOpen, text: "Prépare un quiz pour tester mes connaissances", color: "text-rose-600 dark:text-rose-300" },
  { icon: ListTodo, text: "Aide-moi à définir un objectif atteignable", color: "text-teal-600 dark:text-teal-300" },
  { icon: Sparkles, text: "Trouve un titre accrocheur pour cette présentation", color: "text-amber-600 dark:text-amber-300" },
  { icon: FileSearch, text: "Résume ce contenu en trois idées principales", color: "text-green-600 dark:text-green-300" },
  { icon: Brain, text: "Présente ce sujet comme si je débutais", color: "text-purple-600 dark:text-purple-300" },
  { icon: Clock3, text: "Aide-moi à choisir quoi faire en premier", color: "text-orange-600 dark:text-orange-300" },
  { icon: MessageSquare, text: "Rends cette explication plus courte et plus claire", color: "text-blue-600 dark:text-blue-300" },
  { icon: BrainCircuit, text: "Construis un argumentaire équilibré sur cette question", color: "text-fuchsia-600 dark:text-fuchsia-300" },
  { icon: BookOpenText, text: "Relie ces notions avec une explication simple", color: "text-cyan-600 dark:text-cyan-300" },
];

function pickStarterPrompts() {
  const shuffled = [...STARTER_PROMPT_POOL].sort(() => Math.random() - 0.5);
  const count = 2 + Math.floor(Math.random() * 3);
  return shuffled.slice(0, count);
}

// ── Attached file ─────────────────────────────────────────────────────────────
interface AttachedFile {
  file:      File;
  type:      "image" | "pdf";
  preview?:  string;
  base64?:   string;
  mimeType?: string;
}

// ── Message bubble ────────────────────────────────────────────────────────────
type MessageActivity = { steps: AIActivityStep[]; sources: AIActivitySource[] };
type MessageAttachment = { name: string; type: "image" | "pdf"; size: number };
type MessageAudioAttachment = { url: string; durationMs: number; transcript: string };
type MessageAudioChunk = { url: string; audio: HTMLAudioElement; start: number; duration: number };

function cleanVoiceTurnText(value: string): string {
  const original = value.replace(/\s+/g, " ").trim();
  if (!original) return "";
  const cleaned = original
    .replace(/\b(euh+|heu+|hm+|ah+|ben+|bah+)\b/gi, " ")
    .replace(/\b(\w{2,})(?:\s+\1)+\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || original;
}

function conversationLabel(value?: string | null): string {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "Nouvelle conversation";
  if (clean.length <= 64) return clean;
  const shortened = clean.slice(0, 61);
  const boundary = shortened.lastIndexOf(" ");
  return `${(boundary > 36 ? shortened.slice(0, boundary) : shortened).replace(/[.,:;!?—-]+$/, "")}…`;
}

function formatAudioDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function MsgBubble({ msg, isStreaming, longThinking, isEdited, activity, attachment, audioAttachment, feedbackRating, onCopy, onRetry, onEdit, onSpeak, onShare, onFeedback }: {
  msg: AIMessage; isStreaming?: boolean; longThinking?: boolean; isEdited?: boolean;
  activity?: MessageActivity;
  attachment?: MessageAttachment;
  audioAttachment?: MessageAudioAttachment;
  feedbackRating?: number;
  onCopy: (content: string) => void; onRetry: () => void; onEdit: () => void;
  onSpeak: (content: string, messageId: string) => void; onShare: (content: string) => void;
  onFeedback: (rating: number) => void;
}) {
  const isUser = msg.role === "user";
  const showThinking = !isUser && isStreaming && !msg.content;
  const [mobileMenu, setMobileMenu] = useState<{ x: number; y: number } | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const clearPress = () => { if (pressTimer.current !== null) window.clearTimeout(pressTimer.current); pressTimer.current = null; };
  const beginLongPress = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    clearPress();
    pressTimer.current = window.setTimeout(() => {
      const x = Math.min(Math.max(12, touch.clientX), window.innerWidth - 224);
      const y = Math.min(Math.max(12, touch.clientY), window.innerHeight - 210);
      setMobileMenu({ x, y });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
    }, 480);
  };
  const moveLongPress = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current || event.touches.length !== 1) return clearPress();
    const touch = event.touches[0];
    if (Math.hypot(touch.clientX - touchStart.current.x, touch.clientY - touchStart.current.y) > 12) clearPress();
  };
  useEffect(() => () => clearPress(), []);
  const actionButton = (label: string, Icon: typeof Copy, action: () => void) => (
    <button type="button" onClick={action} title={label} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"><Icon className="h-4 w-4" /></button>
  );
  const dismissAnd = (action: () => void) => { action(); setMobileMenu(null); };

  if (showThinking) {
    return <div className="mx-auto flex w-full max-w-[760px] flex-col items-start py-1 pl-1">
      {activity && <AIActivity
        steps={activity.steps}
        sources={activity.sources}
        running
        longThinking={longThinking}
        expanded={sourcesExpanded}
        onExpandedChange={setSourcesExpanded}
      />}
    </div>;
  }

  return (
    <div className={`group mx-auto flex w-full max-w-[760px] flex-col ${isUser ? "items-end" : "items-start"}`} onTouchStart={isUser ? beginLongPress : undefined} onTouchMove={isUser ? moveLongPress : undefined} onTouchEnd={isUser ? clearPress : undefined} onTouchCancel={isUser ? clearPress : undefined} onContextMenu={event => {
      if (isUser && window.matchMedia("(max-width: 767px)").matches) {
        event.preventDefault();
        clearPress();
        setMobileMenu({ x: Math.min(Math.max(12, event.clientX), window.innerWidth - 224), y: Math.min(Math.max(12, event.clientY), window.innerHeight - 210) });
      }
    }}>
      {!isUser && activity && <AIActivity steps={activity.steps} sources={activity.sources} running={Boolean(isStreaming)} longThinking={longThinking} hasAnswer={Boolean(msg.content)} expanded={sourcesExpanded} onExpandedChange={setSourcesExpanded} />}
      <div className={isUser
        ? "max-w-[min(82%,36rem)] rounded-2xl rounded-br-sm border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-700 px-3.5 py-2.5 text-[14px] leading-[1.55] text-white whitespace-pre-wrap dark:border-blue-400/30 dark:bg-gradient-to-br dark:from-blue-600 dark:to-blue-700"
        : "w-full max-w-none px-0 py-0.5 text-[14px] leading-[1.55] text-slate-800 dark:text-slate-100"}>
        {isUser ? <>{msg.content}</> : <AIMarkdown content={msg.content} isStreaming={Boolean(isStreaming)} />}
      </div>
      {isUser && attachment && (
        <div className="mt-1.5 flex max-w-[min(88%,24rem)] min-w-0 items-center gap-2.5 rounded-xl border border-slate-700 bg-[#121a24] px-2.5 py-2 text-slate-200">
          {attachment.type === "image" ? <ImageIcon className="h-4 w-4 shrink-0 text-violet-300" /> : <FileSearch className="h-4 w-4 shrink-0 text-cyan-300" />}
          <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{attachment.name}</span><span className="block text-[10px] text-slate-500">{attachment.type === "pdf" ? "PDF" : "Image"} · {Math.max(1, Math.round(attachment.size / 1024))} Ko · envoyé</span></span>
        </div>
      )}
      {isUser && audioAttachment && (
        <div className="mt-1.5 w-[min(88%,26rem)] rounded-xl border border-slate-700 bg-[#121a24] px-3 py-2.5 text-slate-200">
          <div className="flex items-center gap-2"><AudioLines className="h-4 w-4 shrink-0 text-slate-200" /><span className="text-[11px] font-medium">Message audio</span><span className="ml-auto text-[10px] text-slate-400">{formatAudioDuration(audioAttachment.durationMs)}</span></div>
          <audio className="mt-2 h-8 w-full" controls preload="metadata" src={audioAttachment.url} aria-label="Lire le message audio" />
          <div className="mt-2 border-t border-white/10 pt-2"><p className={`text-[11px] leading-5 text-slate-300 ${transcriptExpanded ? "" : "line-clamp-2"}`}>{audioAttachment.transcript}</p><button type="button" onClick={() => setTranscriptExpanded(value => !value)} className="mt-1 text-[10px] font-semibold text-slate-200 underline underline-offset-2">{transcriptExpanded ? "Afficher moins" : "Afficher plus"}</button></div>
        </div>
      )}
      {!isStreaming && msg.content && (
        <div className="mt-1 flex min-h-8 items-center gap-0.5 opacity-100 transition-opacity">
          {isEdited && <span className="mr-1 text-[10px] text-slate-400">Modifié</span>}
          <div className={`${isUser ? "hidden md:flex md:pointer-events-none md:opacity-0 md:transition-opacity md:group-hover:pointer-events-auto md:group-hover:opacity-100" : "flex"} items-center gap-0.5`}>
            {actionButton("Copier", Copy, () => onCopy(msg.content))}
            {isUser ? actionButton("Modifier", Pencil, onEdit) : <>
              {activity?.sources.length ? actionButton(sourcesExpanded ? "Masquer les sources" : "Afficher les sources", BookOpenText, () => setSourcesExpanded(value => !value)) : null}
              {actionButton("Lire à voix haute", Volume2, () => onSpeak(msg.content, msg.id))}
              {actionButton("Partager", Share2, () => onShare(msg.content))}
              {actionButton("Régénérer la réponse", RotateCcw, onRetry)}
              {actionButton(feedbackRating === 5 ? "Avis envoyé : utile" : "Réponse utile", ThumbsUp, () => onFeedback(5))}
              {actionButton(feedbackRating === 1 ? "Avis envoyé : incorrecte" : "Réponse incorrecte", ThumbsDown, () => onFeedback(1))}
            </>}
          </div>
          {isUser && mobileMenu && createPortal(<>
            <button type="button" className="fixed inset-0 z-[100] cursor-default" aria-label="Fermer le menu des actions" onClick={() => setMobileMenu(null)} />
            <div role="menu" aria-label="Actions du message" className="fixed z-[101] w-52 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl shadow-slate-950/20 dark:border-slate-700 dark:bg-[#151c28] dark:text-slate-100" style={{ left: mobileMenu.x, top: mobileMenu.y }}>
              <button role="menuitem" type="button" onClick={() => dismissAnd(() => onCopy(msg.content))} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Copy className="h-4 w-4" />Copier le message</button>
              {isUser ? <button role="menuitem" type="button" onClick={() => dismissAnd(onEdit)} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Pencil className="h-4 w-4" />Modifier le message</button> : <>
                {activity?.sources.length ? <button role="menuitem" type="button" onClick={() => dismissAnd(() => setSourcesExpanded(true))} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><BookOpenText className="h-4 w-4" />Afficher les sources</button> : null}
                <button role="menuitem" type="button" onClick={() => dismissAnd(() => onSpeak(msg.content, msg.id))} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Volume2 className="h-4 w-4" />Lire à voix haute</button>
                <button role="menuitem" type="button" onClick={() => dismissAnd(() => onShare(msg.content))} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Share2 className="h-4 w-4" />Partager</button>
                <button role="menuitem" type="button" onClick={() => dismissAnd(onRetry)} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><RotateCcw className="h-4 w-4" />Régénérer la réponse</button>
                <button role="menuitem" type="button" onClick={() => dismissAnd(() => onFeedback(5))} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><ThumbsUp className="h-4 w-4" />Réponse utile</button>
                <button role="menuitem" type="button" onClick={() => dismissAnd(() => onFeedback(1))} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><ThumbsDown className="h-4 w-4" />Réponse incorrecte</button>
              </>}
            </div>
          </>, document.body)}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
function CollapsedNavTooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="group/sidebar-tooltip relative inline-flex">
    {children}
    <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-[100] ml-2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover/sidebar-tooltip:translate-x-0 group-hover/sidebar-tooltip:opacity-100 group-focus-within/sidebar-tooltip:translate-x-0 group-focus-within/sidebar-tooltip:opacity-100 dark:bg-slate-100 dark:text-slate-900">{label}</span>
  </span>;
}

export default function AIPanelChat({
  isOpen,
  onClose,
  contextCourse,
  contextCoursId,
  contextCourseId,
  contextChapterId,
  mode  = "assistant",
  push  = false,
  isExpanded = false,
  desktopWorkspace = false,
  onExpandedChange,
  initialConversationId = null,
  routeConversations = false,
  conversationRouteBase = "/dashboard",
  conversationRouteState,
  openChatToken = 0,
  showClose = true,
}: AIPanelChatProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const wasPanelOpenRef = useRef(isOpen);
  const [messages,        setMessages]        = useState<AIMessage[]>([]);
  const [input,           setInput]           = useState("");
  const [dismissedStarterPrompts, setDismissedStarterPrompts] = useState<string[]>([]);
  const [starterPrompts, setStarterPrompts] = useState(pickStarterPrompts);
  const [newChatNotice, setNewChatNotice] = useState(false);
  const [newChatNoticePosition, setNewChatNoticePosition] = useState<{ top: number; left: number } | null>(null);
  const newChatNoticeTimerRef = useRef<number | null>(null);
  const newChatButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => {
    if (newChatNoticeTimerRef.current !== null) window.clearTimeout(newChatNoticeTimerRef.current);
  }, []);
  const [isStreaming,     setIsStreaming]      = useState(false);
  const [activityByMessage, setActivityByMessage] = useState<Record<string, MessageActivity>>({});
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, number>>({});
  const [longThinkingByMessage, setLongThinkingByMessage] = useState<Record<string, boolean>>({});
  const [attachmentByMessage, setAttachmentByMessage] = useState<Record<string, MessageAttachment>>({});
  const [audioByMessage, setAudioByMessage] = useState<Record<string, MessageAudioAttachment>>({});
  const [longThinking,    setLongThinking]    = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [analysisScope,   setAnalysisScope]   = useState<"section" | "course">("section");
  const [streamingId,     setStreamingId]     = useState<string | null>(null);
  const [conversationId,  setConversationId]  = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("");
  const [attachedFile,    setAttachedFile]    = useState<AttachedFile | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessageIds, setEditedMessageIds] = useState<Set<string>>(() => new Set());
  const [livePageContext, setLivePageContext] = useState<PageContextData | null>(() => getPageContext());
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [assistantUser, setAssistantUser] = useState<UserProfile | null>(null);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number>(() => typeof window === "undefined" ? 0 : window.innerHeight);
  const expanded = push ? isExpanded : false;
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceOrbState>("idle");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceResponseText, setVoiceResponseText] = useState("");
  const [showVoiceTranscript, setShowVoiceTranscript] = useState(false);
  const [showStreamJump, setShowStreamJump] = useState(false);
  const [voiceTask, setVoiceTask] = useState<"greeting" | "connecting" | "transcribing" | "thinking" | null>(null);
  const [voiceName, setVoiceName] = useState<"fr-CH-ArianeNeural" | "fr-CH-FabriceNeural">(() => {
    try { return localStorage.getItem("tess-ai-voice") === "fr-CH-FabriceNeural" ? "fr-CH-FabriceNeural" : "fr-CH-ArianeNeural"; } catch { return "fr-CH-ArianeNeural"; }
  });
  const [voicePaused, setVoicePaused] = useState(false);
  const [messageAudio, setMessageAudio] = useState<MessageAudioPlayerState>({
    visible: false, title: "", isPlaying: false, isLoading: false, isStreaming: false,
    currentTime: 0, totalDuration: 0, generatedChunks: 0, totalChunks: null, waveform: [], error: "",
  });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [workspaceHubOpen, setWorkspaceHubOpen] = useState(false);
  const [workspaceHubPosition, setWorkspaceHubPosition] = useState<{ top: number; right: number; shift: number; collapsedWidth: number } | null>(null);
  const workspaceHubRef = useRef<HTMLDivElement>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [appearancePanelOpen, setAppearancePanelOpen] = useState(false);
  const [languagePanelOpen, setLanguagePanelOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageSettingsOpen, setLanguageSettingsOpenState] = useState(false);
  const setLanguageSettingsOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const isOpen = typeof next === "function" ? next(languageSettingsOpen) : next;
    setLanguageSettingsOpenState(isOpen);
    setLanguagePanelOpen(isOpen);
    if (isOpen) {
      setAppearanceOpenState(false);
      setAppearancePanelOpen(false);
    }
  };
  const [appearanceOpen, setAppearanceOpenState] = useState(false);
  const setAppearanceOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const isOpen = typeof next === "function" ? next(appearanceOpen) : next;
    setAppearanceOpenState(isOpen);
    setAppearancePanelOpen(isOpen);
    if (isOpen) {
      setLanguageSettingsOpenState(false);
      setLanguagePanelOpen(false);
    }
  };
  const [languageSearch, setLanguageSearch] = useState("");
  const [composerMode, setComposerMode] = useState<ComposerMode>("normal");
  const [alertMode, setAlertMode] = useState(false);
  const [composerResources, setComposerResources] = useState<ComposerResource[]>([]);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const [desktopNavClosing, setDesktopNavClosing] = useState(false);
  const desktopNavOpenRef = useRef(desktopNavOpen);
  useEffect(() => { desktopNavOpenRef.current = desktopNavOpen; }, [desktopNavOpen]);
  const [authRequiredRoute, setAuthRequiredRoute] = useState<string | null>(null);
  const [conversations, setConversations] = useState<StoredAIConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StoredAIConversation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const optionsPanelRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const composerAudioUrlsRef = useRef<string[]>([]);

  useEffect(() => () => {
    composerAudioUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!isOpen || !isAuthenticated()) return;
    let active = true;
    void apiGetMe().then((profile) => {
      if (active) {
        setAssistantUser(profile);
        setLearningProfile(profile.learning_profile ?? null);
      }
    }).catch(() => {
      // The chat remains usable when the profile endpoint is temporarily unavailable.
    });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void Promise.allSettled([apiTessListAgents(), apiTessListTools()]).then(([agentsResult, toolsResult]) => {
      if (!active) return;
      const isEducationCapability = (value: string) => /education|university|school|student|academic|course|cours|quiz|learning|étud/i.test(value);
      const agents = agentsResult.status === "fulfilled" ? agentsResult.value
        .filter(agent => !isEducationCapability(`${agent.id} ${agent.name} ${agent.description}`))
        .map(agent => ({ id: agent.id, label: agent.name, description: agent.description })) : [];
      const tools = toolsResult.status === "fulfilled" ? toolsResult.value.map(tool => ({ id: tool.tool_id, label: tool.name, description: tool.description })) : [];
      setComposerResources([...agents, ...tools].slice(0, 16));
    });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!optionsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !optionsPanelRef.current?.contains(event.target)) setOptionsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOptionsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [optionsOpen]);

  useEffect(() => {
    if (!workspaceHubOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !workspaceHubRef.current?.contains(event.target)) setWorkspaceHubOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWorkspaceHubOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [workspaceHubOpen]);

  useEffect(() => {
    if (workspaceHubOpen || !workspaceHubPosition) return;
    const timeout = window.setTimeout(() => setWorkspaceHubPosition(null), 320);
    return () => window.clearTimeout(timeout);
  }, [workspaceHubOpen, workspaceHubPosition]);

  useEffect(() => {
    if (!searchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchPanelRef.current?.contains(event.target)) setSearchOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!isAuthenticated()) requireAuth("/");
        else setSearchOpen(true);
        setOptionsOpen(false);
        setSearchError("");
      }
    };
    document.addEventListener("keydown", onGlobalKeyDown);
    return () => document.removeEventListener("keydown", onGlobalKeyDown);
  }, [navigate]);

  // ── Document context from current page (DocumentAIPage) ──────────────────
  const [pageDocCtx, setPageDocCtx] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const ctx = getPageContext();
    const docId = ctx?.page_data?.document_id;
    const docView = ctx?.page_data?.view as string | undefined;
    if (
      ctx?.current_page === "document-ai" &&
      typeof docId === "number" &&
      (docView === "results" || docView === "saved")
    ) {
      setPageDocCtx({
        id:    docId,
        title: (ctx.page_data.document_title as string | null) || `Document #${docId}`,
      });
    } else {
      setPageDocCtx(null);
    }
  }, [isOpen]);

  // Page metadata is tiny and updates the header immediately. Full data is
  // still fetched by the backend only if the message actually needs it.
  useEffect(() => {
    const sync = (event?: Event) => {
      const ctx = (event as CustomEvent<PageContextData | null> | undefined)?.detail ?? getPageContext();
      setLivePageContext(ctx);
      const docId = ctx?.page_data?.document_id;
      const view = ctx?.page_data?.view;
      setPageDocCtx(ctx?.current_page === "document-ai" && typeof docId === "number" && (view === "results" || view === "saved")
        ? { id: docId, title: String(ctx.page_data?.document_title ?? `Document #${docId}`) }
        : null);
    };
    sync();
    window.addEventListener("tess-ai-page-context", sync);
    return () => window.removeEventListener("tess-ai-page-context", sync);
  }, []);

  // On mobile browsers the layout viewport can stay behind the keyboard.
  // Using visualViewport keeps the input above it while the header remains at
  // the top of the assistant instead of scrolling away with the message list.
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const viewport = window.visualViewport;
    const sync = () => setVisualViewportHeight(Math.round(viewport?.height ?? window.innerHeight));
    sync();
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [isOpen]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sendLockRef = useRef(false);
  const botIdRef           = useRef<string | null>(null);
  const messagesEndRef     = useRef<HTMLDivElement>(null);
  const messagesScrollRef  = useRef<HTMLDivElement>(null);
  const followStreamRef = useRef(true);
  const inputRef           = useRef<HTMLTextAreaElement>(null);
  const imageInputRef      = useRef<HTMLInputElement>(null);
  const documentInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef     = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const dictationActiveRef = useRef(false);
  const dictationBaseInputRef = useRef("");
  const dictationTranscriptRef = useRef("");
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const voiceReplyRef = useRef(false);
  const activeVoiceReplyRef = useRef(false);
  const voiceSynthesisFailedRef = useRef(false);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const voiceAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceAnimationRef = useRef<number | null>(null);
  const stopVoiceRef = useRef(false);
  const voiceTtsControllerRef = useRef<AbortController | null>(null);
  const voiceTranscribeControllerRef = useRef<AbortController | null>(null);
  const voiceVadFrameRef = useRef<number | null>(null);
  const voiceSpeechDetectedRef = useRef(false);
  const voiceLastSpeechAtRef = useRef(0);
  const voiceRecordingStartedAtRef = useRef(0);
  const voiceNoiseFloorRef = useRef(0.012);
  const voiceTurnActiveRef = useRef(false);
  const voiceTurnTextRef = useRef("");
  const voiceTurnTimerRef = useRef<number | null>(null);
  const voiceRecognitionStarterRef = useRef<() => void>(() => undefined);
  const sendVoiceTextRef = useRef<(text: string) => void>(() => undefined);
  const speakReplyRef = useRef<(reply: string, signal?: AbortSignal) => Promise<void>>(async () => undefined);
  const startVoiceRecordingRef = useRef<() => Promise<void>>(async () => undefined);
  const messageAudioAbortRef = useRef<AbortController | null>(null);
  const messageAudioChunksRef = useRef<MessageAudioChunk[]>([]);
  const messageAudioCurrentRef = useRef<HTMLAudioElement | null>(null);
  const messageAudioWantedRef = useRef(false);
  const messageAudioFrameRef = useRef<number | null>(null);
  const prevModeRef        = useRef<AIMode>(mode);
  // A chapter change updates the tutor context, but it is still the same course
  // conversation. Keep the visible thread and send the new chapter context only
  // with subsequent messages.
  const pageScope = `${livePageContext?.current_page ?? ""}:${String(livePageContext?.page_data?.course_id ?? "")}:${String(livePageContext?.page_data?.document_id ?? "")}`;
  const previousPageScopeRef = useRef(pageScope);

  useEffect(() => {
    const key = `tess-composer-draft:${conversationId ?? "new"}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved && !input.trim()) setInput(saved);
    } catch { /* draft persistence is best effort */ }
  }, [conversationId]);

  useEffect(() => {
    const key = `tess-composer-draft:${conversationId ?? "new"}`;
    const timer = window.setTimeout(() => {
      try {
        if (input.trim()) localStorage.setItem(key, input);
        else localStorage.removeItem(key);
      } catch { /* storage may be unavailable in private browsing */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [conversationId, input]);

  useEffect(() => {
    if (previousPageScopeRef.current === pageScope) return;
    previousPageScopeRef.current = pageScope;
    setMessages([]);
    setActivityByMessage({});
    setLongThinkingByMessage({});
    setAttachmentByMessage({});
    setConversationTitle("");
    setAnalysisScope("section");
    setAnalysisEnabled(false);
    setConversationId(null);
  }, [pageScope]);

  // ── Token buffer for smooth streaming ─────────────────────────────────────
  const tokenBufferRef  = useRef<string>("");
  const rafRef          = useRef<number | null>(null);
  const streamDoneRef   = useRef<boolean>(false);
  const drainCarryRef   = useRef<number>(0);
  const drainFrameAtRef = useRef<number | null>(null);

  const drainBuffer = useCallback(() => {
    if (!tokenBufferRef.current) {
      // Buffer empty — if stream is done, do cleanup here (not in finally)
      rafRef.current = null;
      drainCarryRef.current = 0;
      drainFrameAtRef.current = null;
      if (streamDoneRef.current) {
        streamDoneRef.current = false;
        setIsStreaming(false);
        setStreamingId(null);
        botIdRef.current = null;
        activeVoiceReplyRef.current = false;
        setVoiceTask(null);
      }
      return;
    }
    const bufLen = tokenBufferRef.current.length;
    const now = performance.now();
    const lastFrame = drainFrameAtRef.current ?? now;
    const elapsed = Math.min(48, Math.max(0, now - lastFrame));
    drainFrameAtRef.current = now;
    // Reveal a few characters per frame at a steady, backlog-aware pace.
    // This avoids both phrase-sized jumps and a large final flush.
    const charsPerSecond = bufLen > 500 ? 150 : bufLen > 100 ? 110 : 78;
    const available = drainCarryRef.current + elapsed * charsPerSecond / 1000;
    const count = Math.min(bufLen, Math.max(1, Math.floor(available)));
    drainCarryRef.current = Math.max(0, available - count);
    const take = tokenBufferRef.current.slice(0, count);
    tokenBufferRef.current = tokenBufferRef.current.slice(take.length);
    const botId = botIdRef.current;
    if (botId) {
      // Only show the jump control when the user is genuinely away from the
      // live bottom of the stream. While already at the bottom, keep following
      // TESS silently and do not display a floating status control.
      const viewport = messagesScrollRef.current;
      const atBottom = !viewport || viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 72;
      followStreamRef.current = atBottom;
      setShowStreamJump(!atBottom);
      setMessages(prev =>
        prev.map(m => m.id === botId ? { ...m, content: m.content + take } : m)
      );
      if (activeVoiceReplyRef.current) setVoiceResponseText(previous => previous + take);
    }
    rafRef.current = requestAnimationFrame(drainBuffer);
  // setMessages / setIsStreaming / setStreamingId are stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the newest turn visible both when opening a saved conversation and
  // while a response streams in. Scrolling the message viewport directly
  // avoids moving the page behind the fixed composer.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const viewport = messagesScrollRef.current;
      if (!followStreamRef.current) return;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: isStreaming ? "auto" : "smooth",
        });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth", block: "end" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, isStreaming]);

  const handleMessagesScroll = useCallback(() => {
    const viewport = messagesScrollRef.current;
    if (!viewport) return;
    const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 72;
    followStreamRef.current = atBottom;
    setShowStreamJump(isStreaming && !atBottom);
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      followStreamRef.current = true;
      setShowStreamJump(false);
    }
  }, [isStreaming]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const maxHeight = 144;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input, isOpen]);

  // Reset conversation on mode change
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      setMessages([]);
      setActivityByMessage({});
      setLongThinkingByMessage({});
      setAttachmentByMessage({});
      setInput("");
      setAnalysisEnabled(false);
      setConversationId(null);
      setConversationTitle("");
      prevModeRef.current = mode;
    }
  }, [mode]);

  // Reset only when changing courses. Chapter navigation keeps the current chat.
  useEffect(() => {
    setMessages([]);
    setActivityByMessage({});
    setLongThinkingByMessage({});
    setAttachmentByMessage({});
    setAnalysisEnabled(false);
    setConversationId(null);
    setConversationTitle("");
  }, [contextCourseId]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview);
    };
  }, [attachedFile]);

  // Abort stream on unmount
  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  const config = MODE_CONFIG[mode];
  const Icon   = config.icon;
  const courseContextActive = livePageContext?.current_page === "course-detail" && Number(livePageContext.page_data?.course_id) > 0;
  const courseAnalysisAvailable = courseContextActive || (mode === "course" && Boolean(contextCourseId || contextCoursId));
  const visibleConversations = conversations
    .filter(conversation => conversation.mode === mode && (mode !== "course" || !contextCourseId || conversation.course_id === contextCourseId));
  const headerConversationTitle = conversationTitle || conversationLabel(messages.find(message => message.role === "user")?.content);
  const isNewConversationActive = location.pathname === "/" && messages.length === 0 && !conversationId;

  // ── Stop streaming ──────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamDoneRef.current = false;
    drainCarryRef.current = 0;
    drainFrameAtRef.current = null;
    const remaining = tokenBufferRef.current;
    tokenBufferRef.current = "";
    const stoppedBotId = botIdRef.current;
    if (remaining && stoppedBotId) {
      setMessages(previous => previous.map(message => message.id === stoppedBotId ? { ...message, content: message.content + remaining } : message));
    }
    setIsStreaming(false);
    setStreamingId(null);
    botIdRef.current = null;
  }, []);

  // ── New conversation ────────────────────────────────────────────────────────
  const startNewConversation = useCallback((event?: ReactMouseEvent<HTMLButtonElement>) => {
    if (!conversationId && messages.length === 0 && !isStreaming) {
      const rect = event?.currentTarget.getBoundingClientRect() ?? newChatButtonRef.current?.getBoundingClientRect();
      if (rect) {
        const noticeWidth = Math.min(260, window.innerWidth - 24);
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - noticeWidth - 12));
        const below = rect.bottom + 8;
        const top = below + 76 <= window.innerHeight ? below : Math.max(12, rect.top - 76);
        setNewChatNoticePosition({ top, left });
      }
      setNewChatNotice(true);
      if (newChatNoticeTimerRef.current !== null) window.clearTimeout(newChatNoticeTimerRef.current);
      newChatNoticeTimerRef.current = window.setTimeout(() => { setNewChatNotice(false); setNewChatNoticePosition(null); }, 2600);
      return;
    }
    setNewChatNotice(false);
    setNewChatNoticePosition(null);
    handleStop();
    setMessages([]);
    setInput("");
    setStarterPrompts(pickStarterPrompts());
    setDismissedStarterPrompts([]);
    setConversationId(null);
    setConversationTitle("");
    setActivityByMessage({});
    setLongThinkingByMessage({});
    setAttachmentByMessage({});
    setAnalysisEnabled(false);
    setAttachedFile(null);
    setOptionsOpen(false);
    if (routeConversations) navigate(`${conversationRouteBase}/ai`, { replace: true });
  }, [conversationId, conversationRouteBase, handleStop, isStreaming, messages.length, navigate, routeConversations]);

  const openOptions = useCallback(() => {
    const willOpen = !optionsOpen;
    setOptionsOpen(willOpen);
    if (!willOpen) return;
    setHistoryError("");
    if (!isAuthenticated()) {
      setConversations([]);
      return;
    }
    setHistoryLoading(true);
    void apiGetConversations()
      .then(setConversations)
      .catch(() => setHistoryError("L’historique n’a pas pu être chargé."))
      .finally(() => setHistoryLoading(false));
  }, [optionsOpen]);

  const requireAuth = useCallback((route: string) => {
    setAuthRequiredRoute(route);
  }, []);

  const openSearch = useCallback(() => {
    if (!isAuthenticated()) {
      requireAuth("/");
      return;
    }
    setSearchOpen(value => !value);
    setOptionsOpen(false);
    setSearchError("");
  }, [navigate, requireAuth]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated()) return;
    setHistoryLoading(true);
    void apiGetConversations()
      .then(setConversations)
      .catch(() => setHistoryError("L’historique n’a pas pu être chargé."))
      .finally(() => setHistoryLoading(false));
  }, [isOpen]);

  // Refresh TESS-generated conversation names after every completed turn.
  useEffect(() => {
    if (isStreaming || !conversationId || !isAuthenticated()) return;
    let active = true;
    void apiGetConversations().then(items => {
      if (!active) return;
      setConversations(items);
      const current = items.find(item => item.id === conversationId);
      if (current?.title?.trim()) setConversationTitle(current.title.trim());
    }).catch(() => undefined);
    return () => { active = false; };
  }, [conversationId, isStreaming]);

  const openConversation = useCallback(async (conversation: StoredAIConversation) => {
    if (isStreaming) return;
    setOpeningConversationId(conversation.id);
    setHistoryError("");
    try {
      const result = await apiGetConversationMessages(conversation.id);
      setMessages(result.messages
        .filter((message): message is typeof message & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant")
        .map(message => ({ id: `history-${message.id}`, role: message.role, content: message.content, createdAt: message.created_at })));
      setConversationId(conversation.id);
      setConversationTitle(conversation.title?.trim() || conversationLabel(result.messages.find(message => message.role === "user")?.content));
      setActivityByMessage({});
      setLongThinkingByMessage({});
      setAttachmentByMessage({});
      setOptionsOpen(false);
      if (routeConversations) navigate(`${conversationRouteBase}/ai/${conversation.id}`, { state: conversationRouteState });
    } catch {
      setHistoryError("Cette conversation n’a pas pu être ouverte. Réessayez.");
    } finally {
      setOpeningConversationId(null);
    }
  }, [conversationRouteBase, conversationRouteState, isStreaming, navigate, routeConversations]);

  // A routed conversation must survive a full page refresh. The route owns
  // the identity; the API remains the source of truth for its messages.
  useEffect(() => {
    if (!isOpen || !routeConversations || !initialConversationId || initialConversationId === conversationId) return;
    let active = true;
    setOpeningConversationId(initialConversationId);
    setHistoryError("");
    void Promise.all([
      apiGetConversationMessages(initialConversationId),
      apiGetConversations(),
    ]).then(([result, items]) => {
      if (!active) return;
      const current = items.find(item => item.id === initialConversationId);
      setMessages(result.messages
        .filter((message): message is typeof message & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant")
        .map(message => ({ id: `history-${message.id}`, role: message.role, content: message.content, createdAt: message.created_at })));
      setConversationId(initialConversationId);
      setConversationTitle(current?.title?.trim() || conversationLabel(result.messages.find(message => message.role === "user")?.content));
      setActivityByMessage({});
      setLongThinkingByMessage({});
      setAttachmentByMessage({});
    }).catch(() => {
      if (active) setHistoryError("Cette conversation n’a pas pu être chargée. Réessayez.");
    }).finally(() => {
      if (active) setOpeningConversationId(null);
    });
    return () => { active = false; };
  }, [conversationId, initialConversationId, isOpen, routeConversations]);

  // ── File picker ─────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachmentError("");
    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError("Le fichier dépasse 10 Mo. Choisissez une image ou un PDF plus léger.");
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl  = reader.result as string;
        const [header, base64] = dataUrl.split(",");
        const mimeType = header.match(/data:([^;]+)/)?.[1] ?? file.type;
        const preview  = URL.createObjectURL(file);
        setAttachedFile({ file, type: "image", preview, base64, mimeType });
      };
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      setAttachmentError("L’analyse PDF n’est pas encore reliée au gateway TESS. Utilisez une image ou envoyez le texte à analyser.");
    } else if (file.type.startsWith("audio/")) {
      setAttachmentError("Utilisez le bouton audio du composer pour enregistrer un message vocal.");
    } else {
      setAttachmentError("Format non pris en charge. Vous pouvez joindre une image ou un PDF.");
    }
  }, []);

  useEffect(() => {
    const pendingImage = (location.state as { tessPendingImage?: unknown } | null)?.tessPendingImage;
    if (!(pendingImage instanceof File)) return;
    navigate(location.pathname, { replace: true, state: null });
    if (!pendingImage.type.startsWith("image/")) {
      setAttachmentError("Le fichier transmis n’est pas une image prise en charge.");
      return;
    }
    if (pendingImage.size > 10 * 1024 * 1024) {
      setAttachmentError("Le fichier dépasse 10 Mo. Choisissez une image plus légère.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? pendingImage.type;
      setAttachedFile({ file: pendingImage, type: "image", preview: URL.createObjectURL(pendingImage), base64, mimeType });
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    reader.readAsDataURL(pendingImage);
  }, [location.key, location.pathname, location.state, navigate]);

  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard permission can be unavailable in embedded browsers.
    }
  }, []);

  const shareMessage = useCallback(async (content: string) => {
    if (navigator.share) {
      try { await navigator.share({ title: "Réponse de TESS AI", text: content }); }
      catch { /* User dismissed the native share sheet. */ }
      return;
    }
    await copyMessage(content);
  }, [copyMessage]);

  const submitMessageFeedback = useCallback(async (messageId: string, rating: number) => {
    const index = messages.findIndex((message) => message.id === messageId);
    const assistantMessage = messages[index];
    const promptMessage = messages.slice(0, index).reverse().find((message) => message.role === "user");
    if (!assistantMessage || assistantMessage.role !== "assistant" || !assistantMessage.content || !promptMessage?.content) return;
    try {
      await tessSubmitFeedback({
        prompt: promptMessage.content,
        answer: assistantMessage.content,
        rating,
        session_id: conversationId ? String(conversationId) : undefined,
        domain: mode,
      });
      setFeedbackByMessage(previous => ({ ...previous, [messageId]: rating }));
    } catch {
      // Le feedback n'est marqué comme envoyé qu'après confirmation de l'API.
    }
  }, [conversationId, messages, mode]);

  const editMessage = useCallback((message: AIMessage) => {
    setInput(message.content);
    setEditingMessageId(message.id);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: "nearest" });
    });
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────── 
  const sendMessage = useCallback(async (text: string, audioAttachment?: MessageAudioAttachment) => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedFile) || isStreaming || sendLockRef.current) return;
    sendLockRef.current = true;
    followStreamRef.current = true;
    setShowStreamJump(false);

    const displayText = trimmed || (attachedFile ? `[${attachedFile.file.name}]` : "");
    setConversationTitle(current => current || conversationLabel(trimmed));
    const speakThisReply = voiceReplyRef.current;
    voiceReplyRef.current = false;
    activeVoiceReplyRef.current = speakThisReply;
    if (speakThisReply) {
      setVoiceResponseText("");
      setShowVoiceTranscript(false);
      setVoiceTask("thinking");
    }

    // Add user message
    const revisedMessageId = editingMessageId;
    const currentAttachment = attachedFile;
    const userMsg: AIMessage = {
      id:        `u-${Date.now()}`,
      role:      "user",
      content:   displayText,
      createdAt: new Date().toISOString(),
    };
    if (currentAttachment) {
      setAttachmentByMessage(previous => ({ ...previous, [userMsg.id]: { name: currentAttachment.file.name, type: currentAttachment.type, size: currentAttachment.file.size } }));
    }
    if (audioAttachment) setAudioByMessage(previous => ({ ...previous, [userMsg.id]: audioAttachment }));
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setEditingMessageId(null);
    if (revisedMessageId) setEditedMessageIds((previous) => new Set([...previous, userMsg.id]));

    // Capture and clear attachment
    setAttachedFile(null);

    // Create bot message placeholder (empty — will fill via streaming)
    const botId = `a-${Date.now()}`;
    botIdRef.current = botId;
    streamDoneRef.current = false;
    drainCarryRef.current = 0;
    drainFrameAtRef.current = null;
    setIsStreaming(true);
    setStreamingId(botId);
    setMessages(prev => [
      ...prev,
      { id: botId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setActivityByMessage(previous => ({ ...previous, [botId]: { steps: [], sources: [] } }));
    setLongThinkingByMessage(previous => ({ ...previous, [botId]: longThinking }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let speechRemainder = "";
    let speechQueue = Promise.resolve();
    try {
      // Build context
      const history = messages.slice(-20).map((message) => ({
        role: message.role,
        content: message.id === revisedMessageId
          ? `[Message précédent corrigé par l’utilisateur : ${message.content}]`
          : message.content,
      }));
      const basePageCtx  = getPageContext();
      const selectedText = (typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "") ?? "";
      const pageCtx      = basePageCtx && selectedText
        ? { ...basePageCtx, page_data: { ...basePageCtx.page_data, selected_text: selectedText } }
        : basePageCtx;
      const pageData     = pageCtx?.page_data ?? {};
      const pageCourseId = Number(pageData.course_id);
      const pageChapterId = Number(pageData.chapter_id);

      let iaPrefs = { defaultLevel: "intermediaire", responseLanguage: "fr", proactiveHints: true };
      try {
        const raw = localStorage.getItem("tess-ai-prefs");
        if (raw) iaPrefs = { ...iaPrefs, ...JSON.parse(raw) };
      } catch { /* ignore */ }

      const imageB64      = currentAttachment?.type === "image" ? currentAttachment.base64 : undefined;
      const imageMime     = currentAttachment?.type === "image" ? currentAttachment.mimeType : undefined;

      // Resolve document ID: attached PDF > prop > page context (DocumentAIPage)
      const activeCorsId  = currentAttachment?.type === "pdf" && currentAttachment.mimeType === "pdf"
        ? parseInt(currentAttachment.base64 ?? "0", 10) || undefined
        : pageDocCtx?.id ?? contextCoursId ?? undefined;

      const fullDocumentIntent = Boolean(activeCorsId && /\b(document complet|document entier|tout le document|analyse le document|analyse ce pdf|analyse ce fichier)\b/i.test(trimmed));
      const effectiveAnalysisScope = fullDocumentIntent ? "document" : analysisEnabled && analysisScope === "course" ? "course" : "section";

      // Auto-switch to document mode when document comes from page context
      const effectiveMode = (!contextCoursId && pageDocCtx?.id && activeCorsId === pageDocCtx.id)
        ? "document"
        : mode;

      // Show thinking dots until first token
      let firstToken = true;

      // ── Stream tokens into RAF buffer — smooth typewriter effect ──────────
      tokenBufferRef.current = "";
      for await (const delta of apiAIChatStream(trimmed || "Analyse ce fichier.", {
        coursId:          activeCorsId,
        courseId:         contextCourseId ?? (Number.isInteger(pageCourseId) && pageCourseId > 0 ? pageCourseId : undefined),
        chapterId:        contextChapterId ?? (Number.isInteger(pageChapterId) && pageChapterId > 0 ? pageChapterId : undefined),
        history,
        mode:             effectiveMode,
        alertMode,
        conversationId:   conversationId ?? undefined,
        onConversationId: (id) => {
          setConversationId(id);
          if (routeConversations) navigate(`${conversationRouteBase}/ai/${id}`, { replace: true, state: conversationRouteState });
        },
        pageContext:      pageCtx,
        userContext: {
          ia_level:           iaPrefs.defaultLevel,
          ia_language:        iaPrefs.responseLanguage,
          ia_proactive_hints: iaPrefs.proactiveHints,
          learning_profile:   learningProfile,
        },
        signal:       controller.signal,
        image_base64: imageB64,
        image_type:   imageMime,
        longThinking: longThinking || composerMode === "reflect",
        analysisMode: composerMode === "search" || (analysisEnabled && courseAnalysisAvailable),
        analysisScope: effectiveAnalysisScope,
        voiceMode: speakThisReply,
        onActivity: (step) => setActivityByMessage(previous => {
          const existing = previous[botId] ?? { steps: [], sources: [] };
          return { ...previous, [botId]: { ...existing, steps: [...existing.steps.filter(item => item.id !== step.id), step] } };
        }),
        onSources: (sources) => setActivityByMessage(previous => {
          const existing = previous[botId] ?? { steps: [], sources: [] };
          const merged = [...existing.sources];
          for (const source of sources) {
            if (!merged.some(item => item.id === source.id)) merged.push(source);
          }
          return { ...previous, [botId]: { ...existing, sources: merged } };
        }),
      })) {
        if (controller.signal.aborted) break;

        // Hide thinking dots on first real token
        if (firstToken) {
          firstToken = false;
        }

        // Accumulate in buffer; RAF loop drains at ~60fps for smooth reveal
        tokenBufferRef.current += delta;
        if (speakThisReply) {
          speechRemainder += delta;
          let sentence = speechRemainder.match(/^([\s\S]*?[.!?…])\s+/);
          while (sentence) {
            const spokenPiece = sentence[1].trim();
            speechRemainder = speechRemainder.slice(sentence[0].length);
            speechQueue = speechQueue.then(() => controller.signal.aborted ? undefined : speakReplyRef.current(spokenPiece, controller.signal));
            sentence = speechRemainder.match(/^([\s\S]*?[.!?…])\s+/);
          }
        }
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(drainBuffer);
        }
      }

      if (speakThisReply && speechRemainder.trim()) {
        const finalPiece = speechRemainder.trim();
        speechQueue = speechQueue.then(() => controller.signal.aborted ? undefined : speakReplyRef.current(finalPiece, controller.signal));
      }
      if (speakThisReply) {
        await speechQueue;
        // The backend stream has completed and the last audio chunk has ended:
        // reopen the microphone automatically for the next turn.
        if (!controller.signal.aborted && !stopVoiceRef.current) {
          window.setTimeout(() => { void startVoiceRecordingRef.current(); }, 0);
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User stopped — flush remaining buffer and keep what we have
      } else {
        const errText = apiErrorMessage(err, "Veuillez réessayer.");
        setActivityByMessage(previous => {
          const existing = previous[botId] ?? { steps: [], sources: [] };
          const errorStep: AIActivityStep = { id: "response-error", status: "error", title: "Réponse interrompue", detail: errText };
          return { ...previous, [botId]: { ...existing, steps: [...existing.steps.filter(step => step.id !== errorStep.id), errorStep] } };
        });
        setMessages(prev =>
          prev.map(m => m.id === botId
            ? { ...m, content: m.content || `Désolé, une erreur s'est produite. ${errText}` }
            : m
          )
        );
        setInput(previous => previous || trimmed);
      }
    } finally {
      // Let the animation drain every queued character; never dump the entire
      // network buffer into the bubble in a single final render.
      if (controller.signal.aborted) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        const remaining = tokenBufferRef.current;
        tokenBufferRef.current = "";
        if (remaining) setMessages(previous => previous.map(message => message.id === botId ? { ...message, content: message.content + remaining } : message));
        if (remaining && activeVoiceReplyRef.current) setVoiceResponseText(previous => previous + remaining);
        streamDoneRef.current = false;
        drainCarryRef.current = 0;
        drainFrameAtRef.current
        setIsStreaming(false);
        setStreamingId(null);
        botIdRef.current = null;
        activeVoiceReplyRef.current = false;
        setVoiceTask(null);
      } else {
        streamDoneRef.current = true;
        if (!tokenBufferRef.current) {
          streamDoneRef.current = false;
          setIsStreaming(false);
          setStreamingId(null);
          botIdRef.current = null;
          activeVoiceReplyRef.current = false;
          setVoiceTask(null);
        } else if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(drainBuffer);
        }
      }
      sendLockRef.current = false;
    }
  }, [
    attachedFile, isStreaming, messages, mode, alertMode, learningProfile,
    conversationId, contextCoursId, contextCourseId, contextChapterId, longThinking, composerMode, analysisScope, analysisEnabled, courseAnalysisAvailable, drainBuffer,
  ]);

  const retryAssistantMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((message) => message.id === messageId);
    const previousUserMessage = messages.slice(0, index).reverse().find((message) => message.role === "user");
    if (previousUserMessage) void sendMessage(previousUserMessage.content);
  }, [messages, sendMessage]);

  const stopMessageAudio = useCallback((hide = true) => {
    messageAudioAbortRef.current?.abort();
    messageAudioAbortRef.current = null;
    messageAudioWantedRef.current = false;
    messageAudioCurrentRef.current?.pause();
    messageAudioCurrentRef.current = null;
    if (messageAudioFrameRef.current != null) cancelAnimationFrame(messageAudioFrameRef.current);
    messageAudioFrameRef.current = null;
    messageAudioChunksRef.current.forEach((chunk) => URL.revokeObjectURL(chunk.url));
    messageAudioChunksRef.current = [];
    if (hide) setMessageAudio((current) => ({ ...current, visible: false, isPlaying: false, isLoading: false, isStreaming: false }));
  }, []);

  const playMessageAudioChunk = useCallback((index: number, offset = 0) => {
    const chunk = messageAudioChunksRef.current[index];
    if (!chunk) return;
    const audio = chunk.audio;
    messageAudioCurrentRef.current?.pause();
    messageAudioCurrentRef.current = audio;
    audio.currentTime = Math.max(0, Math.min(offset, Math.max(0, chunk.duration - 0.05)));
    audio.onended = () => {
      const next = index + 1;
      if (messageAudioChunksRef.current[next]) {
        playMessageAudioChunk(next);
      } else {
        messageAudioCurrentRef.current = null;
        messageAudioWantedRef.current = false;
        setMessageAudio((current) => ({ ...current, isPlaying: false, isLoading: current.isStreaming, currentTime: current.totalDuration }));
      }
    };
    const tick = () => {
      if (messageAudioCurrentRef.current !== audio) return;
      setMessageAudio((current) => ({ ...current, currentTime: Math.min(current.totalDuration, chunk.start + audio.currentTime) }));
      messageAudioFrameRef.current = requestAnimationFrame(tick);
    };
    void audio.play().then(() => {
      messageAudioWantedRef.current = true;
      setMessageAudio((current) => ({ ...current, isPlaying: true, isLoading: false }));
      messageAudioFrameRef.current = requestAnimationFrame(tick);
    }).catch(() => setMessageAudio((current) => ({ ...current, isPlaying: false, isLoading: false, error: "La lecture audio nécessite une interaction." })));
  }, []);

  const handleMessageAudio = useCallback(async (content: string, messageId: string) => {
    if (messageAudio.visible && messageAudio.title === content.slice(0, 80)) {
      if (messageAudio.isPlaying) {
        messageAudioWantedRef.current = false;
        messageAudioCurrentRef.current?.pause();
        setMessageAudio((current) => ({ ...current, isPlaying: false }));
      } else {
        messageAudioWantedRef.current = true;
        const currentIndex = messageAudioChunksRef.current.findIndex((chunk) => chunk.audio === messageAudioCurrentRef.current);
        playMessageAudioChunk(currentIndex >= 0 ? currentIndex : 0, messageAudio.currentTime);
      }
      return;
    }
    stopMessageAudio(false);
    const controller = new AbortController();
    messageAudioAbortRef.current = controller;
    messageAudioWantedRef.current = true;
    setMessageAudio({ visible: true, title: content.replace(/\s+/g, " ").trim().slice(0, 80), isPlaying: false, isLoading: true, isStreaming: true, currentTime: 0, totalDuration: 0, generatedChunks: 0, totalChunks: null, waveform: [], error: "" });
    try {
      await apiAIVoiceSynthesizeStream(content, {
        voice: voiceName,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "start") {
            setMessageAudio((current) => ({ ...current, totalChunks: event.total_chunks ?? null }));
          } else if (event.type === "audio" && event.audio_base64) {
            const binary = window.atob(event.audio_base64);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            const url = URL.createObjectURL(new Blob([bytes], { type: event.audio_content_type || "audio/mpeg" }));
            const audio = new Audio(url);
            audio.preload = "auto";
            const addChunk = () => {
              const previous = messageAudioChunksRef.current;
              const start = previous.reduce((sum, item) => sum + item.duration, 0);
              const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
              const nextWaveform = Array.from({ length: 48 }, (_, waveformIndex) => {
                const sourceIndex = previous.length * 48 + waveformIndex;
                const source = content.charCodeAt(sourceIndex % Math.max(1, content.length)) || 97;
                return 0.2 + ((source * (waveformIndex + 3) * 13) % 75) / 100;
              });
              messageAudioChunksRef.current = [...previous, { url, audio, start, duration }];
              setMessageAudio((current) => ({ ...current, generatedChunks: messageAudioChunksRef.current.length, totalDuration: start + duration, waveform: [...current.waveform, ...nextWaveform], isLoading: false }));
              if (messageAudioWantedRef.current && messageAudioCurrentRef.current == null) playMessageAudioChunk(previous.length);
            };
            if (audio.readyState >= 1) addChunk(); else audio.addEventListener("loadedmetadata", addChunk, { once: true });
          } else if (event.type === "done") {
            setMessageAudio((current) => ({ ...current, isStreaming: false, isLoading: false, totalChunks: event.total_chunks ?? current.totalChunks }));
          } else if (event.type === "error") {
            setMessageAudio((current) => ({ ...current, isStreaming: false, isLoading: false, error: event.message || "La synthèse vocale est indisponible." }));
          }
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessageAudio((current) => ({ ...current, isStreaming: false, isLoading: false, error: error instanceof Error ? error.message : "La synthèse vocale est indisponible." }));
    }
    void messageId;
  }, [messageAudio, playMessageAudioChunk, stopMessageAudio, voiceName]);

  const seekMessageAudio = useCallback((time: number) => {
    const chunks = messageAudioChunksRef.current;
    const index = chunks.findIndex((chunk) => time >= chunk.start && time <= chunk.start + chunk.duration);
    const targetIndex = index >= 0 ? index : Math.max(0, chunks.length - 1);
    const target = chunks[targetIndex];
    if (!target) return;
    const offset = Math.max(0, time - target.start);
    if (messageAudio.isPlaying) playMessageAudioChunk(targetIndex, offset);
    else { messageAudioCurrentRef.current?.pause(); messageAudioCurrentRef.current = target.audio; target.audio.currentTime = offset; setMessageAudio((current) => ({ ...current, currentTime: time })); }
  }, [messageAudio.isPlaying, playMessageAudioChunk]);

  const speakReply = useCallback(async (reply: string, signal?: AbortSignal) => {
    voiceSynthesisFailedRef.current = false;
    stopVoiceRef.current = false;
    let playback = Promise.resolve();
    const playAudioBlob = (blob: Blob) => {
      playback = playback.then(async () => {
        if (stopVoiceRef.current || signal?.aborted) return;
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioElementRef.current = audio;
        let audioContext = voiceAudioContextRef.current;
        if (!audioContext || audioContext.state === "closed") { audioContext = new AudioContext(); voiceAudioContextRef.current = audioContext; }
        await audioContext.resume();
        const analyser = audioContext.createAnalyser(); analyser.fftSize = 256;
        const source = audioContext.createMediaElementSource(audio); source.connect(analyser); analyser.connect(audioContext.destination);
        voiceAnalyserRef.current = analyser;
        const samples = new Uint8Array(analyser.fftSize);
        const readAudioLevel = () => {
          analyser.getByteTimeDomainData(samples);
          let sum = 0; for (const sample of samples) { const value = (sample - 128) / 128; sum += value * value; }
          setVoiceLevel(Math.min(1, Math.sqrt(sum / samples.length) * 3.6));
          if (!audio.paused && !audio.ended) voiceAnimationRef.current = requestAnimationFrame(readAudioLevel); else setVoiceLevel(0);
        };
        setVoiceState("speaking"); setVoicePaused(false); voiceAnimationRef.current = requestAnimationFrame(readAudioLevel);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onpause = () => { if (stopVoiceRef.current || signal?.aborted) { URL.revokeObjectURL(url); resolve(); } };
          audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("La lecture audio a été interrompue.")); };
          audio.play().catch(reject);
        });
      });
      return playback;
    };
    try {
      const controller = new AbortController();
      voiceTtsControllerRef.current = controller;
      signal?.addEventListener("abort", () => controller.abort(), { once: true });
      await apiAIVoiceSynthesizeStream(reply, {
        voice: voiceName,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "audio" && event.audio_base64) {
            const binary = window.atob(event.audio_base64);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            void playAudioBlob(new Blob([bytes], { type: event.audio_content_type || "audio/mpeg" }));
          }
        },
      });
      await playback;
      if (!signal?.aborted && !stopVoiceRef.current) setVoiceState("idle");
    } catch (error) {
      voiceSynthesisFailedRef.current = true;
      if (!stopVoiceRef.current && !signal?.aborted) { setVoiceState("error"); setVoiceError(error instanceof Error ? error.message : "La voix est momentanément indisponible. La réponse écrite est conservée."); }
    } finally {
      voiceTtsControllerRef.current = null;
      setVoiceLevel(0);
    }
  }, [voiceName]);
  speakReplyRef.current = speakReply;

  const toggleVoicePause = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio) return;
    if (audio.paused) { void audio.play(); setVoicePaused(false); setVoiceState("speaking"); }
    else { audio.pause(); setVoicePaused(true); setVoiceState("paused"); }
  }, []);

  const stopVoice = useCallback(() => {
    stopVoiceRef.current = true;
    voiceTurnActiveRef.current = false;
    voiceTurnTextRef.current = "";
    if (voiceTurnTimerRef.current != null) window.clearTimeout(voiceTurnTimerRef.current);
    voiceTurnTimerRef.current = null;
    dictationActiveRef.current = false;
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    voiceTtsControllerRef.current?.abort(); voiceTtsControllerRef.current = null;
    voiceTranscribeControllerRef.current?.abort(); voiceTranscribeControllerRef.current = null;
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;
    audioElementRef.current?.pause(); audioElementRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
    if (voiceVadFrameRef.current) cancelAnimationFrame(voiceVadFrameRef.current);
    voiceVadFrameRef.current = null;
    if (voiceAudioContextRef.current) { void voiceAudioContextRef.current.close(); voiceAudioContextRef.current = null; }
    activeVoiceReplyRef.current = false;
    setVoiceLevel(0); setVoicePaused(false); setVoiceState("idle"); setVoiceTask(null);
  }, []);

  const startVoiceRecording = useCallback(async () => {
    const restartingRecognition = voiceTurnActiveRef.current;
    setVoiceError("");
    setVoiceTask("connecting");
    setVoiceState("processing");
    stopVoiceRef.current = false;
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (Recognition) {
      const recognition = new Recognition();
      if (!restartingRecognition) {
        setVoiceTranscript("");
        voiceTurnActiveRef.current = true;
        voiceTurnTextRef.current = "";
      }
      speechRecognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = document.documentElement.lang === "sw" ? "sw-TZ" : document.documentElement.lang?.startsWith("en") ? "en-US" : "fr-FR";
      // SpeechRecognition gives the cleanest live transcript; this separate
      // analyser keeps the visual meter tied to the real microphone signal.
      void navigator.mediaDevices?.getUserMedia?.({ audio: true }).then(async (stream) => {
        if (!voiceTurnActiveRef.current || stopVoiceRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
        micStreamRef.current = stream;
        const context = voiceAudioContextRef.current && voiceAudioContextRef.current.state !== "closed" ? voiceAudioContextRef.current : new AudioContext();
        voiceAudioContextRef.current = context;
        await context.resume();
        const analyser = context.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.78;
        context.createMediaStreamSource(stream).connect(analyser);
        voiceAnalyserRef.current = analyser;
        const samples = new Uint8Array(analyser.fftSize);
        const meter = () => {
          if (!voiceTurnActiveRef.current || !micStreamRef.current) return;
          analyser.getByteTimeDomainData(samples);
          let sum = 0; for (const sample of samples) { const value = (sample - 128) / 128; sum += value * value; }
          setVoiceLevel(Math.min(1, Math.sqrt(sum / samples.length) * 8));
          voiceAnimationRef.current = requestAnimationFrame(meter);
        };
        meter();
      }).catch(() => { /* speech recognition can still work without the meter */ });
      recognition.onstart = () => { setVoiceTask(null); setVoiceState("listening"); };
      recognition.onresult = (event) => {
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript ?? "";
          if (event.results[index].isFinal) voiceTurnTextRef.current = `${voiceTurnTextRef.current} ${transcript}`.trim();
          else interim += transcript;
        }
        const visible = `${voiceTurnTextRef.current} ${interim}`.trim();
        setVoiceTranscript(visible);
        if (voiceTurnTextRef.current) {
          if (voiceTurnTimerRef.current != null) window.clearTimeout(voiceTurnTimerRef.current);
          voiceTurnTimerRef.current = window.setTimeout(() => {
            if (!voiceTurnActiveRef.current || stopVoiceRef.current) return;
            voiceTurnActiveRef.current = false;
            micStreamRef.current?.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
            if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
            const text = cleanVoiceTurnText(voiceTurnTextRef.current);
            recognition.stop();
            if (text) {
              setVoiceTask("thinking");
              setVoiceState("processing");
              voiceReplyRef.current = true;
              sendVoiceTextRef.current(text);
            }
          }, 1200);
        }
      };
      recognition.onerror = (event) => {
        if (voiceTurnTimerRef.current != null) window.clearTimeout(voiceTurnTimerRef.current);
        if (event.error === "no-speech" || event.error === "aborted") {
          if (voiceTurnActiveRef.current && !stopVoiceRef.current) window.setTimeout(() => { void startVoiceRecordingRef.current(); }, 180);
          return;
        }
        voiceTurnActiveRef.current = false;
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
        if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
        if (event.error !== "aborted") {
          setVoiceState("error");
          setVoiceError(event.error === "not-allowed" ? "Accès au micro refusé. Autorisez le micro dans le navigateur." : "La reconnaissance vocale a rencontré un problème. Réessayez.");
        }
      };
      recognition.onend = () => {
        speechRecognitionRef.current = null;
        if (voiceTurnActiveRef.current && !stopVoiceRef.current) {
          // Browsers close an instance after a pause. Create a fresh one and
          // preserve the accumulated sentence instead of reusing a dead one.
          micStreamRef.current?.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
          if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
          setVoiceTask("connecting");
          setVoiceState("processing");
          window.setTimeout(() => { if (voiceTurnActiveRef.current && !stopVoiceRef.current) void startVoiceRecordingRef.current(); }, 180);
        }
      };
      try { recognition.start(); } catch { voiceTurnActiveRef.current = false; setVoiceState("error"); setVoiceError("Impossible d’activer le microphone."); }
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceTask(null); setVoiceState("error"); setVoiceError("Ce navigateur ne permet pas l'enregistrement vocal. Utilisez la saisie écrite."); return;
    }
    try {
      // Start/resume the audio context directly from the microphone gesture.
      // Mobile browsers often block playback if this is deferred until TTS returns.
      if (voiceAudioContextRef.current && voiceAudioContextRef.current.state !== "closed") {
        await voiceAudioContextRef.current.close().catch(() => undefined);
      }
      const audioContext = new AudioContext();
      voiceAudioContextRef.current = audioContext;
      await audioContext.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const analyser = audioContext.createAnalyser(); analyser.fftSize = 256; voiceAnalyserRef.current = analyser;
      const silentOutput = audioContext.createGain(); silentOutput.gain.value = 0;
      audioContext.createMediaStreamSource(stream).connect(analyser); analyser.connect(silentOutput); silentOutput.connect(audioContext.destination);
      const samples = new Uint8Array(analyser.fftSize);
      const updateLevel = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0; for (const sample of samples) { const value = (sample - 128) / 128; sum += value * value; }
        const rms = Math.sqrt(sum / samples.length);
        const now = performance.now();
        const noiseFloor = voiceNoiseFloorRef.current = voiceNoiseFloorRef.current * 0.96 + rms * 0.04;
        const speechThreshold = Math.max(0.035, noiseFloor * 2.4);
        const speaking = rms > speechThreshold;
        setVoiceLevel(Math.min(1, Math.max(0, (rms - noiseFloor) * 8)));
        if (speaking) {
          voiceSpeechDetectedRef.current = true;
          voiceLastSpeechAtRef.current = now;
        } else if (
          voiceSpeechDetectedRef.current &&
          now - voiceLastSpeechAtRef.current > 850 &&
          now - voiceRecordingStartedAtRef.current > 550 &&
          recorderRef.current?.state === "recording"
        ) {
          // One natural pause ends the utterance without forcing a second tap.
          recorderRef.current.stop();
          return;
        }
        voiceVadFrameRef.current = requestAnimationFrame(updateLevel);
      };
      voiceSpeechDetectedRef.current = false;
      voiceLastSpeechAtRef.current = performance.now();
      voiceRecordingStartedAtRef.current = performance.now();
      voiceNoiseFloorRef.current = 0.012;
      updateLevel();
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop()); micStreamRef.current = null;
        if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
        if (voiceVadFrameRef.current) cancelAnimationFrame(voiceVadFrameRef.current);
        voiceVadFrameRef.current = null;
        if (stopVoiceRef.current) { setVoiceLevel(0); return; }
        try {
          setVoiceState("processing");
          setVoiceTask("transcribing");
          const controller = new AbortController(); voiceTranscribeControllerRef.current = controller;
          const transcript = await apiAIVoiceTranscribe(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }), controller.signal);
          if (controller.signal.aborted || stopVoiceRef.current) return;
          setVoiceTranscript(transcript); setVoiceTask("thinking"); voiceReplyRef.current = true; sendVoiceTextRef.current(transcript);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          setVoiceState("error"); setVoiceError(error instanceof Error ? error.message : "Impossible de transcrire l'enregistrement.");
          if (voiceAudioContextRef.current) { void voiceAudioContextRef.current.close().catch(() => undefined); voiceAudioContextRef.current = null; }
        } finally {
          setVoiceTask(current => current === "transcribing" ? null : current);
          voiceTranscribeControllerRef.current = null;
          setVoiceLevel(0);
        }
      };
      recorder.start(120); setVoiceState("listening");
    } catch (error) {
      setVoiceTask(null); setVoiceState("error");
      setVoiceError(error instanceof DOMException && error.name === "NotAllowedError" ? "Accès au micro refusé. Autorisez le micro dans les réglages du navigateur." : "Impossible d'ouvrir le micro. Vérifiez qu'il est connecté et réessayez.");
      micStreamRef.current?.getTracks().forEach(track => track.stop()); micStreamRef.current = null;
      if (voiceAudioContextRef.current) { void voiceAudioContextRef.current.close().catch(() => undefined); voiceAudioContextRef.current = null; }
    }
  }, []);

  startVoiceRecordingRef.current = startVoiceRecording;

  const openVoiceSession = useCallback(async () => {
    if (isStreaming) handleStop();
    stopVoice();
    // Unlock Web Audio during the call-button gesture so the server-generated
    // Edge TTS greeting can play after its network request completes.
    try {
      const audioContext = new AudioContext();
      voiceAudioContextRef.current = audioContext;
      void audioContext.resume();
      const silent = audioContext.createBuffer(1, 1, audioContext.sampleRate);
      const unlock = audioContext.createBufferSource();
      unlock.buffer = silent;
      unlock.connect(audioContext.destination);
      unlock.start();
    } catch { /* The greeting still reports a clear playback error if unavailable. */ }
    setVoiceOpen(true);
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceResponseText("");
    setShowVoiceTranscript(false);
    setVoiceTask("greeting");
    setVoiceState("processing");
    // The spoken welcome is an ordinary LLM turn. The UI must not invent a
    // personality or bypass the central cognitive gateway with a canned
    // greeting. It is kept out of the visible transcript, but it shares the
    // conversation session so the next voice turn has the right context.
    let greeting = "";
    try {
      for await (const delta of apiAIChatStream("Bonjour", {
        mode,
        conversationId: conversationId ?? undefined,
        alertMode: false,
        longThinking,
        onConversationId: id => setConversationId(id),
      })) {
        greeting += delta;
      }
    } catch (error) {
      setVoiceTask(null);
      setVoiceState("error");
      setVoiceError(apiErrorMessage(error instanceof Error ? error.message : "", "Le service IA est temporairement indisponible."));
      return;
    }
    if (greeting.trim()) await speakReply(greeting.trim());
    else {
      setVoiceTask(null);
      setVoiceState("error");
      setVoiceError("Le service IA est temporairement indisponible.");
      return;
    }
    setVoiceTask(null);
    // After the spoken greeting, start listening for this voice-call session.
    // Mic permission errors are surfaced by startVoiceRecording with a retry path.
    if (!stopVoiceRef.current && !voiceSynthesisFailedRef.current) await startVoiceRecording();
  }, [conversationId, handleStop, isStreaming, longThinking, mode, speakReply, startVoiceRecording, stopVoice]);

  const startLiveDictation = useCallback(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      void startVoiceRecording();
      return;
    }
    dictationActiveRef.current = true;
    dictationBaseInputRef.current = input.trim();
    dictationTranscriptRef.current = "";
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceTask(null);
    setVoiceState("listening");
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || "fr-FR";
    recognition.onresult = event => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const part = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) dictationTranscriptRef.current += part;
        else interimTranscript += part;
      }
      const cleanTranscript = `${dictationTranscriptRef.current} ${interimTranscript}`.trim();
      setVoiceTranscript(cleanTranscript);
      const base = dictationBaseInputRef.current;
      setInput([base, cleanTranscript].filter(Boolean).join(base && cleanTranscript ? " " : ""));
    };
    recognition.onerror = event => {
      if (event.error !== "aborted") {
        setVoiceError(event.error === "not-allowed" ? "Accès au micro refusé." : "La dictée vocale est indisponible.");
      }
      dictationActiveRef.current = false;
      setVoiceState("error");
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      if (dictationActiveRef.current) {
        dictationActiveRef.current = false;
        setVoiceState("idle");
      }
    };
    speechRecognitionRef.current = recognition;
    try { recognition.start(); } catch { dictationActiveRef.current = false; setVoiceState("error"); setVoiceError("Impossible de démarrer la dictée."); }
  }, [input, startVoiceRecording]);

  const stopLiveDictation = useCallback(() => {
    dictationActiveRef.current = false;
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setVoiceState("idle");
    setVoiceTask(null);
  }, []);

  const handleComposerAudio = useCallback(async (blob: Blob, durationMs: number) => {
    setVoiceError("");
    setVoiceState("processing");
    try {
      const transcript = cleanVoiceTurnText(await apiAIVoiceTranscribe(blob));
      if (!transcript) throw new Error("Aucune parole exploitable n’a été détectée.");
      const url = URL.createObjectURL(blob);
      composerAudioUrlsRef.current.push(url);
      await sendMessage(transcript, { url, durationMs, transcript });
      setVoiceState("idle");
    } catch (error) {
      setVoiceState("idle");
      setVoiceError(error instanceof Error ? error.message : "La transcription audio a échoué.");
    }
  }, [sendMessage]);

  const finishVoiceTurn = useCallback(() => {
    if (voiceTurnActiveRef.current) {
      voiceTurnActiveRef.current = false;
      if (voiceTurnTimerRef.current != null) window.clearTimeout(voiceTurnTimerRef.current);
      voiceTurnTimerRef.current = null;
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
      micStreamRef.current?.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
      if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
      setVoiceLevel(0);
      const text = cleanVoiceTurnText(voiceTurnTextRef.current);
      voiceTurnTextRef.current = "";
      if (text) {
        setVoiceTask("thinking");
        setVoiceState("processing");
        voiceReplyRef.current = true;
        sendVoiceTextRef.current(text);
      }
      return;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const beginVoiceCapture = useCallback(() => {
    if (isStreaming || voiceState === "speaking" || voiceState === "paused") {
      stopVoice(); handleStop();
    }
    if (voiceState === "listening") stopLiveDictation();
    else startLiveDictation();
  }, [handleStop, isStreaming, startLiveDictation, stopLiveDictation, stopVoice, voiceState]);

  useEffect(() => {
    if (!isOpen) { stopVoice(); handleStop(); setVoiceOpen(false); }
  }, [handleStop, isOpen, stopVoice]);

  // Opening the assistant from the floating AI button always starts in chat.
  // Voice is entered only through the phone action in the composer.
  useEffect(() => {
    if (isOpen && !wasPanelOpenRef.current) {
      stopVoice();
      setVoiceOpen(false);
    }
    wasPanelOpenRef.current = isOpen;
  }, [isOpen, stopVoice]);

  useEffect(() => {
    stopVoice();
    setVoiceOpen(false);
  }, [openChatToken, stopVoice]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop(); micStreamRef.current?.getTracks().forEach(track => track.stop());
      audioElementRef.current?.pause(); if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
      if (voiceAudioContextRef.current) { void voiceAudioContextRef.current.close(); voiceAudioContextRef.current = null; }
      stopMessageAudio();
    };
  }, [stopMessageAudio]);
  sendVoiceTextRef.current = (text) => { void sendMessage(text); };

  if (!isOpen) return null;
  const voicePhaseLabel = voiceState === "processing"
    ? voiceTask === "connecting" ? "Activation du microphone…"
      : voiceTask === "transcribing" ? "Nettoyage de votre phrase…"
        : voiceTask === "thinking" ? "TESS prépare sa réponse…" : "Préparation…"
    : voiceState === "listening" ? "Micro actif · dites votre phrase"
      : voiceState === "speaking" ? "TESS parle · interruption possible"
        : voiceState === "paused" ? "Réponse en pause"
          : voiceState === "error" ? "Micro ou voix indisponible" : "Prêt";
  const voicePhaseTone = voiceState === "listening" ? "bg-blue-500" : voiceState === "speaking" ? "bg-emerald-500" : voiceState === "error" ? "bg-rose-500" : "bg-amber-400";
  const [isMobilePanel, setIsMobilePanel] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobilePanel(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const panelViewportStyle = isMobilePanel && visualViewportHeight
    ? { height: `${visualViewportHeight}px` }
    : undefined;
  const closeDesktopNavigation = useCallback(() => {
    setDesktopNavClosing(true);
    setDesktopNavOpen(false);
  }, []);
  const openDesktopNavigation = useCallback(() => {
    setDesktopNavClosing(false);
    setDesktopNavOpen(true);
  }, []);
  useEffect(() => {
    const compactDesktop = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    let wasCompact = compactDesktop.matches;
    if (wasCompact && desktopNavOpenRef.current) closeDesktopNavigation();
    const closeOnCompactViewport = () => {
      const isCompact = compactDesktop.matches;
      if (isCompact && !wasCompact && desktopNavOpenRef.current) closeDesktopNavigation();
      wasCompact = isCompact;
    };
    compactDesktop.addEventListener("change", closeOnCompactViewport);
    return () => compactDesktop.removeEventListener("change", closeOnCompactViewport);
  }, [closeDesktopNavigation]);
  useEffect(() => {
    if (!desktopNavClosing) return;
    const timer = window.setTimeout(() => setDesktopNavClosing(false), 340);
    return () => window.clearTimeout(timer);
  }, [desktopNavClosing]);
  const persistentDesktopNavigation = desktopWorkspace && !isMobilePanel && desktopNavOpen;
  const desktopNavigationVisible = persistentDesktopNavigation || (desktopWorkspace && !isMobilePanel && desktopNavClosing);
  const workspaceNavigationOffset = persistentDesktopNavigation
    ? "md:pl-[18rem]"
    : desktopWorkspace && !isMobilePanel
    ? "md:pl-[4.75rem]"
    : "";
  const navigationVisible = optionsOpen || desktopNavigationVisible;

  const mobileConversation = <div className="space-y-4">{messages.map(msg => <MsgBubble
    key={msg.id}
    msg={msg}
    isStreaming={isStreaming && msg.id === streamingId}
    longThinking={longThinkingByMessage[msg.id]}
    isEdited={editedMessageIds.has(msg.id)}
    activity={activityByMessage[msg.id]}
    attachment={attachmentByMessage[msg.id]}
    audioAttachment={audioByMessage[msg.id]}
    feedbackRating={feedbackByMessage[msg.id]}
    onCopy={(content) => void copyMessage(content)}
    onEdit={() => editMessage(msg)}
    onRetry={() => retryAssistantMessage(msg.id)}
    onSpeak={(content, messageId) => void handleMessageAudio(content, messageId)}
    onShare={(content) => void shareMessage(content)}
    onFeedback={(rating) => void submitMessageFeedback(msg.id, rating)}
  />)}<div ref={messagesEndRef} aria-hidden="true" /></div>;

  const mobileComposerExtras = <>
    <ComposerPlusMenu
      disabled={isStreaming}
      onChooseImage={() => imageInputRef.current?.click()}
      onChooseCamera={() => cameraInputRef.current?.click()}
      onChooseDocument={() => documentInputRef.current?.click()}
      mode={composerMode}
      onModeChange={nextMode => { setComposerMode(nextMode); setLongThinking(nextMode === "reflect"); }}
      alertMode={alertMode}
    />
    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
    <input type="file" ref={documentInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
  </>;

  const mobileHistory = historyLoading ? <p className="px-3 py-3 text-[10px] text-[#6c85ad] dark:text-slate-400">Chargement de l’historique…</p> : historyError ? <p role="alert" className="px-3 py-3 text-[10px] text-rose-600 dark:text-rose-300">{historyError}</p> : visibleConversations.length ? <div className="space-y-1">{visibleConversations.slice(0, 8).map(conversation => <button key={conversation.id} type="button" disabled={isStreaming || openingConversationId !== null} onClick={() => void openConversation(conversation)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition disabled:opacity-50 ${conversationId === conversation.id ? "bg-[#eef5ff] text-[#146bff] dark:bg-blue-400/10 dark:text-blue-300" : "text-[#17366c] hover:bg-[#f5f8fd] dark:text-slate-300 dark:hover:bg-white/10"}`}><MessageSquare className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{conversation.title?.trim() || `Conversation du ${new Date(conversation.created_at).toLocaleDateString()}`}</span></button>)}</div> : <p className="px-3 py-3 text-[10px] text-[#6c85ad] dark:text-slate-400">Aucune conversation récente.</p>;

  // ── Panel body ────────────────────────────────────────────────────────────────
  const panelInner = (
    <>
      {false && voiceOpen ? (
        <section className="relative flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-900 dark:bg-[#171717] dark:text-slate-100">
          <header className="relative z-40 flex min-h-[78px] shrink-0 items-center gap-3 px-3 py-3.5 sm:px-4">
            {!persistentDesktopNavigation && <button type="button" onClick={openOptions} aria-label="Ouvrir les réglages et l'historique" aria-expanded={optionsOpen} className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Menu className="h-5 w-5" /></button>}
            <div className="relative z-10 flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <img src="/ai_icon.jpg" alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1" />
              <div className="min-w-0"><p className="truncate font-semibold">TESS</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">Voix · {contextCourse ? contextCourse : "Assistant"}</p></div>
            </div>
            <div className="relative z-10 flex h-12 shrink-0 items-center gap-0.5 rounded-2xl border border-slate-200 bg-white p-1 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <label className="sr-only" htmlFor="tess-ai-voice-select">Voix</label>
              <select id="tess-ai-voice-select" value={voiceName} onChange={event => { const value = event.target.value as typeof voiceName; setVoiceName(value); try { localStorage.setItem("tess-ai-voice", value); } catch { /* storage unavailable */ } }} className="h-9 max-w-[90px] rounded-xl bg-transparent px-1 text-[10px] font-medium text-slate-700 outline-none dark:text-slate-200">
                <option value="fr-CH-ArianeNeural">Ariane · FR</option><option value="fr-CH-FabriceNeural">Fabrice · FR</option>
              </select>
              <span className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" />
              {showClose && <button type="button" onClick={() => { stopVoice(); setVoiceOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10" aria-label="Retour au chat"><X className="h-4 w-4" /></button>}
            </div>
          </header>
          <div className="mx-auto mt-3 flex w-[calc(100%-2rem)] max-w-3xl items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex min-w-0 items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${voicePhaseTone} ${voiceState === "listening" ? "animate-pulse" : ""}`} /><span className="truncate font-medium text-slate-700 dark:text-slate-200">{voicePhaseLabel}</span></div>
            <span className="ml-3 shrink-0 text-[10px] text-slate-400">{voiceState === "listening" ? "Pause automatique" : voiceState === "speaking" ? "Touchez le micro pour couper" : "État synchronisé"}</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-4 sm:px-8">
            <div className="w-full max-w-3xl flex-1">
              <div className="mx-auto h-56 w-full max-w-sm sm:h-72"><VoiceAIOrb state={voiceState} level={voiceLevel} /></div>
              <div className="mx-auto mt-2 flex h-8 w-full max-w-[220px] items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 px-3 dark:border-white/10 dark:bg-white/[0.04]" aria-label="Niveau sonore du microphone" role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={voiceLevel}>
                {Array.from({ length: 18 }, (_, index) => {
                  const wave = 0.45 + Math.abs(Math.sin(index * 1.7)) * 0.55;
                  const height = Math.max(3, Math.round(4 + voiceLevel * 21 * wave));
                  return <span key={index} className={`w-1 rounded-full transition-[height,background-color] duration-75 ${voiceLevel > 0.08 ? "bg-cyan-500 dark:bg-cyan-300" : "bg-slate-300 dark:bg-slate-600"}`} style={{ height }} />;
                })}
              </div>
              <p className="mt-1 text-center text-base font-medium" aria-live="polite">{voiceState === "listening" ? "Je vous écoute…" : voiceState === "processing" ? voiceTask === "greeting" ? "Je prépare votre accueil vocal…" : voiceTask === "connecting" ? "J’active votre micro…" : voiceTask === "transcribing" ? "Je transcris votre demande…" : voiceTask === "thinking" ? "Je cherche une réponse…" : "Je prépare ma réponse…" : voiceState === "speaking" ? "Je vous réponds…" : voiceState === "paused" ? "Réponse en pause" : voiceState === "error" ? "Voix indisponible" : "Prêt à vous écouter"}</p>
              <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">Votre question suit le même contexte de cours et le même fil de discussion.</p>
              {(voiceTranscript || voiceResponseText) && <div className="mt-4 text-center"><button type="button" aria-expanded={showVoiceTranscript} onClick={() => setShowVoiceTranscript(value => !value)} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">{showVoiceTranscript ? "Masquer le texte de l’échange" : "Afficher le texte de l’échange"}</button></div>}
              {showVoiceTranscript && (voiceTranscript || voiceResponseText) && <div className="mt-3 space-y-3">
                {voiceTranscript && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vous avez dit</p>{voiceTranscript}</div>}
                {voiceResponseText && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 dark:border-blue-400/20 dark:bg-blue-500/[0.08]"><p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300"><AudioLines className="h-3.5 w-3.5" /> Réponse de TESS</p><AIMarkdown content={voiceResponseText} isStreaming={isStreaming} /></div>}
              </div>}
              {voiceError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200"><span className="min-w-0 flex-1">{voiceError}</span><button type="button" onClick={() => setVoiceError("")} aria-label="Fermer le message d’erreur vocal" className="shrink-0 rounded-md p-0.5 text-rose-700 transition hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-400/10"><X className="h-3.5 w-3.5" /></button></div>}
            </div>
            <div className="mt-5 flex shrink-0 items-center justify-center gap-5 pb-2">
              {voiceState === "listening" ? <button onClick={finishVoiceTurn} className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30" title="Terminer et envoyer votre message" aria-label="Terminer l'écoute et envoyer votre message"><Mic className="h-5 w-5" /></button> : <button onClick={beginVoiceCapture} disabled={voiceState === "processing"} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/30 disabled:opacity-40" title={voiceState === "speaking" ? "Interrompre et parler" : "Démarrer l’écoute"} aria-label={voiceState === "speaking" ? "Interrompre et parler" : "Démarrer l'écoute"}><Mic className="h-5 w-5" /></button>}
              {(voiceState === "speaking" || voiceState === "paused") && <button onClick={toggleVoicePause} className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white" aria-label={voicePaused ? "Reprendre" : "Mettre en pause"}>{voicePaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>}
              <button onClick={() => { stopVoice(); handleStop(); }} className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300" title="Interrompre la voix ou la réponse" aria-label="Interrompre"><Square className="h-4 w-4 fill-current" /></button>
            </div>
            <p className="mt-1 shrink-0 text-center text-[11px] text-slate-500 dark:text-slate-500">{voiceState === "listening" ? "Touchez le micro pour terminer et envoyer votre demande" : voiceState === "processing" ? voiceTask === "connecting" ? "Autorisez l’accès au micro si le navigateur le demande" : "Votre demande suit son traitement, étape par étape" : voiceState === "speaking" ? "Réponse vocale en cours · vous pouvez la mettre en pause" : voiceState === "error" ? "Vous pouvez réessayer ou revenir au chat écrit" : "Touchez le micro pour parler à TESS"}</p>
          </div>
        </section>
      ) : <>
      {/* Header */}
      {/* The header sits inside the panel wrapper (which is already relative).
          Keeping the header itself non-relative lets the conversation drawer
          use the complete panel height instead of being clipped to 68px. */}
      <header className="absolute inset-x-0 top-0 z-40 flex min-h-[78px] items-center gap-3 px-3 py-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] sm:px-4">
        {!persistentDesktopNavigation && !(desktopWorkspace && !isMobilePanel && !desktopNavOpen) && <button type="button" onClick={openOptions} aria-label="Ouvrir les réglages et l'historique" aria-expanded={optionsOpen} className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"><Menu className="h-5 w-5" /></button>}
        {navigationVisible && <>
          {optionsOpen && !persistentDesktopNavigation && <button type="button" aria-label="Fermer le panneau des conversations" onClick={() => setOptionsOpen(false)} className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" />}
          <div ref={optionsPanelRef} role="dialog" aria-label="Navigation de TESS" className={`absolute inset-y-0 left-0 z-[70] flex h-full w-[min(18rem,88vw)] max-w-full flex-col border-r border-slate-200 bg-white font-sans text-slate-800 shadow-2xl shadow-slate-950/25 animate-in slide-in-from-left duration-250 motion-reduce:animate-none dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 ${desktopNavigationVisible ? "md:fixed md:inset-y-0 md:left-0 md:h-[100dvh] md:w-[18rem] md:shadow-none md:transition-transform md:duration-300 md:ease-out" : ""} ${desktopNavClosing ? "md:-translate-x-full" : "md:translate-x-0"}`}>
            <div className="flex shrink-0 items-center gap-3 py-2.5 pl-5 pr-2 sm:py-3 sm:pl-7 sm:pr-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:ring-white/10"><img src="/ai_icon.jpg" alt="" className="h-7 w-7 object-contain" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold tracking-tight text-slate-950 dark:text-white">TESS</p></div>
              <div className="flex items-center gap-1"><button type="button" onClick={openSearch} aria-label="Rechercher dans les conversations" title="Rechercher" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"><Search className="h-4 w-4" /></button><button type="button" onClick={() => persistentDesktopNavigation ? closeDesktopNavigation() : setOptionsOpen(false)} aria-label="Fermer la navigation" title="Réduire la navigation" className="flex h-9 w-9 cursor-ew-resize items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"><PanelLeft className="h-4 w-4" /></button></div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3 pt-1.5">
              <div className="relative mb-2">
                <button ref={newChatButtonRef} type="button" onClick={startNewConversation} disabled={isStreaming} aria-current={isNewConversationActive ? "page" : undefined} className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13px] font-semibold transition disabled:opacity-50 ${isNewConversationActive ? "bg-slate-200 text-slate-900 dark:bg-white/[0.12] dark:text-white" : "bg-[#202020] text-white hover:bg-[#2d2d2d] dark:bg-[#2a2a2a] dark:hover:bg-[#333333]"}`}><SquarePen className="h-4 w-4" />Nouvelle conversation</button>
              </div>
              {newChatNotice && newChatNoticePosition && <div role="status" className="fixed z-[140] flex w-[min(260px,calc(100vw-24px))] items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-700 shadow-xl dark:border-white/15 dark:bg-[#242424] dark:text-slate-200" style={newChatNoticePosition}><span className="min-w-0 flex-1">Tu es déjà dans un nouveau chat. Ton brouillon est conservé.</span><button type="button" onClick={() => { setNewChatNotice(false); setNewChatNoticePosition(null); }} aria-label="Fermer le message" className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-3.5 w-3.5" /></button></div>}
              <nav aria-label="Navigation de l’assistant" className="space-y-0.5">
                {[
                  [ImageIcon, "Images", "/images"],
                  [BookOpen, "Bibliothèque", "/library"],
                  [Activity, "Opérations", "/operations"],
                  [ListTodo, "Tâches et missions", "/tasks"],
                  [Bell, "Rappels", "/reminders"],
                  [Brain, "Mémoire", "/memory"],
                ].map(([IconComponent, label, route]) => {
                  const NavIcon = IconComponent as typeof Settings;
                  const isActive = route !== "/" && (location.pathname === String(route) || location.pathname.startsWith(`${String(route)}/`));
                  return <button key={String(label)} type="button" onClick={() => { if (!isAuthenticated()) { requireAuth(route as string); return; } navigate(route as string); }} aria-current={isActive ? "page" : undefined} className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] font-medium leading-5 tracking-[0.005em] transition ${isActive ? "bg-slate-100 font-semibold text-slate-800 dark:bg-white/[0.10] dark:text-white" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/[0.06] dark:hover:text-white"}`}><NavIcon className="h-4 w-4 shrink-0" />{label as string}</button>;
                })}
              </nav>
              {(courseContextActive || pageDocCtx || livePageContext?.page_title) && <>
                <p className="mb-2 mt-5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Contexte actif</p>
              </>}
              {courseContextActive && analysisEnabled && (
                <label className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <BrainCircuit className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Périmètre d’analyse</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{String(livePageContext?.page_data?.course_title ?? livePageContext?.page_title ?? "Cours actif")}</span></span>
                  <select aria-label="Périmètre d’analyse du cours" value={analysisScope} onChange={event => setAnalysisScope(event.target.value as "section" | "course")} className="max-w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold dark:border-slate-600 dark:bg-slate-800">
                    <option value="section">Cette section</option><option value="course">Tout le cours</option>
                  </select>
                </label>
              )}
              {pageDocCtx && <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"><FileSearch className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" /><span className="min-w-0"><span className="block text-xs font-semibold">Document actif</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{pageDocCtx.title}</span></span></div>}
              {!courseContextActive && !pageDocCtx && livePageContext?.page_title && <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"><Sparkles className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" /><span className="min-w-0"><span className="block text-xs font-semibold">Page active</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{livePageContext.page_title}</span></span></div>}
              <div className="my-3" />
              <div className="mb-2 flex items-center justify-between px-2">
                <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-500 dark:text-white" /><p className="text-sm font-semibold text-slate-700 dark:text-white">Chats</p></div>
                <div className="flex items-center gap-0.5">
                  <HoverTooltip label="Nouveau chat"><button type="button" onClick={startNewConversation} disabled={isStreaming} aria-label="Nouveau chat" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"><SquarePen className="h-3.5 w-3.5" /></button></HoverTooltip>
                  <HoverTooltip label="Options des chats"><button type="button" aria-label="Options des chats" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"><MoreHorizontal className="h-4 w-4" /></button></HoverTooltip>
                </div>
              </div>
              {!isAuthenticated() ? (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">Connectez-vous pour retrouver vos conversations enregistrées.</p>
              ) : historyLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Chargement de l’historique…</div>
              ) : historyError ? (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-3 text-xs text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{historyError}</p>
              ) : visibleConversations.length ? (
                <ul className="space-y-1">{visibleConversations.map(conversation => (
                  <li key={conversation.id} className="group relative"><button type="button" disabled={isStreaming || openingConversationId !== null} onClick={() => void openConversation(conversation)} className={`flex min-h-12 w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 pr-16 text-left transition disabled:opacity-50 ${conversationId === conversation.id ? "bg-slate-100 text-slate-950 dark:bg-[#242424] dark:text-white" : "text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-white/[0.06]"}`}>
                    {openingConversationId === conversation.id ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-violet-500" /> : conversation.mode === "course" ? <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /> : conversation.mode === "document" ? <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /> : <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
                    <span className="min-w-0 flex-1 break-words text-sm font-medium leading-5 line-clamp-2">{conversation.title?.trim() && !["nouvelle conversation", "new conversation", "new chat"].includes(conversation.title.trim().toLocaleLowerCase()) ? conversation.title.trim() : `Conversation du ${new Date(conversation.created_at).toLocaleDateString()}`}</span>
                  </button><span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-lg bg-white/90 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 dark:bg-[#242424]"><button type="button" title="Épingler la conversation" aria-label="Épingler la conversation" onClick={event => { event.stopPropagation(); }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"><Pin className="h-3.5 w-3.5" /></button><button type="button" title="Options de la conversation" aria-label="Options de la conversation" onClick={event => { event.stopPropagation(); }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"><MoreHorizontal className="h-4 w-4" /></button></span></li>
                ))}</ul>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">Aucune conversation enregistrée ici pour le moment.</p>
              )}
            </div>
            <div className="relative shrink-0 px-2.5 pb-2 pt-2">
                <button type="button" aria-expanded={preferencesOpen} onClick={() => { setPreferencesOpen(value => !value); setLanguageSettingsOpen(false); setAppearanceOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white dark:hover:bg-white/10"><span>Préférences</span><ChevronRight className={`h-4 w-4 transition-transform ${preferencesOpen ? "rotate-90" : ""}`} /></button>
                {preferencesOpen && <div className="preferences-panel absolute bottom-[calc(100%-0.5rem)] left-0 z-[95] w-[min(260px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-800 shadow-2xl shadow-slate-950/20 dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-white md:fixed md:bottom-4 md:left-[18rem] md:ml-2">
                  <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/60">Préférences</p>
                  <button type="button" onClick={() => { setLanguageSettingsOpen(value => !value); setAppearanceOpen(false); }} aria-expanded={languageSettingsOpen} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/10"><Globe2 className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1"><span className="block">Langue</span><span className="block truncate text-[10px] text-slate-500 dark:text-white/60">{lang === "fr" ? "Français" : lang === "en" ? "English" : "Kiswahili"}</span></span><ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${languageSettingsOpen ? "rotate-90" : ""}`} /></button>{languageSettingsOpen && <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#171717]"><div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-[#242424]"><Search className="h-3.5 w-3.5 shrink-0 text-slate-400" /><input value={languageSearch} onChange={event => setLanguageSearch(event.target.value)} placeholder="Rechercher une langue" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400 dark:placeholder:text-white/40" /></div><div className="mt-2 space-y-0.5">{[{ value: "fr", label: "Français" }, { value: "en", label: "English" }, { value: "sw", label: "Kiswahili" }].filter(option => option.label.toLocaleLowerCase().includes(languageSearch.toLocaleLowerCase())).map(option => <button key={option.value} type="button" onClick={() => { setLang(option.value as "fr" | "en" | "sw"); setLanguageSettingsOpen(false); }} className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-slate-200 dark:hover:bg-white/10 ${lang === option.value ? "bg-slate-200 font-semibold dark:bg-white/10" : ""}`}>{option.label}</button>)}</div></div>}<button type="button" onClick={() => { setAppearanceOpen(value => !value); setLanguageSettingsOpen(false); }} aria-expanded={appearanceOpen} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/10"><Sun className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1"><span className="block">Apparence</span><span className="block truncate text-[10px] text-slate-500 dark:text-white/60">{theme === "system" ? "Système" : resolvedTheme === "dark" ? "Sombre" : "Clair"}</span></span><ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${appearanceOpen ? "rotate-90" : ""}`} /></button>{appearanceOpen && <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#171717]"><button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs hover:bg-slate-200 dark:hover:bg-white/10"><span>{resolvedTheme === "dark" ? "Mode nuit" : "Mode clair"}</span><span className="text-slate-500 dark:text-white/60">{resolvedTheme === "dark" ? "Sombre" : "Clair"}</span></button></div>}</div>}
              </div>
            {languagePanelOpen && <div aria-label="Paramètres de langue" className="fixed bottom-4 left-[calc(18rem+268px)] z-[96] hidden w-60 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl shadow-slate-950/20 md:block dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-white">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/60">Langue</p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#171717]"><Search className="h-3.5 w-3.5 shrink-0 text-slate-400" /><input value={languageSearch} onChange={event => setLanguageSearch(event.target.value)} placeholder="Rechercher une langue" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400 dark:placeholder:text-white/40" /></div>
              <div className="mt-2 space-y-0.5">{[{ value: "fr", label: "Français" }, { value: "en", label: "English" }, { value: "sw", label: "Kiswahili" }].filter(option => option.label.toLocaleLowerCase().includes(languageSearch.toLocaleLowerCase())).map(option => <button key={option.value} type="button" onClick={() => { setLang(option.value as "fr" | "en" | "sw"); setLanguageSettingsOpen(false); }} className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-white/10 ${lang === option.value ? "bg-slate-100 font-semibold dark:bg-white/10" : ""}`}>{option.label}{lang === option.value && <Check className="ml-auto h-3.5 w-3.5" />}</button>)}</div>
            </div>}
            {appearancePanelOpen && <div aria-label="Paramètres d’apparence" className="fixed bottom-4 left-[calc(18rem+268px)] z-[96] hidden w-60 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl shadow-slate-950/20 md:block dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-white">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/60">Apparence</p>
              {[{ value: "light", label: "Clair", icon: Sun }, { value: "dark", label: "Sombre", icon: Moon }, { value: "system", label: "Système", icon: Monitor }].map(({ value, label, icon: ThemeIcon }) => <button key={value} type="button" onClick={() => { setTheme(value as "light" | "dark" | "system"); setAppearanceOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${theme === value ? "bg-slate-100 font-semibold dark:bg-white/10" : "hover:bg-slate-100 dark:hover:bg-white/10"}`}><ThemeIcon className="h-3.5 w-3.5" />{label}{theme === value && <Check className="ml-auto h-3.5 w-3.5" />}</button>)}
            </div>}
            <div className="relative shrink-0 px-4 py-3">
              {profileMenuOpen && isAuthenticated() && <div className="absolute bottom-[calc(100%-0.5rem)] left-2 right-2 z-[100] rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-800 shadow-2xl shadow-slate-950/20 dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-white"><div className="flex items-center gap-2.5 px-2.5 py-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{(assistantUser?.full_name || assistantUser?.email || "T").slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{assistantUser?.full_name || assistantUser?.email || "Votre compte"}</span><span className="block text-[11px] text-slate-500 dark:text-white/60">Free</span></span><ChevronRight className="h-4 w-4" /></div><div className="my-2 border-t border-slate-200 dark:border-white/10" /><button type="button" onClick={() => navigate("/pricing")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Gift className="h-4 w-4" />Essayer Plus gratuitement</button><button type="button" onClick={() => { setProfileMenuOpen(false); setPreferencesOpen(true); setAppearanceOpen(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Sparkles className="h-4 w-4" />Personnalisation</button><button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/dashboard/ai/profile"); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><UserRound className="h-4 w-4" />Profil</button><button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/dashboard/ai/settings"); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><Settings className="h-4 w-4" />Paramètres</button><div className="my-2 border-t border-slate-200 dark:border-white/10" /><button type="button" onClick={() => navigate("/help")} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><span className="flex items-center gap-2.5"><CircleHelp className="h-4 w-4" />Aide</span><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => { setProfileMenuOpen(false); clearAuth(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/10"><LogOut className="h-4 w-4" />Se déconnecter</button></div>}
              <button type="button" onClick={() => isAuthenticated() ? setProfileMenuOpen(value => !value) : requireAuth("/")} aria-expanded={profileMenuOpen} className="flex w-full items-center gap-2.5 rounded-xl border border-slate-300 bg-slate-100 px-2.5 py-2 text-left transition hover:bg-slate-200 dark:border-[#3a3a3a] dark:bg-[#202020] dark:hover:bg-[#2d2d2d]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">{isAuthenticated() ? <UserRound className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-800 dark:text-white">{isAuthenticated() ? (assistantUser?.full_name || "Votre compte") : "Se connecter / Créer un compte"}</span><span className="block truncate text-[10px] text-slate-500 dark:text-white/70">{isAuthenticated() ? (assistantUser?.email || "Gérer votre profil") : "Synchroniser vos conversations"}</span></span><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="TESS est prêt" />
              </button>
            </div>
          </div>
        </>}
        <div className="ml-auto flex min-w-0 items-center gap-2">
        <div style={workspaceHubOpen && workspaceHubPosition ? { transform: `translateX(-${workspaceHubPosition.shift}px)` } : undefined} className="relative z-[120] flex h-12 shrink-0 items-center gap-0.5 rounded-2xl border border-slate-200 bg-white p-1 text-slate-600 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <HoverTooltip label="Rechercher dans les conversations"><button type="button" onClick={openSearch} aria-label="Rechercher dans les conversations" aria-expanded={searchOpen} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"><Search className="h-4 w-4" /></button></HoverTooltip>
          <HoverTooltip label="Nouvelle conversation"><button type="button" onClick={startNewConversation} disabled={isStreaming} aria-label="Nouvelle conversation" className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:flex"><SquarePen className="h-4 w-4" /></button></HoverTooltip>
          {showClose && <span className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" />}
          {showClose && <HoverTooltip label="Fermer le panneau IA"><button
            onClick={onClose}
            aria-label="Fermer le panneau IA"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button></HoverTooltip>}
        </div>
        <div
          ref={workspaceHubRef}
          style={workspaceHubPosition ? { top: workspaceHubPosition.top, right: workspaceHubPosition.right } : undefined}
          onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === "width" && !workspaceHubOpen) setWorkspaceHubPosition(null); }}
          className={`flex overflow-hidden border border-slate-200 bg-white text-slate-900 transition-[width,height,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none dark:border-slate-700 dark:bg-[#111827] dark:text-white ${workspaceHubPosition ? "fixed z-[110]" : "relative z-10"} ${workspaceHubOpen ? "h-[min(620px,calc(100dvh-32px))] w-[min(320px,calc(100vw-24px))] flex-col rounded-[18px] shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]" : "h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3 py-2 shadow-sm md:flex-none md:w-[220px]"}`}
        >
          {workspaceHubOpen ? <>
            <nav aria-label="Espaces TESS" className="min-h-0 flex-1 overflow-y-auto p-4 animate-in fade-in duration-200">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Vos espaces</p>
                <button type="button" onClick={() => setWorkspaceHubOpen(false)} aria-label="Fermer Explorer TESS" title="Fermer" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-col">
                {[
                  [Activity, "Opérations", "Suivez l’activité et les processus", "/operations"],
                  [Bot, "Agents", "Découvrez les assistants spécialisés", "/agents"],
                  [ListTodo, "Tâches", "Organisez vos missions et priorités", "/tasks"],
                  [Wrench, "Outils", "Gérez les outils disponibles", "/tools"],
                  [Clock3, "Rappels", "Planifiez les actions importantes", "/reminders"],
                  [Bell, "Suivis", "Gardez le fil de vos relances", "/follow-ups"],
                  [Brain, "Mémoire", "Retrouvez le contexte de TESS", "/memory"],
                  [ShieldCheck, "Sécurité", "Consultez les contrôles de sécurité", "/security"],
                  [Bell, "Notifications", "Consultez vos alertes", "/notifications"],
                  [Store, "Marketplace", "Parcourez les capacités déclarées", "/marketplace"],
                  [PlugZap, "Connexions", "Gérez les services associés", "/connections"],
                  [MapPin, "Ville", "Explorez le référentiel local", "/city"],
                  [LockKeyhole, "Opérateur", "Approbations et contrôles du runtime", "/operator"],
                  [Settings, "Préférences", "Personnalisez votre espace", "/"],
                ].map(([IconComponent, label, description, route]) => {
                  const WorkspaceIcon = IconComponent as typeof Bot;
                  return <button key={String(route)} type="button" onClick={() => { setWorkspaceHubOpen(false); if (!isAuthenticated()) { requireAuth(String(route)); return; } navigate(String(route)); }} className="group flex min-h-14 w-full items-center gap-3 border-b border-slate-100 px-2.5 py-2 text-left transition hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/[0.06] dark:hover:bg-blue-400/[0.08]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-white group-hover:text-blue-600 dark:bg-white/[0.08] dark:text-slate-200 dark:group-hover:bg-white/10 dark:group-hover:text-blue-300"><WorkspaceIcon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{label as string}</span><span className="mt-0.5 block truncate text-[10px] leading-4 text-slate-500 dark:text-slate-400">{description as string}</span></span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-300" />
                  </button>;
                })}
              </div>
            </nav>
          </> : <button type="button" onClick={() => { const rect = workspaceHubRef.current?.getBoundingClientRect(); if (rect) { const expandedWidth = Math.min(320, window.innerWidth - 24); const collapsedWidth = rect.width; setWorkspaceHubPosition({ top: rect.top, right: window.innerWidth - rect.right, shift: Math.max(0, expandedWidth - collapsedWidth), collapsedWidth }); } setWorkspaceHubOpen(true); }} aria-label="Ouvrir les espaces TESS" title="Explorer les espaces TESS" className="group flex h-full w-full min-w-0 items-center gap-2.5 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <img src="/ai_icon.jpg" alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200 dark:ring-slate-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">Explorer TESS</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </button>}
        </div>
        {workspaceHubPosition && <div aria-hidden="true" className="h-12 shrink-0" style={{ width: workspaceHubPosition.collapsedWidth }} />}
        </div>
      </header>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[78px] bg-gradient-to-b from-white/95 via-white/65 to-transparent dark:from-black/90 dark:via-black/50" />

      {searchOpen && <>
        <button type="button" aria-label="Fermer la recherche" onClick={() => setSearchOpen(false)} className="fixed inset-0 z-[80] bg-slate-950/55 backdrop-blur-sm transition-opacity" />
        <div ref={searchPanelRef} role="dialog" aria-modal="true" aria-label="Rechercher dans TESS" className="fixed inset-3 z-[85] flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white text-slate-900 shadow-[0_24px_100px_rgba(15,23,42,0.28)] sm:inset-6 md:left-1/2 md:right-auto md:top-1/2 md:h-[min(720px,calc(100dvh-48px))] md:w-[min(780px,calc(100vw-48px))] md:-translate-x-1/2 md:-translate-y-1/2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 sm:px-7 sm:py-5 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Search className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-600 dark:text-white">TESS</p><h2 className="truncate text-base font-semibold sm:text-lg">Rechercher dans vos échanges</h2></div>
            </div>
            <div className="flex items-center gap-2"><span className="hidden rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-400 sm:inline-flex">Échap</span><button type="button" onClick={() => setSearchOpen(false)} aria-label="Fermer la recherche" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"><X className="h-4 w-4" /></button></div>
          </div>
          <div className="border-b border-slate-200/80 px-5 py-5 sm:px-7 sm:py-6 dark:border-white/10">
            <label className="flex h-14 items-center gap-3 rounded-2xl border-2 border-blue-100 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-blue-400/20 dark:bg-white/[0.06] dark:focus-within:border-blue-400 dark:focus-within:bg-white/[0.08]">
              <Search className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Rechercher une conversation, un sujet…" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              {searchQuery ? <button type="button" onClick={() => setSearchQuery("")} aria-label="Effacer la recherche" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"><X className="h-4 w-4" /></button> : <span className="hidden rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-400 shadow-sm sm:inline-flex dark:bg-slate-800">⌘ K</span>}
            </label>
            <p className="mt-3 text-xs text-slate-400">Les résultats se mettent à jour automatiquement pendant votre saisie.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400"><Clock3 className="h-3.5 w-3.5" />{searchQuery.trim() ? "Résultats" : "Conversations récentes"}</div>
            {!isAuthenticated() ? <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">Connectez-vous pour rechercher vos conversations.</p>
              : searchLoading ? <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-12 text-sm text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-blue-500" />Recherche en cours…</div>
                : searchError ? <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-10 text-center text-sm text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">{searchError}</p>
                  : searchResults.length ? <ul className="space-y-2">{searchResults.map(conversation => <li key={conversation.id}><button type="button" disabled={openingConversationId !== null || isStreaming} onClick={() => { setSearchOpen(false); void openConversation(conversation); }} className="group flex min-h-[68px] w-full items-start gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/30 dark:hover:bg-blue-400/10"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"><MessageSquare className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{conversation.title?.trim() || "Conversation sans titre"}</span><span className="mt-1 block text-[11px] text-slate-400">{new Date(conversation.updated_at).toLocaleString()}</span>{conversation.matches?.map((match, index) => <span key={`${conversation.id}-match-${index}`} className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{match}</span>)}</span><span className="mt-2 hidden h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition group-hover:flex group-hover:bg-white group-hover:text-blue-600 dark:group-hover:bg-slate-800"><ArrowUp className="h-3.5 w-3.5 rotate-45" /></span></button></li>)}</ul>
                     : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center dark:border-white/10"><Search className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Aucune conversation trouvée</p><p className="mt-1 text-xs text-slate-400">Essayez un autre mot-clé ou une formulation plus courte.</p></div>}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/80 px-5 py-3 text-[11px] text-slate-400 sm:px-7 dark:border-white/10"><span>Appuyez sur <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-medium dark:border-white/10">Échap</kbd> pour fermer</span><span className="hidden sm:inline">Recherche sécurisée dans votre espace TESS</span></div>
        </div>
      </>}

      <MessageAudioPlayer
        {...messageAudio}
        onPlayPause={() => {
          if (messageAudio.isPlaying) {
            messageAudioWantedRef.current = false;
            messageAudioCurrentRef.current?.pause();
            setMessageAudio((current) => ({ ...current, isPlaying: false }));
          } else {
            messageAudioWantedRef.current = true;
            const current = messageAudioCurrentRef.current;
            const index = current ? messageAudioChunksRef.current.findIndex((chunk) => chunk.audio === current) : 0;
            playMessageAudioChunk(Math.max(0, index), current?.currentTime ?? 0);
          }
        }}
        onSeek={seekMessageAudio}
        onClose={() => stopMessageAudio()}
      />

      {/* Messages */}
      <div ref={messagesScrollRef} onScroll={handleMessagesScroll} className="relative min-h-0 w-full flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-4 pb-4 pt-[96px] dark:bg-[#171717]">
        {messages.length === 0 && !isStreaming && (pageDocCtx || (mode === "document" && contextCoursId) || (mode === "course" && contextCourse)) && (
          <div className="rounded-2xl border border-blue-100 bg-white p-4 dark:border-slate-800 dark:bg-[#131a25]">
            <div className="mb-2 flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${config.color}`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{config.title}</p>
            </div>

            {/* Document context badge — visible when a doc is open on DocumentAIPage */}
            {pageDocCtx && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-900/20">
                <FileSearch className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {pageDocCtx.title}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
                    Document ouvert · vous pouvez poser une question ou lancer une analyse complète
                  </p>
                </div>
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </span>
              </div>
            )}

            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {pageDocCtx
                ? `« ${pageDocCtx.title} » est ouvert. Je peux rechercher les passages utiles ou analyser le document complet à votre demande.`
                : mode === "document" && contextCoursId
                ? `Document chargé : « ${contextCourse ?? `Document #${contextCoursId}`} ». Je peux le résumer, générer des questions ou répondre à vos questions dessus.`
                : mode === "course" && contextCourse
                ? `Je suis votre tuteur pour le cours « ${contextCourse} ». Je connais votre progression et vos difficultés. Posez vos questions !`
                : "Le contexte actif est prêt. Posez votre question pour commencer."}
            </p>
            {pageDocCtx && (
              <button
                type="button"
                onClick={() => void sendMessage("Analyse le document complet ouvert. Résume sa structure, ses idées principales, ses notions importantes et les points à réviser. Cite les passages disponibles et signale toute limite d'extraction.")}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-[#111827] px-3 py-2 text-left text-xs font-semibold text-white transition hover:border-cyan-400/60 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <FileSearch className="h-4 w-4 text-cyan-300" />
                Analyser le document complet
              </button>
            )}
            {livePageContext?.current_page === "course-detail" && Number(livePageContext.page_data?.course_id) > 0 && (
              <button
                type="button"
                onClick={() => void sendMessage("Analyse complète du cours ouvert : présente une vue d'ensemble, explique les chapitres et notions importantes, repère les liens entre eux et signale les points à réviser en citant les chapitres sources.")}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111827] px-3 py-2 text-left text-xs font-semibold text-white shadow-sm transition hover:border-cyan-400/60 hover:bg-slate-900"
              >
                <BrainCircuit className="h-4 w-4 text-cyan-300" />
                Analyser tout le cours
                <span className="ml-1 text-[10px] font-normal text-slate-400">chapitres · notions · révision</span>
              </button>
            )}
          </div>
        )}

        {messages.map(msg => (
          <MsgBubble
            key={msg.id}
            msg={msg}
            isStreaming={isStreaming && msg.id === streamingId}
            longThinking={longThinkingByMessage[msg.id]}
            isEdited={editedMessageIds.has(msg.id)}
            activity={activityByMessage[msg.id]}
            attachment={attachmentByMessage[msg.id]}
            audioAttachment={audioByMessage[msg.id]}
            feedbackRating={feedbackByMessage[msg.id]}
            onCopy={(content) => void copyMessage(content)}
            onEdit={() => editMessage(msg)}
            onRetry={() => retryAssistantMessage(msg.id)}
            onSpeak={(content, messageId) => void handleMessageAudio(content, messageId)}
            onShare={(content) => void shareMessage(content)}
            onFeedback={(rating) => void submitMessageFeedback(msg.id, rating)}
          />
        ))}
        <div ref={messagesEndRef} />
        {showStreamJump && isStreaming && <button type="button" onClick={() => { followStreamRef.current = true; setShowStreamJump(false); messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: "smooth" }); }} aria-label="Revenir au dernier message" title="Revenir au dernier message" className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 flex-col items-center gap-0.5 rounded-full border border-slate-300 bg-white text-slate-800 shadow-lg transition hover:bg-slate-100 dark:border-white/20 dark:bg-[#242424] dark:text-white dark:hover:bg-[#303030]"><span className="flex items-center gap-0.5" aria-hidden="true"><span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:-300ms]" /><span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:-150ms]" /><span className="h-1 w-1 animate-pulse rounded-full bg-current" /></span><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button>}
      </div>

      {/* Input area */}
      <div className={`relative mx-auto w-full max-w-[760px] flex-shrink-0 border-t border-slate-200 bg-transparent px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-transparent dark:bg-transparent ${desktopWorkspace && !isMobilePanel && messages.length === 0 && !isStreaming ? "md:absolute md:left-1/2 md:top-1/2 md:z-30 md:-translate-x-1/2 md:-translate-y-1/2 md:border-t-0" : ""}`}>

        {attachedFile && <AttachmentCard
          file={attachedFile.file}
          type={attachedFile.type}
          preview={attachedFile.preview}
          uploading={false}
          readyLabel={attachedFile.type === "pdf" ? (attachedFile.base64 ? "Texte extrait · prêt" : "PDF joint") : "Prête à être analysée"}
          onRemove={() => {
            if (attachedFile.preview) URL.revokeObjectURL(attachedFile.preview);
            setAttachedFile(null);
          }}
        />}
        {attachmentError && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {attachmentError}
            <button type="button" onClick={() => setAttachmentError("")} className="ml-auto rounded p-0.5" aria-label="Fermer"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {voiceError && <div role="alert" className="mb-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"><span className="min-w-0 flex-1">{voiceError}</span><button type="button" onClick={() => setVoiceError("")} aria-label="Fermer le message d’erreur vocal" className="shrink-0 rounded-md p-0.5 text-rose-700 transition hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-400/10"><X className="h-3.5 w-3.5" /></button></div>}
        {/* AI Composer: the text editor, mode, command palette and audio action stay in one stable contract. */}
        <AIComposer
          value={input}
          onChange={setInput}
          onSubmit={value => void sendMessage(value)}
          disabled={false}
          isStreaming={isStreaming}
          onStop={handleStop}
          inputRef={inputRef}
          mode={composerMode}
          onModeChange={nextMode => { setComposerMode(nextMode); setLongThinking(nextMode === "reflect"); }}
          alertMode={alertMode}
          onToggleAlertMode={() => setAlertMode(value => !value)}
          interactionActive={Boolean(attachedFile)}
          placeholder={attachedFile ? "Posez une question sur ce fichier…" : config.placeholder}
          onAudioRecorded={handleComposerAudio}
          resources={composerResources}
          prefixActions={<>
            <ComposerPlusMenu
              disabled={isStreaming}
              onChooseImage={() => imageInputRef.current?.click()}
              onChooseCamera={() => cameraInputRef.current?.click()}
              onChooseDocument={() => documentInputRef.current?.click()}
              mode={composerMode}
              onModeChange={nextMode => { setComposerMode(nextMode); setLongThinking(nextMode === "reflect"); }}
              alertMode={alertMode}
            />
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <input type="file" ref={documentInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
          </>}
        />
        {desktopWorkspace && mode === "assistant" && messages.length === 0 && !isStreaming && !input.trim() && <div className="mt-4 hidden space-y-1 md:block" aria-label="Suggestions pour commencer">
          {starterPrompts.filter(({ text }) => !dismissedStarterPrompts.includes(text)).map(({ icon: PromptIcon, text, color }) => <div key={text} className="group flex min-h-10 w-full items-center rounded-xl transition hover:bg-white hover:shadow-sm dark:hover:bg-white/[0.06]">
            <button type="button" onClick={() => { setInput(text); requestAnimationFrame(() => inputRef.current?.focus()); }} className="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left text-[13px] text-slate-700 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-200 dark:hover:text-white">
              <PromptIcon className={`h-5 w-5 shrink-0 ${color}`} />
              <span className="truncate">{text}</span>
            </button>
            <button type="button" onClick={() => setDismissedStarterPrompts(current => [...current, text])} aria-label={`Masquer la suggestion : ${text}`} title="Masquer cette suggestion" className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/10 dark:hover:text-white"><X className="h-3 w-3" /></button>
          </div>)}
        </div>}
      </div>
      </>}
    </>
  );

  const renderedPanel = isMobilePanel ? <MobileAssistantShell
    hasMessages={showClose ? messages.length > 0 || isStreaming : true}
    input={input}
    isStreaming={isStreaming}
    longThinking={longThinking}
    onInputChange={setInput}
    onSend={(value) => void sendMessage(value ?? input)}
    onNewConversation={startNewConversation}
    mode={composerMode}
    onModeChange={(nextMode) => { setComposerMode(nextMode); setLongThinking(nextMode === "reflect"); }}
    alertMode={alertMode}
    onToggleAlertMode={() => setAlertMode(value => !value)}
    interactionActive={Boolean(attachedFile)}
    onClosePanel={onClose}
    showClose={showClose}
    expanded={expanded}
    conversation={mobileConversation}
    composerExtras={mobileComposerExtras}
    historyContent={mobileHistory}
    conversationTitle={headerConversationTitle}
    onAudioRecorded={handleComposerAudio}
    onAudioError={setVoiceError}
    resources={composerResources}
    onOpenConversation={(conversation) => void openConversation(conversation)}
    onAuthRequired={requireAuth}
    audioPlayer={messageAudio.visible ? <MessageAudioPlayer
      {...messageAudio}
      onPlayPause={() => messageAudio.isPlaying ? (messageAudioCurrentRef.current?.pause(), setMessageAudio(current => ({ ...current, isPlaying: false }))) : playMessageAudioChunk(0)}
      onSeek={seekMessageAudio}
      onClose={() => stopMessageAudio()}
      /> : null}
  /> : panelInner;

  if (push) {
    return (
      <aside className={`relative flex h-full min-h-0 min-w-0 w-full flex-col bg-slate-50 transition-[padding] duration-300 ease-out dark:bg-[#0f1219] ${workspaceNavigationOffset}`} style={panelViewportStyle}>
        {desktopWorkspace && !isMobilePanel && !desktopNavOpen && <aside aria-label="Navigation réduite de TESS AI" className="fixed inset-y-0 left-0 z-[75] hidden w-[4.75rem] flex-col items-center border-r border-slate-200 bg-white py-4 shadow-[4px_0_18px_rgba(15,23,42,0.05)] md:flex dark:border-slate-700 dark:bg-[#111827]">
          <CollapsedNavTooltip label="Ouvrir la navigation"><button type="button" onClick={openDesktopNavigation} aria-label="Ouvrir la navigation" className="flex h-10 w-10 cursor-ew-resize items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><PanelLeft className="h-4 w-4" /></button></CollapsedNavTooltip>
          <div className="mt-2"><CollapsedNavTooltip label="Nouvelle conversation"><button type="button" onClick={startNewConversation} disabled={isStreaming} aria-label="Nouvelle conversation" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-blue-200"><SquarePen className="h-4 w-4" /></button></CollapsedNavTooltip></div>
          <div className="mt-4 flex w-full flex-col items-center gap-1 border-t border-slate-200 pt-4 dark:border-slate-700">
            {[
              [ImageIcon, "Images", "/images"],
              [BookOpen, "Bibliothèque", "/library"],
              [Activity, "Opérations", "/operations"],
              [ListTodo, "Tâches et missions", "/tasks"],
              [Bell, "Rappels", "/reminders"],
              [Brain, "Mémoire", "/memory"],
            ].map(([IconComponent, label, route]) => {
              const NavIcon = IconComponent as typeof Settings;
              return <CollapsedNavTooltip key={String(label)} label={String(label)}><button type="button" onClick={() => { if (!isAuthenticated()) { requireAuth(route as string); return; } navigate(route as string); }} aria-label={String(label)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-blue-200"><NavIcon className="h-4 w-4" /></button></CollapsedNavTooltip>;
            })}
          </div>
          <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-700"><CollapsedNavTooltip label="Compte TESS AI"><button type="button" onClick={() => isAuthenticated() ? navigate("/") : requireAuth("/")} aria-label="Compte TESS AI" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><UserRound className="h-4 w-4" /></button></CollapsedNavTooltip></div>
        </aside>}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {renderedPanel}
          {authRequiredRoute && <AuthRequiredDialog
            redirectTo={authRequiredRoute}
            onClose={() => setAuthRequiredRoute(null)}
            onOpenAuth={(authMode, redirectTo) => {
              setAuthRequiredRoute(null);
              navigate(`/login?redirect=${encodeURIComponent(redirectTo)}&mode=${authMode}`);
            }}
          />}
        </div>
      </aside>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 hidden bg-black/30 backdrop-blur-sm sm:block" onClick={onClose} aria-hidden />
      <aside className={`fixed z-50 flex min-h-0 flex-col bg-white shadow-2xl dark:bg-[#0f1219] animate-in slide-in-from-left duration-300 motion-reduce:animate-none ${expanded ? "inset-0 h-[100dvh] w-auto rounded-none border-0" : "inset-0 h-full w-full sm:inset-y-0 sm:right-auto sm:left-0 sm:w-[min(26rem,92vw)] sm:border-r sm:border-slate-200 dark:sm:border-slate-800"}`} style={panelViewportStyle}>
        <div className="relative flex min-h-0 flex-1 flex-col">{renderedPanel}</div>
      </aside>
    </>
  );
}
