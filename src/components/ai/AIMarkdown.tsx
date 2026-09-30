// Copie Zentrix Academy : src/components/ai/AIMarkdown.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Components } from "react-markdown";

interface AIMarkdownProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  rich?: boolean;
}

// ── Chat response components ──────────────────────────────────────────────────
const chatComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-5 mt-8 text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-4 mt-8 text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-3 mt-6 text-base font-bold leading-snug text-slate-900 dark:text-white first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
      <p className="mb-5 text-[15px] leading-[1.75] text-slate-700 dark:text-slate-300 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 list-disc space-y-2.5 pl-7">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2.5 pl-8">{children}</ol>
  ),
  li: ({ children }) => (
      <li className="pl-1 text-[15px] leading-[1.7] text-slate-700 dark:text-slate-300 marker:text-slate-400 dark:marker:text-slate-500">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-600 dark:text-slate-400">{children}</em>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    return (
      <code className={isBlock
        ? "block min-w-max font-mono text-[13px] leading-6 text-slate-800 dark:text-slate-200"
        : "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:bg-slate-700 dark:text-slate-200"}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-slate-800 underline decoration-slate-400 underline-offset-2 hover:text-slate-950 dark:text-slate-200 dark:decoration-slate-500 dark:hover:text-white">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 rounded-r-xl border-l-4 border-slate-300 bg-slate-50 py-4 pl-5 pr-4 text-[14px] leading-[1.7] italic text-slate-600 dark:border-white/60 dark:bg-white/[0.04] dark:text-slate-300">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-7 border-slate-200 dark:border-slate-700" />
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[540px] border-collapse text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>,
  tr: ({ children }) => <tr className="even:bg-slate-50/60 dark:even:bg-white/[0.025]">{children}</tr>,
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-300">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-200 px-3 py-2.5 align-top text-[13px] leading-[1.5] text-slate-600 dark:border-slate-700 dark:text-slate-400">
      {children}
    </td>
  ),
};

// ── Rich document analysis components (bigger, more visual) ───────────────────
const richComponents: Components = {
  ...chatComponents,
  h1: ({ children }) => (
    <h1 className="mb-5 mt-8 text-xl font-black leading-tight text-slate-900 dark:text-white first:mt-0">
      <span className="leading-tight">{children}</span>
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-4 mt-8 text-lg font-bold leading-tight text-slate-900 dark:text-white first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-3 mt-6 text-base font-bold leading-snug text-slate-900 dark:text-white first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
      <p className="mb-5 text-[15px] leading-[1.75] text-slate-700 last:mb-0 dark:text-slate-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 list-disc space-y-2.5 pl-7">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2.5 pl-8">{children}</ol>
  ),
  li: ({ children }) => (
      <li className="pl-1 text-[15px] leading-[1.7] text-slate-700 dark:text-slate-300 marker:text-slate-400 dark:marker:text-slate-500">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 rounded-r-xl border-l-4 border-slate-300 bg-slate-50 py-4 pl-5 pr-4 text-sm leading-[1.7] italic text-slate-700 shadow-sm dark:border-white/60 dark:bg-white/[0.04] dark:text-slate-300">
      {children}
    </blockquote>
  ),
  hr: () => (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
      <span className="text-xs text-slate-300 dark:text-slate-600">✦</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
    </div>
  ),
};

function normalizeMathDelimiters(value: string): string {
  const normalized = value
    // Some providers escape the delimiters once or twice in streamed text.
    .replace(/\\+\[/g, "$$\n")
    .replace(/\\+\]/g, "\n$$")
    .replace(/\\+\(/g, "$")
    .replace(/\\+\)/g, "$");

  const lines = normalized.split("\n");
  const result: string[] = [];
  let inDisplayMath = false;
  const rawMathLine = /^\\(?:Delta|frac|text|sum|int|prod|sqrt|alpha|beta|gamma|theta|lambda|pi|infty|cdot|times|ge|le|neq|approx|rightarrow|left|right)\b/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "$") {
      result.push("$$");
      inDisplayMath = !inDisplayMath;
      continue;
    }
    if (trimmed === "$$") {
      result.push(line);
      inDisplayMath = !inDisplayMath;
      continue;
    }
    if (!inDisplayMath && rawMathLine.test(trimmed)) {
      result.push("$$", line, "$$");
      continue;
    }
    result.push(line);
  }

  if (inDisplayMath) result.push("$$");
  return result.join("\n");
}

function normalizeMarkdownStructure(value: string): string {
  const normalized = normalizeMathDelimiters(value)
    // Keep common explanatory labels from sticking to the preceding paragraph.
    .replace(/([^\n])\n(?=(?:Exemple|Exemples|Note|Important|À retenir|Conclusion|En résumé)\s*:)/gi, "$1\n\n")
    .split("\n");

  // Treat a numbered section label as a heading only when it is followed by a
  // normal paragraph, not by another list item. This keeps numbered lists intact.
  return normalized.map((line, index) => {
    const nextLine = normalized[index + 1]?.trim() ?? "";
    const isSectionLabel = /^\d+[.)]\s+[^\n]{3,100}$/.test(line.trim());
    const nextIsList = /^(?:\d+[.)]|[-*+]\s)/.test(nextLine);
    return isSectionLabel && nextLine && !nextIsList && !line.trim().startsWith("#") ? `### ${line.trim()}` : line;
  }).join("\n");
}

export default function AIMarkdown({ content, isStreaming, className, rich }: AIMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[rehypeKatex]}
        components={rich ? richComponents : chatComponents}
      >
        {normalizeMarkdownStructure(content)}
      </ReactMarkdown>
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-slate-500 opacity-80 dark:bg-slate-300" />
      )}
    </div>
  );
}
