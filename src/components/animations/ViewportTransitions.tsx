// Copie Zentrix Academy : src/components/animations/ViewportTransitions.tsx
import { createContext, type CSSProperties, type ReactNode, useContext, useEffect, useRef, useState } from "react";

type RevealVariant = "fadeUp" | "slideInLeft" | "slideInRight" | "scaleIn";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
  margin?: string;
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  once?: boolean;
  margin?: string;
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  index: number;
  duration?: number;
}

const StaggerContext = createContext<{ inView: boolean; stagger: number } | null>(null);

function useInView(once = true, margin = "-60px 0px -60px 0px") {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { root: null, threshold: 0.1, rootMargin: margin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, margin]);

  return { ref, inView };
}

function getHiddenStyle(variant: RevealVariant): CSSProperties {
  if (variant === "slideInLeft") return { opacity: 0, transform: "translate3d(-80px,0,0)" };
  if (variant === "slideInRight") return { opacity: 0, transform: "translate3d(80px,0,0)" };
  if (variant === "scaleIn") return { opacity: 0, transform: "scale(0.85)" };
  return { opacity: 0, transform: "translate3d(0,50px,0)" };
}

function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  once = true,
  margin = "-60px 0px -60px 0px",
  variant,
}: RevealProps & { variant: RevealVariant }) {
  const { ref, inView } = useInView(once, margin);
  const style: CSSProperties = inView
    ? {
        opacity: 1,
        transform: "translate3d(0,0,0) scale(1)",
        transition: `opacity ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s, transform ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s`,
      }
    : {
        ...getHiddenStyle(variant),
        transition: `opacity ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1), transform ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1)`,
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

export function FadeUp(props: RevealProps) {
  return <Reveal {...props} variant="fadeUp" duration={0.7} />;
}

export function SlideInLeft(props: RevealProps) {
  return <Reveal {...props} variant="slideInLeft" duration={0.8} />;
}

export function SlideInRight(props: RevealProps) {
  return <Reveal {...props} variant="slideInRight" duration={0.8} />;
}

export function ScaleIn(props: RevealProps) {
  return <Reveal {...props} variant="scaleIn" duration={0.6} />;
}

export function RevealLine({ className, once = true, margin = "-60px 0px -60px 0px" }: Omit<RevealProps, "children">) {
  const { ref, inView } = useInView(once, margin);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transformOrigin: "left",
        transform: inView ? "scaleX(1)" : "scaleX(0)",
        transition: "transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    />
  );
}

export function StaggerContainer({
  children,
  className,
  stagger = 0.1,
  once = true,
  margin = "-60px 0px -60px 0px",
}: StaggerContainerProps) {
  const { ref, inView } = useInView(once, margin);
  return (
    <StaggerContext.Provider value={{ inView, stagger }}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </StaggerContext.Provider>
  );
}

export function StaggerItem({ children, className, index, duration = 0.6 }: StaggerItemProps) {
  const ctx = useContext(StaggerContext);
  const visible = Boolean(ctx?.inView);
  const delay = (ctx?.stagger ?? 0.1) * index;
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : "translate3d(0,40px,0)",
        transition: `opacity ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s, transform ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
