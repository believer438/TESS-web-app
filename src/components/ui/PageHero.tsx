// Copie Zentrix Academy : src/components/ui/PageHero.tsx
import { type ReactNode } from "react";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage: string;
  icon?: ReactNode;
  eyebrow?: string;
  children?: ReactNode;
  compact?: boolean;
}

export default function PageHero({
  title,
  subtitle,
  backgroundImage,
  icon,
  eyebrow,
  children,
  compact = false,
}: PageHeroProps) {
  return (
    <section
      className="relative w-full overflow-hidden bg-slate-900"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/40" />
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[#FF6B00]" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-[#FF6B00]/20 blur-3xl" />

       <div className={`relative mx-auto flex max-w-7xl flex-col justify-center px-4 sm:px-6 lg:max-w-[88rem] lg:px-8 ${compact ? "py-4 sm:py-5 md:py-6 lg:py-7" : "py-10 sm:py-14 md:py-16 lg:py-20"}`}>
        {eyebrow && (
           <span data-brand-eyebrow className="mb-4 inline-flex self-start w-fit max-w-full items-center gap-2 border-l-2 border-[#FF6B00] bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF6B00] backdrop-blur sm:text-[11px] sm:tracking-[0.28em]">
            {eyebrow}
          </span>
        )}
         <div className="flex min-w-0 max-w-3xl items-start gap-3 sm:gap-4 lg:max-w-[58%]">
          {icon && (
             <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur sm:h-14 sm:w-14">
              {icon}
            </div>
          )}
          <div className="min-w-0">
             <h1 className={`break-words font-bold leading-tight text-white ${compact ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl" : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"}`}>
              {title}
            </h1>
            {subtitle && (
               <p className={`mt-2 max-w-2xl leading-relaxed text-white/80 ${compact ? "text-[11px] sm:text-xs md:text-sm" : "text-xs sm:text-sm md:text-base"}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children && <div className={compact ? "mt-3" : "mt-6"}>{children}</div>}
      </div>
    </section>
  );
}
