// Copie Zentrix Academy : src/main.tsx
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./lib/i18n";
import { ErrorBoundary } from "./components/error-boundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
