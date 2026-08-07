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
  "#ef4444",
  "#f97316",
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
];

const MAX_PARTICLES = 45;
const SPAWN_RATE = 2;

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const runningRef = useRef(false);

  const stop = useCallback(() => {
    runningRef.current = false;

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      canvas.remove();
      canvasRef.current = null;
    }

    particlesRef.current = [];
  }, []);

  const launch = useCallback(() => {
    if (runningRef.current) return;

    runningRef.current = true;

    const canvas = document.createElement("canvas");

    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      stop();
      return;
    }

    particlesRef.current = [];

    let lastTime = performance.now();

    function createParticle(): Particle {
      return {
        x: Math.random() * canvas.width,
        y: -15,
        vx: (Math.random() - 0.5) * 2,
        vy: 1.5 + Math.random() * 2.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.12,
        opacity: 0.75 + Math.random() * 0.25,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      };
    }

    function animate(now: number) {
      if (!ctx) return;
      if (!runningRef.current) return;

      const delta = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cria poucas partículas por frame
      for (let i = 0; i < SPAWN_RATE; i++) {
        if (particlesRef.current.length < MAX_PARTICLES) {
          particlesRef.current.push(createParticle());
        }
      }

      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += 0.08 * delta;
        p.rotation += p.rotationSpeed * delta;

        // Remove quando sai da tela
        if (p.y > canvas.height + 30) {
          particles.splice(i, 1);
          continue;
        }

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

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [stop]);

  return {
    launch,
    stop,
  };
}
