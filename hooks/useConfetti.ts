import { useCallback, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle";
}

const COLORS = [
  "#ef4444", // brand red
  "#f97316", // orange
  "#facc15", // yellow
  "#4ade80", // green
  "#60a5fa", // blue
  "#a78bfa", // purple
  "#f472b6", // pink
];

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const stop = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx)
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    particlesRef.current = [];
  }, []);

  const launch = useCallback(() => {
    stop();

    // Cria canvas fixo cobrindo toda a tela
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    // Gera 180 partículas saindo do topo
    const particles: Particle[] = [];
    for (let i = 0; i < 180; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        opacity: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }
    particlesRef.current = particles;

    const ctx = canvas.getContext("2d")!;

    let startTime = performance.now();
    const DURATION = 3500; // ms

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravidade
        p.rotation += p.rotationSpeed;

        // Fade out nos últimos 30%
        if (progress > 0.7) {
          p.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
        }

        if (p.y < canvas.height + 20) alive++;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }

        ctx.restore();
      }

      if (progress < 1 && alive > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Limpa canvas e remove do DOM
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.remove();
        canvasRef.current = null;
        animFrameRef.current = null;
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [stop]);

  return { launch, stop };
}
