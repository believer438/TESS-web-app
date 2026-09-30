// Copie Zentrix Academy : src/components/admin/RichTextEditor.tsx
import "./RichTextEditor.css";
import { useCallback, useRef, useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import FontFamily from "@tiptap/extension-font-family";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Code2, Minus, Link as LinkIcon,
  Image as ImageLucide, Table as TableIcon,
  Undo2, Redo2, Highlighter, Type, X, Save, Check,
  ChevronDown, Heading1, Heading2, Heading3, Pilcrow,
  RemoveFormatting, Eye, PencilLine,
} from "lucide-react";
import { apiUploadChapterImage } from "@/lib/api-client";

// ── Constants ──────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: "Sans-serif",       value: "Arial, Helvetica, sans-serif" },
  { label: "Serif",            value: "Georgia, 'Times New Roman', serif" },
  { label: "Times New Roman",  value: "'Times New Roman', Times, serif" },
  { label: "Monospace",        value: "'Courier New', Courier, monospace" },
  { label: "Helvetica",        value: "Helvetica, Arial, sans-serif" },
];

const TEXT_COLORS = [
  "#000000", "#374151", "#6b7280", "#9ca3af",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#FF6B00", "#dc2626", "#16a34a", "#1d4ed8",
  "#ffffff", "#f1f5f9",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#fed7aa", "#fecaca", "#bbf7d0",
  "#bfdbfe", "#e9d5ff", "#fbcfe8", "#ccfbf1",
  "#f1f5f9", "transparent",
];

// ── Toolbar primitives ─────────────────────────────────────────────────────────

function Sep() {
  return <div className="mx-1.5 h-5 w-px flex-shrink-0 bg-slate-200" />;
}

function ToolBtn({
  onClick, active = false, title, disabled = false, children,
}: {
  onClick: () => void; active?: boolean; title: string;
  disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      className={[
        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-sm transition-all",
        active
          ? "bg-[#FF6B00] text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

// ── Color Picker popup ─────────────────────────────────────────────────────────

function ColorPickerPopup({
  colors, current, onSelect, onClose,
}: {
  colors: string[]; current?: string;
  onSelect: (c: string) => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={() => onClose()} />
      <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xl">
        <div className="grid grid-cols-6 gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              onMouseDown={(e) => { e.preventDefault(); onSelect(c); onClose(); }}
              className={[
                "h-5 w-5 rounded border transition-transform hover:scale-110",
                current === c ? "ring-2 ring-[#FF6B00] ring-offset-1" : "border-slate-300",
                c === "transparent" ? "bg-gradient-to-br from-white to-slate-100" : "",
              ].join(" ")}
              style={{ background: c === "transparent" ? undefined : c }}
              title={c === "transparent" ? "Aucun" : c}
              type="button"
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Font selector ──────────────────────────────────────────────────────────────

function FontSelector({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  if (!editor) return null;
  const current = FONT_FAMILIES.find((f) =>
    editor.isActive("textStyle", { fontFamily: f.value })
  )?.label ?? "Police";

  return (
    <div className="relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex h-7 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        title="Police de caractères"
        type="button"
      >
        <span className="w-24 truncate text-left">{current}</span>
        <ChevronDown className="h-3 w-3 flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setFontFamily(f.value).run();
                  setOpen(false);
                }}
                className="flex w-full items-center px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-[#FF6B00] transition-colors"
                style={{ fontFamily: f.value }}
                type="button"
              >
                {f.label}
              </button>
            ))}
            <div className="border-t border-slate-100">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetFontFamily().run();
                  setOpen(false);
                }}
                className="flex w-full items-center px-4 py-2.5 text-xs text-slate-400 hover:bg-slate-50"
                type="button"
              >
                Par défaut
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Keep legacy Markdown chapters editable without changing the API contract. */
function legacyContentToHtml(value: string): string {
  if (!value.trim() || value.trim().startsWith("<")) return value || "<p></p>";
  const lines = value.split(/\r?\n/);
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
    } else if (bullet || ordered) {
      const type = bullet ? "ul" : "ol";
      if (list !== type) {
        closeList();
        list = type;
        html.push(`<${type}>`);
      }
      html.push(`<li>${escapeHtml((bullet ?? ordered)![1])}</li>`);
    } else {
      closeList();
      html.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  closeList();
  return html.join("") || "<p></p>";
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  value:         string;
  onChange:      (html: string) => void;
  onClose:       () => void;
  onSave?:       () => void | Promise<unknown>;
  chapterTitle?: string;
}

export function RichTextEditor({ value, onChange, onClose, onSave, chapterTitle }: RichTextEditorProps) {
  const fileRef              = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [hlColorOpen,   setHlColorOpen]   = useState(false);
  const [saved, setSaved]   = useState(false);
  const [preview, setPreview] = useState(false);
  const [documentHtml, setDocumentHtml] = useState(() => legacyContentToHtml(value));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExt,
      TextAlign.configure({ types: ["heading", "paragraph", "blockquote"] }),
      TiptapImage.configure({ inline: false, allowBase64: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Commencez à écrire votre chapitre ici…" }),
    ],
     content: legacyContentToHtml(value),
     onUpdate: ({ editor: updatedEditor }) => setDocumentHtml(updatedEditor.getHTML()),
    editorProps: { attributes: { class: "ProseMirror" } },
  });

  useEffect(() => {
    if (editor && value && value.trim() && editor.isEmpty) {
      const html = legacyContentToHtml(value);
      editor.commands.setContent(html);
      setDocumentHtml(html);
    }
  }, [editor, value]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    onChange(html);
    await onSave?.();
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 500);
  }, [editor, onChange, onClose, onSave]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      let url: string;
      try {
        url = await apiUploadChapterImage(file);
      } catch {
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      editor.chain().focus().setImage({ src: url }).run();
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const handleInsertLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url  = window.prompt("URL du lien :", prev ?? "https://");
    if (url === null) return;
    if (url === "")   editor.chain().focus().unsetLink().run();
    else              editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const charCount = editor?.getText().length ?? 0;

  if (!editor) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: "#1e1e1e" }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 bg-[#161616] px-5 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-[#FF6B00]/20">
            <Heading1 className="h-4 w-4 text-[#FF6B00]" />
          </div>
          <div className="min-w-0">
             <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#FF6B00]">Éditeur de contenu</p>
            <p className="truncate text-sm font-semibold text-white">{chapterTitle || "Nouveau chapitre"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button
             onClick={() => setPreview((current) => !current)}
             className="flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
             type="button"
             aria-pressed={preview}
           >
             {preview ? <PencilLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
             <span className="hidden sm:inline">{preview ? "Modifier" : "Aperçu"}</span>
           </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#FF6B00] px-5 py-2 text-sm font-bold text-white hover:bg-[#e56000] transition-colors"
            type="button"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Sauvegardé !" : "Sauvegarder"}
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            type="button"
            title="Fermer sans sauvegarder"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 overflow-x-auto border-b border-slate-200 bg-[#f8f9fa] shadow-sm">
        <div className="flex min-w-max items-center gap-0.5 px-3 py-2">

          {/* History */}
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler (Ctrl+Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir (Ctrl+Y)">
            <Redo2 className="h-3.5 w-3.5" />
          </ToolBtn>

          <Sep />

          {/* Font */}
          <FontSelector editor={editor} />

          <Sep />

          {/* Block type */}
          <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph") && !editor.isActive("heading")} title="Texte normal">
            <Pilcrow className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titre 1 (H1)">
            <Heading1 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titre 2 (H2)">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titre 3 (H3)">
            <Heading3 className="h-3.5 w-3.5" />
          </ToolBtn>

          <Sep />

          {/* Text format */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras (Ctrl+B)">
            <Bold className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique (Ctrl+I)">
            <Italic className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Souligné (Ctrl+U)">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barré">
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolBtn>

          <Sep />

          {/* Text color */}
          <div className="relative">
            <button
              onMouseDown={(e) => { e.preventDefault(); setTextColorOpen((v) => !v); setHlColorOpen(false); }}
              className="flex h-7 w-7 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded hover:bg-slate-200 transition-colors"
              title="Couleur du texte"
              type="button"
            >
              <Type className="h-3.5 w-3.5 text-slate-600" />
              <div className="h-1 w-4 rounded-full border border-slate-300" style={{ background: (editor.getAttributes("textStyle") as { color?: string }).color || "#000" }} />
            </button>
            {textColorOpen && (
              <ColorPickerPopup
                colors={TEXT_COLORS}
                current={(editor.getAttributes("textStyle") as { color?: string }).color}
                onSelect={(c) => editor.chain().focus().setColor(c).run()}
                onClose={() => setTextColorOpen(false)}
              />
            )}
          </div>

          {/* Highlight */}
          <div className="relative">
            <button
              onMouseDown={(e) => { e.preventDefault(); setHlColorOpen((v) => !v); setTextColorOpen(false); }}
              className="flex h-7 w-7 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded hover:bg-slate-200 transition-colors"
              title="Surligner le texte"
              type="button"
            >
              <Highlighter className="h-3.5 w-3.5 text-slate-600" />
              <div
                className="h-1 w-4 rounded-full border border-slate-300"
                style={{ background: (editor.getAttributes("highlight") as { color?: string }).color || "#fef08a" }}
              />
            </button>
            {hlColorOpen && (
              <ColorPickerPopup
                colors={HIGHLIGHT_COLORS}
                current={(editor.getAttributes("highlight") as { color?: string }).color}
                onSelect={(c) =>
                  c === "transparent"
                    ? editor.chain().focus().unsetHighlight().run()
                    : editor.chain().focus().setHighlight({ color: c }).run()
                }
                onClose={() => setHlColorOpen(false)}
              />
            )}
          </div>

          <Sep />

          {/* Alignment */}
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Aligner à gauche">
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centrer">
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Aligner à droite">
            <AlignRight className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justifier">
            <AlignJustify className="h-3.5 w-3.5" />
          </ToolBtn>

          <Sep />

          {/* Lists */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Liste à puces">
            <List className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Liste numérotée">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolBtn>

          <Sep />

          {/* Blocks */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citation / Blockquote">
            <span className="text-[15px] font-black leading-none text-slate-600" style={{ lineHeight: 1 }}>&ldquo;</span>
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Bloc de code">
            <Code2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur horizontal">
            <Minus className="h-3.5 w-3.5" />
          </ToolBtn>

          <Sep />

          {/* Insert */}
          <ToolBtn onClick={handleInsertLink} active={editor.isActive("link")} title="Insérer / modifier un lien">
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolBtn>

          <ToolBtn
            onClick={() => fileRef.current?.click()}
            title={uploading ? "Upload en cours…" : "Insérer une image (Supabase)"}
            disabled={uploading}
          >
            {uploading
              ? <span className="text-[9px] font-bold">…</span>
              : <ImageLucide className="h-3.5 w-3.5" />
            }
          </ToolBtn>

          <ToolBtn
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insérer un tableau 3×3"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </ToolBtn>

          <Sep />

          {/* Clear formatting */}
          <ToolBtn
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title="Effacer toute la mise en forme"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </ToolBtn>

        </div>
      </div>

      {/* ── A4 PAGES AREA ───────────────────────────────────────────────── */}
       <div className="rte-workspace flex-1 overflow-y-auto">
         <div className="rte-page-stack">
           <div className="rte-page" onClick={() => !preview && editor.chain().focus().run()}>
             {preview ? (
               <div className="chapter-html-content" dangerouslySetInnerHTML={{ __html: documentHtml }} />
             ) : (
               <EditorContent editor={editor} />
             )}
           </div>
           <div className="rte-page-shadow" />
         </div>
       </div>

      {/* ── STATUS BAR ──────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-white/10 bg-[#161616] px-5 py-2">
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>{charCount} caractère{charCount !== 1 ? "s" : ""}</span>
          <span>Format A4 · 794px</span>
          {uploading && <span className="text-[#FF6B00] animate-pulse">Envoi image…</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="border border-white/15 px-4 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            type="button"
          >
            Fermer sans sauvegarder
          </button>
          <button
            onClick={handleSave}
            className="bg-[#FF6B00] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#e56000] transition-colors"
            type="button"
          >
            {saved ? "✓ Sauvegardé !" : "Sauvegarder le contenu"}
          </button>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
