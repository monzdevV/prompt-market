/**
 * Skia Mesh Gradient Component
 * ============================
 * Mesh gradient animado usando React Native Skia
 * Efecto estilo Spotify/Apple Music
 */

import {
    Canvas,
    Circle,
    Group,
    RadialGradient,
    vec
} from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, ViewStyle } from "react-native";
import {
    Easing,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================
// TYPES
// ============================================

interface SkiaMeshGradientProps {
  /** Colores para los gradients radiales */
  colors?: string[][];
  /** Duración de la animación en ms */
  duration?: number;
  /** Estilo del contenedor */
  style?: ViewStyle;
  /** Ancho personalizado */
  width?: number;
  /** Alto personalizado */
  height?: number;
  /** Radio del gradient (multiplicador) */
  radiusMultiplier?: number;
}

// ============================================
// DEFAULT COLORS - Spotify vibes
// ============================================

const DEFAULT_COLORS = [
  ["#ff7aa2", "transparent"], // Rosa cálido
  ["#6ecbff", "transparent"], // Azul cielo
  ["#9b8cff", "transparent"], // Púrpura suave
];

// Colores oscuros estilo Spotify
const SPOTIFY_COLORS = [
  ["#ff6b9d", "transparent"], // Rosa
  ["#4ecdc4", "transparent"], // Turquesa
  ["#a855f7", "transparent"], // Púrpura
];

// ============================================
// MAIN COMPONENT
// ============================================

export function SkiaMeshGradient({
  colors = DEFAULT_COLORS,
  duration = 8000,
  style,
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  radiusMultiplier = 0.7,
}: SkiaMeshGradientProps) {
  // Valores animados con Reanimated
  const progress = useSharedValue(0);

  // Animación continua suave
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1, // Repetir infinitamente
      true, // Reverse
    );
  }, [duration]);

  // Derivar posiciones de los centros basados en el progreso
  const c1X = useDerivedValue(() => {
    const t = progress.value;
    return width * 0.2 + Math.sin(t * Math.PI * 2) * width * 0.3;
  });

  const c1Y = useDerivedValue(() => {
    const t = progress.value;
    return height * 0.3 + Math.cos(t * Math.PI * 2) * height * 0.2;
  });

  const c2X = useDerivedValue(() => {
    const t = progress.value;
    return width * 0.8 - Math.sin(t * Math.PI * 2 + 1) * width * 0.25;
  });

  const c2Y = useDerivedValue(() => {
    const t = progress.value;
    return height * 0.4 + Math.sin(t * Math.PI * 2 + 2) * height * 0.25;
  });

  const c3X = useDerivedValue(() => {
    const t = progress.value;
    return width * 0.4 + Math.cos(t * Math.PI * 2 + 0.5) * width * 0.35;
  });

  const c3Y = useDerivedValue(() => {
    const t = progress.value;
    return height * 0.8 - Math.sin(t * Math.PI * 2) * height * 0.3;
  });

  const radius = width * radiusMultiplier;

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Group blendMode="screen">
        <Circle cx={c1X} cy={c1Y} r={radius}>
          <RadialGradient
            c={vec(0, 0)}
            r={radius}
            colors={colors[0] || DEFAULT_COLORS[0]}
          />
        </Circle>
        <Circle cx={c2X} cy={c2Y} r={radius}>
          <RadialGradient
            c={vec(0, 0)}
            r={radius}
            colors={colors[1] || DEFAULT_COLORS[1]}
          />
        </Circle>
        <Circle cx={c3X} cy={c3Y} r={radius}>
          <RadialGradient
            c={vec(0, 0)}
            r={radius}
            colors={colors[2] || DEFAULT_COLORS[2]}
          />
        </Circle>
      </Group>
    </Canvas>
  );
}

// ============================================
// VARIANT: Dark Spotify Style
// ============================================

export function SpotifyMeshGradient(
  props: Omit<SkiaMeshGradientProps, "colors">,
) {
  return (
    <SkiaMeshGradient
      {...props}
      colors={SPOTIFY_COLORS}
      duration={10000}
      radiusMultiplier={0.8}
    />
  );
}

// ============================================
// VARIANT: Neon Glow
// ============================================

const NEON_COLORS = [
  ["#00ff87", "transparent"], // Verde neón
  ["#60efff", "transparent"], // Cyan
  ["#ff00ff", "transparent"], // Magenta
];

export function NeonMeshGradient(props: Omit<SkiaMeshGradientProps, "colors">) {
  return (
    <SkiaMeshGradient
      {...props}
      colors={NEON_COLORS}
      duration={6000}
      radiusMultiplier={0.65}
    />
  );
}

// ============================================
// VARIANT: Sunset Vibes
// ============================================

const SUNSET_COLORS = [
  ["#ff6b6b", "transparent"], // Coral
  ["#feca57", "transparent"], // Amarillo
  ["#ff9ff3", "transparent"], // Rosa suave
];

export function SunsetMeshGradient(
  props: Omit<SkiaMeshGradientProps, "colors">,
) {
  return (
    <SkiaMeshGradient
      {...props}
      colors={SUNSET_COLORS}
      duration={12000}
      radiusMultiplier={0.75}
    />
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});

export default SkiaMeshGradient;
