// Copie Zentrix Academy : src/components/layout/SiteFooter.tsx
import { ArrowRight, CalendarDays, Mail, MapPin, Newspaper, Phone, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

const topCards = [
  {
    title: "footer.news",
    description: "footer.newsDesc",
    Icon: Newspaper,
    to: "/about",
  },
  {
    title: "footer.calendar",
    description: "footer.calendarDesc",
    Icon: CalendarDays,
    to: "/courses",
  },
  {
    title: "footer.events",
    description: "footer.eventsDesc",
    Icon: Video,
    to: "/courses",
  },
];

const quickLinks = [
  { label: "app.home", to: "/" },
  { label: "app.about", to: "/about" },
  { label: "app.allCourses", to: "/courses" },
  { label: "app.signup", to: "/login?mode=register" },
  { label: "footer.community", to: "/courses" },
];

export default function SiteFooter() {
  const { t } = useLanguage();
  const resources = ["footer.news", "footer.events", "footer.careers", "footer.calendar", "footer.contact"];
  return (
    <footer className="mt-16">
      <section className="border-y border-[#e7e0d9] bg-[#f5f2ee]">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 px-5 sm:grid-cols-3 sm:px-8">
          {topCards.map(({ Icon, ...card }) => (
            <Link key={card.title} to={card.to} className="group flex min-h-32 items-start gap-4 border-b border-[#e7e0d9] px-2 py-6 transition-colors duration-300 hover:bg-white/70 sm:border-b-0 sm:px-6 sm:py-8 sm:even:border-x sm:even:border-[#e7e0d9]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-white via-[#f1e6dc] to-[#dfcdbd] text-[#9b552c] shadow-[0_5px_0_#d8c8ba,0_8px_15px_rgba(76,50,31,.13)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_7px_0_#cdb8a6,0_12px_20px_rgba(76,50,31,.17)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#22201e]">{t(card.title)}</span>
                <span className="mt-2 block text-xs leading-relaxed text-[#77716c]">{t(card.description)}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#97502a] transition-all group-hover:gap-2.5">{t("footer.discover")} <ArrowRight className="h-3.5 w-3.5" /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#171717] text-white">
        <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full bg-[#a65321]/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            <div>
              <div className="flex items-center gap-3">
                <img src="/zentrix.avif" alt="Zentrix" className="h-14 w-14 object-contain" />
                <div>
                  <p className="text-base font-black uppercase tracking-[0.07em]">Zentrix</p>
                  <p className="text-xs text-[#b3aaa2]">{t("footer.institute")}</p>
                </div>
              </div>

              <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-[#b3aaa2]">
                {t("footer.aboutText")}
              </p>

              <a href="mailto:info@zentrix.com" className="group mt-7 inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-white/10 bg-gradient-to-br from-[#363636] to-[#202020] px-4 text-sm font-semibold text-[#e8e1da] shadow-[0_4px_0_#101010,0_8px_14px_rgba(0,0,0,.25)] transition-all duration-200 hover:-translate-y-1 hover:border-[#c17b50]/60 hover:from-[#704127] hover:to-[#9b552c] hover:text-white active:translate-y-0">
                <Mail className="h-4 w-4" /> {t("footer.writeUs")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">{t("footer.quickLinks")}</h4>
              <ul className="mt-5 space-y-3 text-[14px]">
                {quickLinks.map((item) => (
                  <li key={item.label} className="flex items-center gap-4">
                    <span className="text-[#9b552c]">—</span>
                    <Link
                      to={item.to}
                      className="cursor-pointer text-[#b3aaa2] transition-all duration-200 hover:translate-x-1 hover:text-[#e5a47d]"
                    >
                      {t(item.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">{t("footer.resources")}</h4>
              <ul className="mt-5 space-y-3 text-[14px]">
                {resources.map((item) => (
                  <li key={item} className="flex items-center gap-4">
                    <span className="text-[#9b552c]">—</span>
                    {item === "footer.contact"
                      ? <a href="mailto:info@zentrix.com" className="text-[#b3aaa2] transition-colors hover:text-[#e5a47d]">{t(item)}</a>
                      : <Link to="/courses" className="text-[#b3aaa2] transition-colors hover:text-[#e5a47d]">{t(item)}</Link>}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">{t("footer.contactInfo")}</h4>
              <div className="mt-5 space-y-4 text-[14px] leading-[1.5] text-[#b3aaa2]">
                <div className="flex items-start gap-4">
                  <MapPin className="mt-0.5 h-5 w-5 text-[#c17b50]" />
                  <p>
                    RDC, Republique Democratique du Congo
                    <br />
                    {t("footer.onlineCampus")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="h-5 w-5 text-[#c17b50]" />
                  <a href="tel:+24399371251" className="transition-colors hover:text-white">+243 993 712 51</a>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-[#c17b50]" />
                  <a href="mailto:info@zentrix.com" className="transition-colors hover:text-white">info@zentrix.com</a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="flex flex-col gap-3 text-[13px] text-[#9b938c] sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} Zentrix Technology Institute. {t("footer.rights")}</p>
              <div className="flex items-center gap-8">
                <a href="mailto:info@zentrix.com?subject=Politique%20de%20confidentialit%C3%A9" className="transition-colors hover:text-[#e5a47d]">{t("footer.privacy")}</a>
                <a href="mailto:info@zentrix.com?subject=Conditions%20d%27utilisation" className="transition-colors hover:text-[#e5a47d]">{t("footer.terms")}</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}
