import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AIHomePage from "@/pages/AIHomePage";
import AuthPage from "@/pages/AuthPage";
import AuthRequiredPage from "@/pages/AuthRequiredPage";
import GoogleCallbackPage from "@/pages/GoogleCallbackPage";
import GoogleAuthSuccess from "@/pages/GoogleAuthSuccess";
import TessOperationsPage from "@/pages/TessOperationsPage";
import TessAgentsPage from "@/pages/TessAgentsPage";
import TessTasksPage from "@/pages/TessTasksPage";
import TessToolsPage from "@/pages/TessToolsPage";
import TessRemindersPage from "@/pages/TessRemindersPage";
import TessSecurityPage from "@/pages/TessSecurityPage";
import TessFollowUpsPage from "@/pages/TessFollowUpsPage";
import TessMemoryPage from "@/pages/TessMemoryPage";
import TessNotificationsPage from "@/pages/TessNotificationsPage";
import TessMarketplacePage from "@/pages/TessMarketplacePage";
import TessConnectionsPage from "@/pages/TessConnectionsPage";
import TessCityPage from "@/pages/TessCityPage";
import TessOperatorPage from "@/pages/TessOperatorPage";
import TessImagesPage from "@/pages/TessImagesPage";
import TessLibraryPage from "@/pages/TessLibraryPage";
import TessPageLayout from "@/components/TessPageLayout";

export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/" element={<AIHomePage />} />
        <Route path="/operations" element={<TessPageLayout><TessOperationsPage /></TessPageLayout>} />
        <Route path="/agents" element={<TessPageLayout><TessAgentsPage /></TessPageLayout>} />
        <Route path="/tasks" element={<TessPageLayout><TessTasksPage /></TessPageLayout>} />
        <Route path="/tools" element={<TessPageLayout><TessToolsPage /></TessPageLayout>} />
        <Route path="/reminders" element={<TessPageLayout><TessRemindersPage /></TessPageLayout>} />
        <Route path="/follow-ups" element={<TessPageLayout><TessFollowUpsPage /></TessPageLayout>} />
        <Route path="/memory" element={<TessPageLayout><TessMemoryPage /></TessPageLayout>} />
        <Route path="/notifications" element={<TessPageLayout><TessNotificationsPage /></TessPageLayout>} />
        <Route path="/security" element={<TessPageLayout><TessSecurityPage /></TessPageLayout>} />
        <Route path="/marketplace" element={<TessPageLayout><TessMarketplacePage /></TessPageLayout>} />
        <Route path="/connections" element={<TessPageLayout><TessConnectionsPage /></TessPageLayout>} />
        <Route path="/city" element={<TessPageLayout><TessCityPage /></TessPageLayout>} />
        <Route path="/operator" element={<TessPageLayout><TessOperatorPage /></TessPageLayout>} />
        <Route path="/images" element={<TessPageLayout><TessImagesPage /></TessPageLayout>} />
        <Route path="/library" element={<TessPageLayout><TessLibraryPage /></TessPageLayout>} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth-required" element={<AuthRequiredPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </TooltipProvider>
  );
}
