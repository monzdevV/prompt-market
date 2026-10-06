"use client";

import { cancelFrame, frame } from "motion/react";
import { useEffect, useRef } from "react";

const rand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

// Bigger stars sit "closer": they move more with the scroll and drift faster, which gives the field depth.
const STARS = Array.from({ length: 170 }, (_, i) => {
  const r = 0.4 + rand(i + 11) ** 2.2 * 1.3;
  return {
    x: rand(i + 1),
    y: rand(i + 301),
    r,
    parallax: 0.02 + r * 0.14,
    drift: 2 + r * 6,
    alpha: 0.3 + rand(i + 601) * 0.6,
    twinkle: 0.4 + rand(i + 901) * 1.6,
    phase: rand(i + 1201) * Math.PI * 2,
    // Mostly cool white, with the indigo and amber specks of the DNA bokeh.
    color: rand(i + 1501) < 0.12 ? "#ffb35c" : rand(i + 1701) < 0.3 ? "#8f96ff" : "#eef1ff",
  };
});

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = ({ timestamp }: { timestamp: number }) => {
      const t = still ? 0 : timestamp / 1000;
      const sy = window.scrollY;
      ctx.clearRect(0, 0, w, h);
      for (const s of STARS) {
        const y = (((s.y * h - sy * s.parallax - t * s.drift) % h) + h) % h;
        ctx.globalAlpha = s.alpha * (0.6 + 0.4 * Math.sin(t * s.twinkle + s.phase));
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x * w, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    frame.render(draw, true);
    return () => {
      cancelFrame(draw);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[5] h-full w-full" />;
}
