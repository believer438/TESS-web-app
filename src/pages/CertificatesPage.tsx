// Copie Zentrix Academy : src/pages/CertificatesPage.tsx
import { useEffect, useState } from "react";
import { useSetPageContext } from "@/hooks/usePageContext";
import { Award, BookOpen, Calendar, Download, ExternalLink, Loader2 } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { apiGetMyCertificates, type Certificate } from "@/lib/api-client";

interface Props {
  onNavigate: (page: string, data?: unknown) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function CertificatesPage({ onNavigate }: Props) {
  const [certs, setCerts]     = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    apiGetMyCertificates()
      .then(setCerts)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  useSetPageContext({
    current_page: "certificates",
    page_title:   "Mes certificats",
    page_data: {
      certificates_count: certs.length,
      latest_certificate: certs[0]
        ? { course_title: certs[0].course_title, issued_at: certs[0].issued_at }
        : null,
    },
  });

  return (
    <div className="w-full space-y-6 bg-white p-4 sm:p-6 dark:bg-slate-900">
      <PageHero
        eyebrow="Mes réalisations"
        title="Mes certificats"
        subtitle="Chaque certificat témoigne de votre engagement et de vos efforts. Bravo !"
        backgroundImage="/page-hero-certificates.png"
        icon={<Award className="h-7 w-7" />}
      />

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : certs.length === 0 ? (
        <Empty className="border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Award className="h-6 w-6" /></EmptyMedia>
            <EmptyTitle>Aucun certificat pour l'instant</EmptyTitle>
            <EmptyDescription>
              Terminez un cours du catalogue pour obtenir votre premier certificat.
            </EmptyDescription>
          </EmptyHeader>
          <button
            onClick={() => onNavigate("courses")}
            className="mx-auto mt-2 flex items-center gap-2 rounded-lg bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e56000]"
          >
            <BookOpen className="h-4 w-4" />
            Explorer les cours
          </button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-amber-950/20 dark:to-orange-950/20"
            >
              {/* Badge */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFB347] to-[#FF6B00] shadow-sm">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Certifié
                </span>
              </div>

              {/* Course title */}
              <h3 className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
                {cert.course_title}
              </h3>

              {/* Score */}
              {cert.score !== null && cert.score !== undefined && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF6B00]"
                      style={{ width: `${cert.score}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#FF6B00]">{cert.score}%</span>
                </div>
              )}

              {/* Date */}
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Calendar className="h-3 w-3" />
                Obtenu le {formatDate(cert.issued_at)}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onNavigate("courses")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Voir le cours
                </button>
                {cert.certificate_url ? (
                  <a
                    href={cert.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-[#FF6B00] px-3 py-2 text-xs font-bold text-white hover:bg-[#e56000]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 dark:bg-slate-800"
                    title="Téléchargement disponible prochainement"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {!loading && certs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
              <p className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white">
                {certs.length} certificat{certs.length > 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => onNavigate("courses")}
              className="flex items-center gap-2 rounded-lg bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e56000]"
            >
              <BookOpen className="h-4 w-4" />
              Continuer à apprendre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

