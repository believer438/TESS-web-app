// Copie Zentrix Academy : src/components/ai/VoiceAIOrb.tsx
import { useEffect, useRef } from "react";

export type VoiceOrbState = "idle" | "listening" | "processing" | "speaking" | "paused" | "error";

/** Lightweight canvas orb. Audio levels come from the real MediaRecorder / player analyser. */
export default function VoiceAIOrb({ state, level = 0 }: { state: VoiceOrbState; level?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(level);
  levelRef.current = level;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let width = 0;
    let height = 0;
    let tick = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const draw = () => {
      tick += reduced ? 0.003 : 0.012;
      context.clearRect(0, 0, width, height);
      const cx = width / 2; const cy = height / 2;
      const boost = state === "speaking" || state === "listening" ? Math.min(1, levelRef.current * 4) : 0;
      const pulse = 1 + Math.sin(tick * 2) * (state === "idle" || state === "paused" ? 0.012 : 0.035) + boost * 0.05;
      const radius = Math.min(width, height) * 0.34 * pulse;
      const glow = context.createRadialGradient(cx, cy, radius * 0.28, cx, cy, radius * 1.5);
      glow.addColorStop(0, "rgba(75,75,255,.18)"); glow.addColorStop(.45, "rgba(26,86,255,.13)"); glow.addColorStop(1, "rgba(18,12,50,0)");
      context.fillStyle = glow; context.fillRect(0, 0, width, height);
      for (let ring = 0; ring < 5; ring++) {
        const speed = state === "paused" ? 0 : state === "processing" ? 0.024 : state === "speaking" || state === "listening" ? 0.019 : 0.008;
        const angle = tick * speed * (ring % 2 ? -1 : 1) + ring * 0.7;
        const rx = radius * (0.73 + ring * 0.12);
        const ry = radius * (0.48 + ring * 0.08);
        context.beginPath();
        for (let point = 0; point <= 160; point++) {
          const t = point / 160 * Math.PI * 2;
          const wobble = 1 + Math.sin(t * 3 + tick * 2 + ring) * 0.035 + Math.sin(t * 5 - tick) * 0.018;
          const x = cx + Math.cos(t) * rx * wobble * Math.cos(angle) - Math.sin(t) * ry * wobble * Math.sin(angle);
          const y = cy + Math.cos(t) * rx * wobble * Math.sin(angle) + Math.sin(t) * ry * wobble * Math.cos(angle);
          if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.closePath();
        const hue = ring % 2 ? "#a855f7" : "#1885ff";
        context.strokeStyle = hue; context.globalAlpha = state === "error" ? 0.35 : 0.42 + (ring % 2) * 0.12;
        context.lineWidth = ring === 2 ? 3 + boost * 2 : 1.4;
        context.shadowBlur = ring === 2 ? 22 : 12; context.shadowColor = hue; context.stroke();
      }
      context.globalAlpha = 1; context.shadowBlur = 0;
      const core = context.createRadialGradient(cx - radius * .2, cy - radius * .22, 2, cx, cy, radius * .48);
      core.addColorStop(0, "rgba(26,30,74,.5)"); core.addColorStop(1, "rgba(4,8,24,.96)");
      context.fillStyle = core; context.beginPath(); context.arc(cx, cy, radius * .46, 0, Math.PI * 2); context.fill();
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [state]);

  return <canvas ref={canvasRef} role="img" aria-label={`Bulle vocale, état ${state}`} className="h-full w-full" />;
}
