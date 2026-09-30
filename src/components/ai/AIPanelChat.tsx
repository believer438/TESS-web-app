// Copie Zentrix Academy : src/components/ai/AIPanelChat.tsx
import { useRef, useEffect, useState, useCallback } from "react";
import type { TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  X, Sparkles, Bot, Plus, FileSearch, Brain, Menu, Phone, Loader2, MessageSquare, BookOpen,
  ArrowUp, Square, Copy, Pencil, RotateCcw, BrainCircuit, Image as ImageIcon, Check,
  Mic, Maximize2, Minimize2, Pause, Play, AudioLines, Share2, Volume2, BookOpenText, Search,
} from "lucide-react";
import { type AIActivitySource, type AIActivityStep, type AIMessage } from "@/lib/backend-types";
import {
  apiAIChatStream,
  apiUploadCours,
  apiErrorMessage,
  isAuthenticated,
  apiAIVoiceTranscribe,
  apiAIVoiceSynthesizeStream,
  apiGetConversations,
  apiGetConversationMessages,
  type AIConversation as StoredAIConversation,
} from "@/lib/api-client";
import { getPageContext, type PageContextData } from "@/hooks/usePageContext";
import AIMarkdown from "@/components/ai/AIMarkdown";
import AIActivity from "@/components/ai/AIActivity";
import AttachmentCard from "@/components/ai/AttachmentCard";
import ComposerPlusMenu from "@/components/ai/ComposerPlusMenu";
import VoiceAIOrb, { type VoiceOrbState } from "@/components/ai/VoiceAIOrb";
import MobileAssistantShell from "@/components/ai/MobileAssistantShell";
import MessageAudioPlayer, { type MessageAudioPlayerState } from "@/components/ai/MessageAudioPlayer";

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

// ── Guest-mode: track turns for friendly login nudge ─────────────────────────
// Nudge shown on the 3rd response, then every 5th response after (no hard limit).
const GUEST_TURN_KEY = "zentrix_ai_guest_turns";
const getGuestTurns  = () => parseInt(localStorage.getItem(GUEST_TURN_KEY) ?? "0", 10);
const incrGuestTurns = () => {
  const n = getGuestTurns() + 1;
  localStorage.setItem(GUEST_TURN_KEY, String(n));
  return n;
};
const shouldNudge = (turn: number) => turn === 3 || (turn > 3 && (turn - 3) % 5 === 0);

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
  onExpandedChange?: (expanded: boolean) => void;
  initialConversationId?: number | null;
  routeConversations?: boolean;
  conversationRouteBase?: string;
  conversationRouteState?: unknown;
  openChatToken?: number;
}

const MODE_CONFIG: Record<AIMode, {
  title:       string;
  icon:        typeof Bot;
  color:       string;
  placeholder: string;
}> = {
  assistant: {
    title:       "TESS AI",
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

function MsgBubble({ msg, isStreaming, longThinking, isEdited, activity, attachment, onCopy, onRetry, onEdit, onSpeak, onShare }: {
  msg: AIMessage; isStreaming?: boolean; longThinking?: boolean; isEdited?: boolean;
  activity?: MessageActivity;
  attachment?: MessageAttachment;
  onCopy: (content: string) => void; onRetry: () => void; onEdit: () => void;
  onSpeak: (content: string, messageId: string) => void; onShare: (content: string) => void;
}) {
  const isUser = msg.role === "user";
  const showThinking = !isUser && isStreaming && !msg.content;
  const [mobileMenu, setMobileMenu] = useState<{ x: number; y: number } | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
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
    return <div className="flex w-full flex-col items-start py-1 pl-1">
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
    <div className={`group flex w-full flex-col ${isUser ? "items-end" : "items-start"}`} onTouchStart={isUser ? beginLongPress : undefined} onTouchMove={isUser ? moveLongPress : undefined} onTouchEnd={isUser ? clearPress : undefined} onTouchCancel={isUser ? clearPress : undefined} onContextMenu={event => {
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
              </>}
            </div>
          </>, document.body)}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
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
  onExpandedChange,
  initialConversationId = null,
  routeConversations = false,
  conversationRouteBase = "/dashboard",
  conversationRouteState,
  openChatToken = 0,
}: AIPanelChatProps) {
  const navigate = useNavigate();
  const wasPanelOpenRef = useRef(isOpen);
  const [messages,        setMessages]        = useState<AIMessage[]>([]);
  const [input,           setInput]           = useState("");
  const [isStreaming,     setIsStreaming]      = useState(false);
  const [activityByMessage, setActivityByMessage] = useState<Record<string, MessageActivity>>({});
  const [longThinkingByMessage, setLongThinkingByMessage] = useState<Record<string, boolean>>({});
  const [attachmentByMessage, setAttachmentByMessage] = useState<Record<string, MessageAttachment>>({});
  const [longThinking,    setLongThinking]    = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [analysisScope,   setAnalysisScope]   = useState<"section" | "course">("section");
  const [streamingId,     setStreamingId]     = useState<string | null>(null);
  const [conversationId,  setConversationId]  = useState<number | null>(null);
  const [conversationTitle, setConversationTitle] = useState("");
  const [attachedFile,    setAttachedFile]    = useState<AttachedFile | null>(null);
  const [uploadingPdf,    setUploadingPdf]    = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessageIds, setEditedMessageIds] = useState<Set<string>>(() => new Set());
  const [livePageContext, setLivePageContext] = useState<PageContextData | null>(() => getPageContext());
  const [visualViewportHeight, setVisualViewportHeight] = useState<number>(() => typeof window === "undefined" ? 0 : window.innerHeight);
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = push ? isExpanded : localExpanded;
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
    try { return localStorage.getItem("zentrix-ai-voice") === "fr-CH-FabriceNeural" ? "fr-CH-FabriceNeural" : "fr-CH-ArianeNeural"; } catch { return "fr-CH-ArianeNeural"; }
  });
  const [voicePaused, setVoicePaused] = useState(false);
  const [messageAudio, setMessageAudio] = useState<MessageAudioPlayerState>({
    visible: false, title: "", isPlaying: false, isLoading: false, isStreaming: false,
    currentTime: 0, totalDuration: 0, generatedChunks: 0, totalChunks: null, waveform: [], error: "",
  });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [conversations, setConversations] = useState<StoredAIConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [openingConversationId, setOpeningConversationId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StoredAIConversation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const optionsPanelRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

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
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchPanelRef.current?.contains(event.target)) setSearchOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);

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
    window.addEventListener("zentrix-page-context", sync);
    return () => window.removeEventListener("zentrix-page-context", sync);
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

  useEffect(() => {
    const collapseOnMobile = () => {
      if (window.innerWidth < 768) setLocalExpanded(false);
    };
    window.addEventListener("resize", collapseOnMobile);
    return () => window.removeEventListener("resize", collapseOnMobile);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
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
      // Once TESS starts writing, keep the viewport where the user left it.
      // The jump control lets the user follow the stream deliberately.
      followStreamRef.current = false;
      setShowStreamJump(true);
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
  const startNewConversation = useCallback(() => {
    handleStop();
    setMessages([]);
    setInput("");
    setConversationId(null);
    setConversationTitle("");
    setActivityByMessage({});
    setLongThinkingByMessage({});
    setAttachmentByMessage({});
    setAnalysisEnabled(false);
    setAttachedFile(null);
    setOptionsOpen(false);
    if (routeConversations) navigate(`${conversationRouteBase}/ai`, { replace: true });
  }, [conversationRouteBase, handleStop, navigate, routeConversations]);

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

  const openSearch = useCallback(() => {
    setSearchOpen(value => !value);
    setOptionsOpen(false);
    setSearchError("");
  }, []);

  useEffect(() => {
    if (!searchOpen || !isAuthenticated()) return;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError("");
      void apiGetConversations(searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchError("La recherche des conversations est indisponible."))
        .finally(() => setSearchLoading(false));
    }, searchQuery.trim() ? 260 : 0);
    return () => window.clearTimeout(timer);
  }, [searchOpen, searchQuery]);

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
      if (!isAuthenticated()) {
        setAttachedFile({ file, type: "pdf" });
        return;
      }
      setAttachedFile({ file, type: "pdf" });
      setUploadingPdf(true);
      try {
        const res    = await apiUploadCours(file.name.replace(/\.pdf$/i, ""), file);
        const coursId = res.cours.id;
        const sysMsg: AIMessage = {
          id:        `sys-${Date.now()}`,
          role:      "assistant",
          content:   `📄 **Document chargé :** *${file.name}*\n\nJe peux maintenant répondre à vos questions sur ce document. Que voulez-vous savoir ?`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, sysMsg]);
        setAttachedFile({ file, type: "pdf", base64: String(coursId), mimeType: "pdf" });
      } catch {
        setAttachedFile(null);
        setAttachmentError("Le PDF n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.");
      } finally {
        setUploadingPdf(false);
      }
    } else if (file.type.startsWith("audio/")) {
      setAttachmentError("Les messages audio ne sont pas encore transcrits par Zentrix. Ajoutez une image ou un PDF, ou écrivez votre question.");
    } else {
      setAttachmentError("Format non pris en charge. Vous pouvez joindre une image ou un PDF.");
    }
  }, []);

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

  const editMessage = useCallback((message: AIMessage) => {
    setInput(message.content);
    setEditingMessageId(message.id);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: "nearest" });
    });
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────── 
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedFile) || isStreaming) return;
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
      const pageCtx      = getPageContext();
      const pageData     = pageCtx?.page_data ?? {};
      const pageCourseId = Number(pageData.course_id);
      const pageChapterId = Number(pageData.chapter_id);
      const selectedText = (typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "") ?? "";
      if (pageCtx && selectedText) {
        pageCtx.page_data = { ...pageCtx.page_data, selected_text: selectedText };
      }

      let iaPrefs = { defaultLevel: "intermediaire", responseLanguage: "fr", proactiveHints: true };
      try {
        const raw = localStorage.getItem("zentrix-ia-prefs");
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
        },
        signal:       controller.signal,
        image_base64: imageB64,
        image_type:   imageMime,
        longThinking,
        analysisMode: analysisEnabled && courseAnalysisAvailable,
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

      // ── Guest login nudge — shown on 1st response and every 5th after ─────
      if (!isAuthenticated() && !controller.signal.aborted) {
        const turn = incrGuestTurns();
        if (shouldNudge(turn)) {
          const nudge =
            "\n\n---\n**Conseil :** Vous pouvez vous connecter pour une expérience personnalisée — " +
            "il suffit de votre **nom, email et mot de passe**. " +
            "[Se connecter à Zentrix](/login?redirect=%2Fdashboard) pour mémoriser votre progression et vos difficultés !*";
          tokenBufferRef.current += nudge;
          if (!rafRef.current) rafRef.current = requestAnimationFrame(drainBuffer);
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
        drainFrameAtRef.current = null;
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
    }
  }, [
    attachedFile, isStreaming, messages, mode,
    conversationId, contextCoursId, contextCourseId, contextChapterId, longThinking, analysisScope, analysisEnabled, courseAnalysisAvailable, drainBuffer,
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
    const greetings = [
      "Bonjour, je suis TESS. Que puis-je faire pour vous aujourd’hui ?",
      "Bonjour ! Je vous écoute. Sur quoi souhaitez-vous avancer ?",
      "Salut ! Content de vous retrouver. Comment puis-je vous aider ?",
      "Bonjour, prêt à vous accompagner. Quelle est votre question ?",
    ];
    await speakReply(greetings[Math.floor(Math.random() * greetings.length)]);
    setVoiceTask(null);
    // After the spoken greeting, start listening for this voice-call session.
    // Mic permission errors are surfaced by startVoiceRecording with a retry path.
    if (!stopVoiceRef.current && !voiceSynthesisFailedRef.current) await startVoiceRecording();
  }, [handleStop, isStreaming, speakReply, startVoiceRecording, stopVoice]);

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
  const isMobilePanel = typeof window !== "undefined" && window.innerWidth < 768;
  const panelViewportStyle = isMobilePanel && visualViewportHeight
    ? { height: `${visualViewportHeight}px` }
    : undefined;

  const mobileConversation = <div className="space-y-4">{messages.map(msg => <MsgBubble
    key={msg.id}
    msg={msg}
    isStreaming={isStreaming && msg.id === streamingId}
    longThinking={longThinkingByMessage[msg.id]}
    isEdited={editedMessageIds.has(msg.id)}
    activity={activityByMessage[msg.id]}
    attachment={attachmentByMessage[msg.id]}
    onCopy={(content) => void copyMessage(content)}
    onEdit={() => editMessage(msg)}
    onRetry={() => retryAssistantMessage(msg.id)}
    onSpeak={(content, messageId) => void handleMessageAudio(content, messageId)}
    onShare={(content) => void shareMessage(content)}
  />)}<div ref={messagesEndRef} aria-hidden="true" /></div>;

  const mobileComposerExtras = <>
    <ComposerPlusMenu
      disabled={isStreaming || uploadingPdf}
      longThinking={longThinking}
      onChooseImage={() => imageInputRef.current?.click()}
      onChooseCamera={() => cameraInputRef.current?.click()}
      onChooseDocument={() => documentInputRef.current?.click()}
      onToggleLongThinking={() => setLongThinking(value => !value)}
    />
    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
    <input type="file" ref={documentInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
  </>;

  const mobileHistory = historyLoading ? <p className="px-3 py-3 text-[10px] text-[#6c85ad] dark:text-slate-400">Chargement de l’historique…</p> : historyError ? <p role="alert" className="px-3 py-3 text-[10px] text-rose-600 dark:text-rose-300">{historyError}</p> : visibleConversations.length ? <div className="space-y-1">{visibleConversations.slice(0, 8).map(conversation => <button key={conversation.id} type="button" disabled={isStreaming || openingConversationId !== null} onClick={() => void openConversation(conversation)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] transition disabled:opacity-50 ${conversationId === conversation.id ? "bg-[#eef5ff] text-[#146bff] dark:bg-blue-400/10 dark:text-blue-300" : "text-[#17366c] hover:bg-[#f5f8fd] dark:text-slate-300 dark:hover:bg-white/10"}`}><MessageSquare className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{conversation.title?.trim() || `Conversation du ${new Date(conversation.created_at).toLocaleDateString()}`}</span></button>)}</div> : <p className="px-3 py-3 text-[10px] text-[#6c85ad] dark:text-slate-400">Aucune conversation récente.</p>;

  // ── Panel body ────────────────────────────────────────────────────────────────
  const panelInner = (
    <>
      {voiceOpen ? (
        <section className="flex min-h-0 flex-1 flex-col bg-white text-slate-900 dark:bg-black dark:text-slate-100">
          <header className="relative z-40 flex min-h-[78px] shrink-0 items-center gap-3 px-3 py-3.5 sm:px-4">
            <button type="button" onClick={openOptions} aria-label="Ouvrir les réglages et l'historique" aria-expanded={optionsOpen} className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Menu className="h-5 w-5" /></button>
            <div className="relative z-10 flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <img src="/ai_icon.jpg" alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1" />
              <div className="min-w-0"><p className="truncate font-semibold">TESS AI</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">Voix · {contextCourse ? contextCourse : "Tuteur pédagogique"}</p></div>
            </div>
            <div className="relative z-10 flex h-12 shrink-0 items-center gap-0.5 rounded-2xl border border-slate-200 bg-white p-1 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <label className="sr-only" htmlFor="zentrix-voice-select">Voix</label>
              <select id="zentrix-voice-select" value={voiceName} onChange={event => { const value = event.target.value as typeof voiceName; setVoiceName(value); try { localStorage.setItem("zentrix-ai-voice", value); } catch { /* storage unavailable */ } }} className="h-9 max-w-[90px] rounded-xl bg-transparent px-1 text-[10px] font-medium text-slate-700 outline-none dark:text-slate-200">
                <option value="fr-CH-ArianeNeural">Ariane · FR</option><option value="fr-CH-FabriceNeural">Fabrice · FR</option>
              </select>
              <span className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" />
              <button type="button" onClick={() => { stopVoice(); setVoiceOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10" aria-label="Retour au chat"><X className="h-4 w-4" /></button>
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
                {voiceResponseText && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 dark:border-blue-400/20 dark:bg-blue-500/[0.08]"><p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300"><AudioLines className="h-3.5 w-3.5" /> Réponse de TESS AI</p><AIMarkdown content={voiceResponseText} isStreaming={isStreaming} /></div>}
              </div>}
              {voiceError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">{voiceError}</div>}
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
        <button type="button" onClick={openOptions} aria-label="Ouvrir les réglages et l'historique" aria-expanded={optionsOpen} className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Menu className="h-5 w-5" /></button>
        {optionsOpen && <>
          <button type="button" aria-label="Fermer le panneau des conversations" onClick={() => setOptionsOpen(false)} className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" />
          <div ref={optionsPanelRef} role="dialog" aria-label="Conversations de TESS AI" className="absolute inset-y-0 left-0 z-[70] flex h-full w-[min(18rem,88vw)] max-w-full flex-col border-r border-slate-200 bg-white text-slate-800 shadow-2xl shadow-slate-950/25 animate-in slide-in-from-left duration-250 motion-reduce:animate-none dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))] dark:border-white/10">
              <div><p className="text-base font-semibold">TESS AI</p><p className="text-xs text-slate-500 dark:text-slate-400">Conversations</p></div>
              <button type="button" onClick={() => setOptionsOpen(false)} aria-label="Fermer le panneau" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <button type="button" onClick={startNewConversation} disabled={isStreaming} className="mb-5 flex min-h-11 w-full items-center gap-2.5 rounded-xl bg-slate-100 px-3 text-left text-sm font-medium transition hover:bg-slate-200 disabled:opacity-50 dark:bg-white/[0.07] dark:hover:bg-white/[0.11]"><Plus className="h-5 w-5" />Nouvelle conversation</button>
              {(courseContextActive || pageDocCtx || livePageContext?.page_title) && <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Sur cette page</p>}
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
              <div className="my-3 border-t border-slate-200 dark:border-white/10" />
              <div className="mb-2 flex items-center gap-2 px-2"><MessageSquare className="h-4 w-4 text-slate-500" /><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Chats</p></div>
              {!isAuthenticated() ? (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">Connectez-vous pour retrouver vos conversations enregistrées.</p>
              ) : historyLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Chargement de l’historique…</div>
              ) : historyError ? (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-3 text-xs text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{historyError}</p>
              ) : visibleConversations.length ? (
                <ul className="space-y-1">{visibleConversations.map(conversation => (
                  <li key={conversation.id}><button type="button" disabled={isStreaming || openingConversationId !== null} onClick={() => void openConversation(conversation)} className={`flex min-h-12 w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition disabled:opacity-50 ${conversationId === conversation.id ? "bg-slate-100 text-slate-950 dark:bg-white/[0.1] dark:text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"}`}>
                    {openingConversationId === conversation.id ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-violet-500" /> : conversation.mode === "course" ? <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /> : conversation.mode === "document" ? <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /> : <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
                    <span className="min-w-0 flex-1 break-words text-sm font-medium leading-5 line-clamp-2">{conversation.title?.trim() && !["nouvelle conversation", "new conversation", "new chat"].includes(conversation.title.trim().toLocaleLowerCase()) ? conversation.title.trim() : `Conversation du ${new Date(conversation.created_at).toLocaleDateString()}`}</span>
                  </button></li>
                ))}</ul>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">Aucune conversation enregistrée ici pour le moment.</p>
              )}
            </div>
          </div>
        </>}
        <div className="relative z-10 flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <img src="/ai_icon.jpg" alt="TESS AI" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200 dark:ring-slate-600" />
          <div className="min-w-0 text-left"><p className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">TESS AI</p><p title={headerConversationTitle} className="line-clamp-1 break-words text-[10px] leading-4 text-slate-500 dark:text-slate-400">{headerConversationTitle || "Assistant pédagogique"}</p></div>
        </div>
        <div className="relative z-10 flex h-12 shrink-0 items-center gap-0.5 rounded-2xl border border-slate-200 bg-white p-1 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <button type="button" onClick={() => push ? onExpandedChange?.(!expanded) : setLocalExpanded(value => !value)} title={expanded ? "Réduire le panneau" : "Agrandir le panneau"} aria-label={expanded ? "Réduire le panneau IA" : "Agrandir le panneau IA"} className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white md:flex">{expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
          <button type="button" onClick={startNewConversation} disabled={isStreaming} title="Nouvelle conversation" aria-label="Nouvelle conversation" className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:flex"><Plus className="h-4 w-4" /></button>
          <button type="button" onClick={openSearch} title="Rechercher dans les conversations" aria-label="Rechercher dans les conversations" aria-expanded={searchOpen} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"><Search className="h-4 w-4" /></button>
          <span className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" />
          <button
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer le panneau IA"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[78px] bg-gradient-to-b from-white/95 via-white/65 to-transparent dark:from-black/90 dark:via-black/50" />

      {searchOpen && <><button type="button" aria-label="Fermer la recherche" onClick={() => setSearchOpen(false)} className="fixed inset-0 z-[50] bg-slate-950/35" /><div ref={searchPanelRef} role="dialog" aria-label="Rechercher une conversation" className="fixed left-1/2 top-[88px] z-[55] flex aspect-square w-[min(30rem,calc(100vw-2rem),calc(100dvh-7rem))] -translate-x-1/2 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.06]">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Rechercher une conversation…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Effacer la recherche" className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>}
        </div>
        <div className="min-h-0 overflow-y-auto pt-3">
          {!isAuthenticated() ? <p className="px-2 py-5 text-center text-sm text-slate-500 dark:text-slate-400">Connectez-vous pour rechercher vos conversations.</p>
            : searchLoading ? <div className="flex items-center justify-center gap-2 px-2 py-6 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Recherche en cours…</div>
              : searchError ? <p role="alert" className="px-2 py-5 text-center text-sm text-rose-600 dark:text-rose-300">{searchError}</p>
                : searchResults.length ? <ul className="space-y-1">{searchResults.map(conversation => <li key={conversation.id}><button type="button" disabled={openingConversationId !== null || isStreaming} onClick={() => { setSearchOpen(false); void openConversation(conversation); }} className="flex min-h-12 w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/[0.08]"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{conversation.title?.trim() || "Conversation sans titre"}</span><span className="mt-0.5 block text-[11px] text-slate-400">{new Date(conversation.updated_at).toLocaleString()}</span>{conversation.matches?.map((match, index) => <span key={`${conversation.id}-match-${index}`} className="mt-1 block line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{match}</span>)}</span></button></li>)}</ul>
                  : <p className="px-2 py-5 text-center text-sm text-slate-500 dark:text-slate-400">Aucune conversation trouvée.</p>}
        </div>
      </div></>}

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
      <div ref={messagesScrollRef} onScroll={handleMessagesScroll} className="relative min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-4 pb-4 pt-[96px] dark:bg-black">
        {messages.length === 0 && !isStreaming && (
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
                : "Bonjour ! Je suis TESS, votre tuteur pédagogique. Posez-moi vos questions : je peux vous aider à apprendre, réviser et progresser avec les ressources auxquelles j’ai accès. Vous pouvez aussi joindre une image ou un PDF avec le bouton +."}
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
            onCopy={(content) => void copyMessage(content)}
            onEdit={() => editMessage(msg)}
            onRetry={() => retryAssistantMessage(msg.id)}
            onSpeak={(content, messageId) => void handleMessageAudio(content, messageId)}
            onShare={(content) => void shareMessage(content)}
          />
        ))}
        <div ref={messagesEndRef} />
        {showStreamJump && <button type="button" onClick={() => { followStreamRef.current = true; setShowStreamJump(false); messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: "smooth" }); }} className="sticky bottom-3 left-1/2 z-10 mx-auto flex min-h-9 -translate-x-1/2 items-center rounded-full border border-blue-200 bg-white/95 px-4 text-xs font-semibold text-blue-700 shadow-lg backdrop-blur transition hover:bg-blue-50 max-md:left-auto max-md:right-3 max-md:translate-x-0 dark:border-blue-400/30 dark:bg-[#172033]/95 dark:text-blue-200 dark:hover:bg-blue-500/10">TESS continue d’écrire · revenir en bas ↓</button>}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-transparent px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-transparent dark:bg-transparent">

        {attachedFile && <AttachmentCard
          file={attachedFile.file}
          type={attachedFile.type}
          preview={attachedFile.preview}
          uploading={uploadingPdf}
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
        {voiceError && <div role="alert" className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">{voiceError}</div>}
        {/* Input row */}
        {longThinking && <div className="mb-2"><span className="inline-flex min-h-8 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-medium text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-violet-400/[0.08] dark:text-violet-300"><BrainCircuit className="h-3.5 w-3.5" />Réflexion plus longue</span></div>}
        <div className="flex items-end gap-1.5 rounded-[18px] border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-all focus-within:border-cyan-500/70 focus-within:ring-4 focus-within:ring-cyan-500/10 dark:border-[#383838] dark:bg-[#202020] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
          <ComposerPlusMenu
            disabled={isStreaming || uploadingPdf}
            longThinking={longThinking}
            onChooseImage={() => imageInputRef.current?.click()}
            onChooseCamera={() => cameraInputRef.current?.click()}
            onChooseDocument={() => documentInputRef.current?.click()}
            onToggleLongThinking={() => setLongThinking(value => !value)}
          />
          <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <input type="file" ref={documentInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

          {/* Text input */}
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => window.setTimeout(() => inputRef.current?.scrollIntoView({ block: "nearest" }), 80)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={
              isStreaming
                ? "En train de répondre…"
                : attachedFile
                ? "Posez une question sur ce fichier…"
                : config.placeholder
            }
            disabled={isStreaming}
            className="max-h-36 min-h-11 flex-1 resize-none self-center bg-transparent py-2 text-[16px] leading-6 text-slate-800 placeholder-slate-400 outline-none disabled:opacity-50 dark:text-white dark:placeholder-slate-500"
          />

          {courseAnalysisAvailable && !isStreaming && <button
            type="button"
            aria-pressed={analysisEnabled}
            onClick={() => setAnalysisEnabled(value => !value)}
            title={analysisEnabled ? "Désactiver l’analyse du cours" : "Demander une analyse structurée du cours actif"}
            className={`mb-0.5 flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${analysisEnabled ? "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"}`}
          ><BrainCircuit className="h-4 w-4" /><span>Analyser</span></button>}

          {/* Send / Stop */}
        {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              title="Arrêter la réponse"
              className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-white transition-all hover:bg-slate-900 dark:bg-slate-500 dark:hover:bg-slate-400"
            >
              <Square className="h-3 w-3 fill-white stroke-none" />
            </button>
        ) : (
            <button
              type="button"
              onClick={() => input.trim() || attachedFile ? void sendMessage(input) : void openVoiceSession()}
              title={input.trim() || attachedFile ? "Envoyer (Entrée)" : "Appeler TESS AI"}
              aria-label={input.trim() || attachedFile ? "Envoyer le message" : "Appeler TESS AI"}
              className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white shadow shadow-blue-300/50 transition-all hover:bg-[#1D4ED8] hover:shadow-md disabled:opacity-40 disabled:hover:shadow-none"
            >
              {input.trim() || attachedFile ? <ArrowUp className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            </button>
          )}
          {(!input.trim() || voiceState === "listening") && <button
            type="button"
            onClick={() => voiceState === "listening" ? stopLiveDictation() : beginVoiceCapture()}
            disabled={voiceState === "processing" || isStreaming}
            title={voiceState === "listening" ? "Arrêter la dictée" : "Dicter un message"}
            aria-label={voiceState === "listening" ? "Arrêter la dictée" : "Dicter un message"}
            aria-pressed={voiceState === "listening"}
            className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${voiceState === "listening" ? "animate-pulse bg-rose-100 text-rose-600 ring-2 ring-rose-300/60 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-300/40" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`}
          ><Mic className="h-4 w-4" /></button>}
        </div>

        <p className="mt-1.5 text-center text-[10px] text-slate-500 dark:text-slate-500">
          Entrée pour envoyer · + pour joindre un fichier ou une photo
        </p>
      </div>
      </>}
    </>
  );

  const renderedPanel = voiceOpen ? panelInner : (isMobilePanel || push) ? <MobileAssistantShell
    hasMessages={messages.length > 0 || isStreaming}
    input={input}
    isStreaming={isStreaming}
    longThinking={longThinking}
    onInputChange={setInput}
    onSend={(value) => void sendMessage(value ?? input)}
    onNewConversation={startNewConversation}
    onModeChange={(nextMode) => setLongThinking(nextMode === "reflect")}
    onClosePanel={onClose}
    onToggleExpanded={() => onExpandedChange?.(!expanded)}
    onCall={() => void openVoiceSession()}
    expanded={expanded}
    conversation={mobileConversation}
    composerExtras={mobileComposerExtras}
    historyContent={mobileHistory}
    conversationTitle={headerConversationTitle}
    isDictating={voiceState === "listening"}
    onMic={() => voiceState === "listening" ? stopLiveDictation() : beginVoiceCapture()}
    onOpenConversation={(conversation) => void openConversation(conversation)}
    audioPlayer={messageAudio.visible ? <MessageAudioPlayer
      {...messageAudio}
      onPlayPause={() => messageAudio.isPlaying ? (messageAudioCurrentRef.current?.pause(), setMessageAudio(current => ({ ...current, isPlaying: false }))) : playMessageAudioChunk(0)}
      onSeek={seekMessageAudio}
      onClose={() => stopMessageAudio()}
      /> : null}
  /> : panelInner;

  if (push) {
    return (
      <aside className="relative flex h-full w-full min-h-0 flex-col bg-white dark:bg-[#0f1219]" style={panelViewportStyle}>
        <div className="relative flex min-h-0 flex-1 flex-col">{renderedPanel}</div>
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
