// Copie Zentrix Academy : src/pages/NotificationsPage.tsx
import { useEffect, useState } from "react";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  AlertTriangle, Bell, CheckCircle2, Clock, ExternalLink, Info, Loader2, Trash2,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { useToast } from "@/hooks/use-toast";
import {
  Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
} from "@/components/ui/empty";
import {
  type BackendNotification,
  apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead,
  apiDeleteNotification, isAuthenticated,
} from "@/lib/api-client";

interface Props {
  onNavigate?: (page: string, data?: unknown) => void;
}

const TYPE_META: Record<string, { Icon: typeof Bell; label: string; iconClass: string; ringClass: string }> = {
  info:     { Icon: Info,          label: "Info",      iconClass: "text-blue-600 dark:text-blue-400",    ringClass: "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20" },
  success:  { Icon: CheckCircle2,  label: "Succès",    iconClass: "text-emerald-600 dark:text-emerald-400", ringClass: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20" },
  warning:  { Icon: AlertTriangle, label: "Important", iconClass: "text-amber-600 dark:text-amber-400",  ringClass: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20" },
  reminder: { Icon: Clock,         label: "Rappel",    iconClass: "text-[#FF6B00]",                      ringClass: "border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20" },
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function NotificationsPage({ onNavigate }: Props) {
  const { toast } = useToast();
  const [notifs, setNotifs] = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [acting, setActing] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const authenticated = isAuthenticated();

  const load = () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    apiGetNotifications()
      .then(setNotifs)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [authenticated]);

  const displayed = filter === "unread" ? notifs.filter((n) => !n.is_read) : notifs;
  const unreadCount = notifs.filter((n) => !n.is_read).length;

  useSetPageContext({
    current_page: "notifications",
    page_title: "Notifications",
    page_data: {
      total_notifications: notifs.length,
      unread_count: unreadCount,
      active_filter: filter,
      displayed_count: displayed.length,
      recent_notifications: displayed.slice(0, 10).map((n) => ({
        id: n.id,
        type: n.notification_type ?? n.notif_type,
        message: n.message,
        is_read: n.is_read,
        created_at: n.created_at,
      })),
    },
  });

  const handleMarkRead = async (id: number) => {
    setActing(id);
    try {
      const updated = await apiMarkNotificationRead(id);
      setNotifs((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActing(id);
    try {
      await apiDeleteNotification(id);
      setNotifs((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await apiMarkAllNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast({ title: "Toutes les notifications sont lues." });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="w-full space-y-6 bg-white p-4 sm:p-6 dark:bg-slate-900">
      <PageHero
        eyebrow="Notifications"
        title="Centre de notifications"
        subtitle="Restez informé des dernières activités et mises à jour."
        backgroundImage="/page-hero-notifications.png"
        icon={<Bell className="h-7 w-7" />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
          {[
            { key: "all" as const, label: `Toutes (${notifs.length})` },
            { key: "unread" as const, label: `Non lues (${unreadCount})` },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium ${filter === tab.key ? "border-b-2 border-[#FF6B00] text-[#FF6B00]" : "text-slate-500 dark:text-slate-400"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} disabled={markingAll}
            className="flex items-center gap-2 text-xs font-semibold text-[#FF6B00] hover:underline disabled:opacity-50">
            {markingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Tout marquer comme lu
          </button>
        )}
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {!authenticated ? (
        <div className="rounded-none border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <Bell className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Connectez-vous pour voir vos notifications.
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#FF6B00]" />
        </div>
      ) : displayed.length === 0 ? (
        <Empty className="border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Bell className="h-6 w-6" /></EmptyMedia>
            <EmptyTitle>{filter === "unread" ? "Tout est lu !" : "Aucune notification"}</EmptyTitle>
            <EmptyDescription>
              {filter === "unread" ? "Vous avez lu toutes vos notifications." : "Vous n'avez pas encore de notifications."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {displayed.map((notif) => {
            const meta = TYPE_META[notif.notif_type] ?? TYPE_META.info;
            const Icon = meta.Icon;
            return (
              <div key={notif.id}
                className={`flex items-start gap-3 border px-4 py-3.5 transition-all ${
                  notif.is_read
                    ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    : `${meta.ringClass} border`
                }`}>
                <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${meta.ringClass}`}>
                  <Icon className={`h-4 w-4 ${meta.iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${notif.is_read ? "text-slate-600 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
                      {notif.title}
                      {!notif.is_read && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#FF6B00] align-middle" />
                      )}
                    </p>
                    <p className="flex-shrink-0 text-[10px] text-slate-400">{formatTime(notif.created_at)}</p>
                  </div>
                  {notif.message && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{notif.message}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    {!notif.is_read && (
                      <button onClick={() => handleMarkRead(notif.id)} disabled={acting === notif.id}
                        className="text-[11px] font-semibold text-[#FF6B00] hover:underline disabled:opacity-50">
                        {acting === notif.id ? "..." : "Marquer comme lu"}
                      </button>
                    )}
                    {notif.link_url && onNavigate && (
                      <button
                        onClick={() => {
                          const link = notif.link_url!;
                          if (!notif.is_read) handleMarkRead(notif.id);
                          if (link.startsWith("/dashboard/")) {
                            const page = link.replace("/dashboard/", "") || "dashboard";
                            onNavigate(page);
                          } else {
                            window.open(link, "_blank", "noopener");
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir
                      </button>
                    )}
                    <button onClick={() => handleDelete(notif.id)} disabled={acting === notif.id}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 disabled:opacity-50">
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

