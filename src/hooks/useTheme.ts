// Copie Zentrix Academy : src/hooks/useTheme.ts
import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "tess-ai-theme";

function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const isDark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "light";
  });

  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    setThemeState(mode);
    applyTheme(mode);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const resolvedTheme: "light" | "dark" =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";

  return { theme, setTheme, resolvedTheme };
}
