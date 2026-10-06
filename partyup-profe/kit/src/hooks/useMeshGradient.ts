/**
 * Shared mesh gradient animation hook for prompt cards
 *
 * Provides animated mesh gradient points and darkened color palettes.
 * Used by PhotoPromptCard and NotePromptCard for their background effects.
 */

import { useCallback, useRef, useState } from 'react';
import {
  runOnJS,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

export const MESH_COLUMNS = 4;
export const MESH_ROWS = 4;

const TWO_PI = 2 * Math.PI;
const MESH_DARKEN_FACTOR = 0.85;

const MESH_POINTS_BASE = [
  [0, 0], [0.3, 0], [0.7, 0], [1, 0],
  [0, 0.3], [0.7, 0.4], [0.2, 0.2], [1, 0.3],
  [0, 0.7], [0.3, 0.8], [0.7, 0.6], [1, 0.7],
  [0, 1], [0.3, 1], [0.7, 1], [1, 1],
];

// Inner point indices that animate
const ANIMATED_INDICES = [5, 6, 9, 10];

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

/** Darken a hex color array for mesh gradient display */
export function darkenColors(baseColors: string[]): string[] {
  return baseColors.map((hex) => {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * MESH_DARKEN_FACTOR, g * MESH_DARKEN_FACTOR, b * MESH_DARKEN_FACTOR);
  });
}

function computeMeshPoints(t: number): number[][] {
  const offset = 0.1;
  const ox = Math.sin(t) * offset;
  const oy = Math.cos(t) * offset;
  const pts = MESH_POINTS_BASE.map(p => [p[0], p[1]]);
  for (const i of ANIMATED_INDICES) {
    pts[i][0] = Math.max(0, Math.min(1, pts[i][0] + ox));
    pts[i][1] = Math.max(0, Math.min(1, pts[i][1] + oy));
  }
  return pts;
}

/**
 * Hook that provides animated mesh gradient points and processed colors.
 * @param colors - Pre-darkened color array (16 colors for 4x4 grid)
 */
export function useMeshGradient(colors: string[]) {
  const time = useSharedValue(0);
  const [points, setPoints] = useState(() => computeMeshPoints(0));
  const lastUpdate = useRef(0);

  useFrameCallback((info) => {
    'worklet';
    const delta = info.timeSincePreviousFrame ?? 16;
    time.value = (time.value + (delta / 28000) * TWO_PI) % TWO_PI;
  }, true);

  const sync = useCallback((t: number) => {
    const now = Date.now();
    if (now - lastUpdate.current < 16) return;
    lastUpdate.current = now;
    setPoints(computeMeshPoints(((t % TWO_PI) + TWO_PI) % TWO_PI));
  }, []);

  useAnimatedReaction(() => time.value, (t) => { runOnJS(sync)(t); }, [sync]);

  return { points, colors };
}
