"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo animado de la pantalla de acceso (Canvas 2D, sin librerías).
 *
 * Cientos de partículas siguen un campo de flujo (ruido suave que cambia con el tiempo) y dejan
 * estelas finas con los colores de Manny: cian → menta → amarillo según la
 * posición. El puntero las aparta un poco. Cada fotograma se oscurece el anterior en vez de
 * borrarlo, así las estelas se desvanecen solas.
 *
 * Cuidado con el rendimiento y la accesibilidad:
 *  - resolución limitada (devicePixelRatio ≤ 1.5) y nº de partículas según el tamaño;
 *  - se pausa si la pestaña no se ve;
 *  - con «reducir movimiento» se dibuja un único fotograma quieto.
 */

// Colores del degradado del logo
const STOPS = [
  [94, 233, 255],
  [142, 240, 198],
  [255, 225, 77],
] as const;

function brandColor(t: number, alpha: number) {
  const x = Math.min(0.999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const c = (k: number) => Math.round(a[k] + (b[k] - a[k]) * f);
  return `rgba(${c(0)},${c(1)},${c(2)},${alpha})`;
}

/** Ruido de valor 2D suavizado (rápido y suficiente para un campo de flujo). */
function makeNoise(seed = 7) {
  const P = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const fade = (t: number) => t * t * (3 - 2 * t);
  const val = (x: number, y: number) => P[(P[x & 255] + y) & 511] / 255;
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const top = val(xi, yi) + (val(xi + 1, yi) - val(xi, yi)) * xf;
    const bot = val(xi, yi + 1) + (val(xi + 1, yi + 1) - val(xi, yi + 1)) * xf;
    return top + (bot - top) * yf;
  };
}

export function FlowCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const noise = makeNoise();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    type P = { x: number; y: number; px: number; py: number; life: number };
    let parts: P[] = [];
    const pointer = { x: -9999, y: -9999 };
    let frame = 0;
    let t = 0;

    const spawn = (): P => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      return { x, y, px: x, py: y, life: 80 + Math.random() * 220 };
    };

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = "#0b0d0e";
      ctx!.fillRect(0, 0, w, h);
      const count = Math.min(900, Math.round((w * h) / 1400));
      parts = Array.from({ length: count }, spawn);
      for (let i = 0; i < 60; i++) step();
    }

    function step() {
      // Oscurecer el fotograma anterior: las estelas se desvanecen
      ctx!.fillStyle = "rgba(11,13,14,0.035)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.lineWidth = 1.3;
      ctx!.lineCap = "round";
      t += 0.0016;
      for (const p of parts) {
        const n = noise(p.x * 0.0022 + t * 3, p.y * 0.0022 - t * 2);
        const angle = n * Math.PI * 4;
        let vx = Math.cos(angle) * 1.4;
        let vy = Math.sin(angle) * 1.4;
        // El puntero aparta las partículas cercanas
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const push = (1 - Math.sqrt(d2) / 140) * 2.2;
          vx += (dx / (Math.sqrt(d2) + 0.01)) * push;
          vy += (dy / (Math.sqrt(d2) + 0.01)) * push;
        }
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy;
        p.life -= 1;
        const hue = (p.x / w) * 0.7 + (p.y / h) * 0.3;
        ctx!.strokeStyle = brandColor(hue, 0.7);
        ctx!.beginPath();
        ctx!.moveTo(p.px, p.py);
        ctx!.lineTo(p.x, p.y);
        ctx!.stroke();
        if (p.life <= 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) Object.assign(p, spawn());
      }
    }

    function loop() {
      step();
      frame = requestAnimationFrame(loop);
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(loop);
    };

    resize();
    // resize() ya deja estelas dibujadas; con «reducir movimiento» se queda en ese fotograma
    if (reduced) for (let i = 0; i < 100; i++) step();
    if (!reduced && !document.hidden) frame = requestAnimationFrame(loop);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
