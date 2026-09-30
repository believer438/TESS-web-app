// Copie Zentrix Academy : src/components/editor/RichTextEditor.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code2, Highlighter,
  Italic, Link2, List, ListOrdered, Minus, Palette, Quote,
  Table2, Underline,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  onSelectionChange?: (text: string) => void;
  aiReplacement?: { id: number; text: string } | null;
  onReplacementApplied?: () => void;
}

type Command = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";

function htmlToText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
}

function ToolbarButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]"
          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Commencez à rédiger le contenu du chapitre…",
  minHeight = 360,
  onSelectionChange,
  aiReplacement,
  onReplacementApplied,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const selectionRangeRef = useRef<Range | null>(null);
  const replacementIdRef = useRef<number | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!editorRef.current || editorRef.current.innerHTML === value) return;
    editorRef.current.innerHTML = value;
    lastValueRef.current = value;
  }, [value]);

  const emit = () => {
    const next = editorRef.current?.innerHTML ?? "";
    lastValueRef.current = next;
    onChange(next);
    refreshActive();
  };

  const syncSelection = () => {
    const selection = window.getSelection();
    const root = editorRef.current;
    if (!selection || !root || selection.rangeCount === 0) {
      onSelectionChange?.("");
      return;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      onSelectionChange?.("");
      return;
    }

    const text = selection.toString().trim();
    if (text) selectionRangeRef.current = range.cloneRange();
    onSelectionChange?.(text);
  };

  useEffect(() => {
    if (
      !aiReplacement ||
      !editorRef.current ||
      replacementIdRef.current === aiReplacement.id
    ) {
      return;
    }

    replacementIdRef.current = aiReplacement.id;
    const range = selectionRangeRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return;

    editorRef.current.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("insertText", false, aiReplacement.text);
    emit();
    onSelectionChange?.("");
    onReplacementApplied?.();
  }, [aiReplacement, onReplacementApplied]);

  const refreshActive = () => {
    const next: Record<string, boolean> = {};
    ["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList"].forEach((key) => {
      next[key] = document.queryCommandState(key);
    });
    setActive(next);
  };

  const command = (name: Command) => {
    editorRef.current?.focus();
    document.execCommand(name, false);
    emit();
  };

  const formatBlock = (tag: "p" | "h2" | "h3" | "blockquote" | "pre") => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    emit();
  };

  const align = (direction: "left" | "center" | "right") => {
    editorRef.current?.focus();
    document.execCommand(`justify${direction[0].toUpperCase()}${direction.slice(1)}`, false);
    emit();
  };

  const insertLink = () => {
    editorRef.current?.focus();
    const url = window.prompt("Adresse du lien", "https://");
    if (!url || url === "https://") return;
    document.execCommand("createLink", false, url);
    emit();
  };

  const insertTable = () => {
    editorRef.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      '<table><thead><tr><th>Colonne 1</th><th>Colonne 2</th></tr></thead><tbody><tr><td>Valeur</td><td>Valeur</td></tr></tbody></table><p><br></p>',
    );
    emit();
  };

  const insertCode = () => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, "pre");
    emit();
  };

  const setColor = (color: string) => {
    editorRef.current?.focus();
    document.execCommand("foreColor", false, color);
    emit();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.48)] p-2">
        <div className="flex items-center gap-0.5 border-r border-[hsl(var(--border))] pr-2">
          <ToolbarButton label="Paragraphe" onClick={() => formatBlock("p")}><span className="text-xs font-bold">P</span></ToolbarButton>
          <ToolbarButton label="Titre 2" onClick={() => formatBlock("h2")}><span className="text-xs font-black">H2</span></ToolbarButton>
          <ToolbarButton label="Titre 3" onClick={() => formatBlock("h3")}><span className="text-xs font-black">H3</span></ToolbarButton>
          <ToolbarButton label="Citation" onClick={() => formatBlock("blockquote")}><Quote className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Bloc de code" onClick={insertCode}><Code2 className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center gap-0.5 border-r border-[hsl(var(--border))] px-2">
          <ToolbarButton label="Gras" active={active.bold} onClick={() => command("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Italique" active={active.italic} onClick={() => command("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Souligné" active={active.underline} onClick={() => command("underline")}><Underline className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Surligner" onClick={() => { editorRef.current?.focus(); document.execCommand("hiliteColor", false, "#d3f2ea"); emit(); }}><Highlighter className="h-4 w-4" /></ToolbarButton>
          <label title="Couleur du texte" className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]">
            <Palette className="h-4 w-4" />
            <input aria-label="Couleur du texte" type="color" defaultValue="#183243" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => setColor(event.target.value)} />
          </label>
        </div>
        <div className="flex items-center gap-0.5 border-r border-[hsl(var(--border))] px-2">
          <ToolbarButton label="Liste à puces" active={active.insertUnorderedList} onClick={() => command("insertUnorderedList")}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Liste numérotée" active={active.insertOrderedList} onClick={() => command("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Lien" onClick={insertLink}><Link2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Tableau" onClick={insertTable}><Table2 className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center gap-0.5 px-2">
          <ToolbarButton label="Aligner à gauche" onClick={() => align("left")}><AlignLeft className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Centrer" onClick={() => align("center")}><AlignCenter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Aligner à droite" onClick={() => align("right")}><AlignRight className="h-4 w-4" /></ToolbarButton>
        </div>
        <button type="button" title="Effacer la mise en forme" onClick={() => { editorRef.current?.focus(); document.execCommand("removeFormat", false); emit(); }} className="ml-auto flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]">
          <Minus className="h-3.5 w-3.5" /> Nettoyer
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        data-empty={!htmlToText(value)}
        onInput={emit}
        onSelect={syncSelection}
        onKeyUp={() => { refreshActive(); syncSelection(); }}
        onMouseUp={() => { refreshActive(); syncSelection(); }}
        onFocus={refreshActive}
        className="rich-editor prose prose-slate max-w-none px-5 py-5 text-[15px] leading-7 text-[hsl(var(--foreground))] outline-none"
        style={{ minHeight }}
      />
      <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">
        <span>Votre contenu sera visible comme une leçon structurée.</span>
        <span>{htmlToText(value).length} caractères</span>
      </div>
    </div>
  );
}
