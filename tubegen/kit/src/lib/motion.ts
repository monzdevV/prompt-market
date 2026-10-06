import { Easing, interpolate } from "remotion";

// Curvas fuertes: las de CSS por defecto se quedan cortas.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 entre `from` y `from + dur` (en frames) con ease-out */
export const enter = (frame: number, from: number, dur: number) =>
  interpolate(frame, [from, from + dur], [0, 1], { ...clamp, easing: EASE_OUT });

/** 1 → 0 en los últimos `dur` frames de la escena */
export const exit = (frame: number, total: number, dur = 8) =>
  interpolate(frame, [total - dur, total], [1, 0], { ...clamp, easing: EASE_IN_OUT });

export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;

/** Unidad de diseño: 1 = 1px en un lienzo cuyo lado corto mide 1080 */
export const unit = (width: number, height: number) => Math.min(width, height) / 1080;
