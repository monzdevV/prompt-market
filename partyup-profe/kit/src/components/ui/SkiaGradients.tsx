/**
 * Skia Gradients Collection - Apple Music Style
 * ==============================================
 * Diferentes tipos de gradients animados con Skia
 * Estilo Apple Music / Spotify premium
 */

import {
    Blur,
    Canvas,
    Circle,
    Fill,
    Group,
    LinearGradient,
    Rect,
    SweepGradient,
    vec,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================
// TYPES
// ============================================

interface BaseGradientProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
  duration?: number;
}

interface GradientButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "aurora" | "sunset" | "ocean";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  style?: ViewStyle;
}

// ============================================
// 1. SOLID CIRCLES - Círculos sólidos sin degradado (el que te gustó)
// ============================================

export function SolidCirclesGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 8000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  // Circle 1 - Coral/Salmon
  const c1X = useDerivedValue(() => {
    const t = progress.value;
    return width * 0.25 + Math.sin(t * Math.PI * 2) * width * 0.2;
  });
  const c1Y = useDerivedValue(() => {
    const t = progress.value;
    return height * 0.2 + Math.cos(t * Math.PI * 2) * height * 0.15;
  });

  // Circle 2 - Pink
  const c2X = useDerivedValue(() => {
    const t = progress.value;
    return width * 0.7 + Math.cos(t * Math.PI * 2 + 1) * width * 0.15;
  });
  const c2Y = useDerivedValue(() => {
    const t = progress.value;
    return height * 0.35 + Math.sin(t * Math.PI * 2 + 0.5) * height * 0.2;
  });

  // Circle 3 - Orange
  const c3X = useDerivedValue(() => {
    const t = progress.value;
    return width * 0.4 + Math.sin(t * Math.PI * 2 + 2) * width * 0.25;
  });
  const c3Y = useDerivedValue(() => {
    const t = progress.value;
    return height * 0.65 + Math.cos(t * Math.PI * 2 + 1.5) * height * 0.18;
  });

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0a0a0b" />
      <Group blendMode="screen">
        {/* Large coral circle */}
        <Group>
          <Circle cx={c1X} cy={c1Y} r={width * 0.55} color="#e8847080" />
          <Blur blur={60} />
        </Group>
        {/* Pink circle */}
        <Group>
          <Circle cx={c2X} cy={c2Y} r={width * 0.45} color="#d4567070" />
          <Blur blur={50} />
        </Group>
        {/* Orange accent */}
        <Group>
          <Circle cx={c3X} cy={c3Y} r={width * 0.4} color="#e8956860" />
          <Blur blur={55} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 2. MESH BLOB - Blobs orgánicos estilo Apple Music (MEJORADO)
// ============================================

export function MeshBlobGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 10000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [duration]);

  // Blob positions
  const blob1X = useDerivedValue(
    () => width * 0.3 + Math.sin(progress.value * Math.PI * 2) * width * 0.2,
  );
  const blob1Y = useDerivedValue(
    () =>
      height * 0.25 +
      Math.cos(progress.value * Math.PI * 2 * 0.7) * height * 0.15,
  );

  const blob2X = useDerivedValue(
    () =>
      width * 0.7 + Math.cos(progress.value * Math.PI * 2 + 1) * width * 0.15,
  );
  const blob2Y = useDerivedValue(
    () =>
      height * 0.5 +
      Math.sin(progress.value * Math.PI * 2 * 1.3) * height * 0.2,
  );

  const blob3X = useDerivedValue(
    () =>
      width * 0.4 +
      Math.sin(progress.value * Math.PI * 2 * 0.5 + 2) * width * 0.25,
  );
  const blob3Y = useDerivedValue(
    () =>
      height * 0.75 +
      Math.cos(progress.value * Math.PI * 2 + 0.5) * height * 0.1,
  );

  const blob4X = useDerivedValue(
    () =>
      width * 0.6 + Math.cos(progress.value * Math.PI * 2 * 0.8) * width * 0.2,
  );
  const blob4Y = useDerivedValue(
    () =>
      height * 0.35 +
      Math.sin(progress.value * Math.PI * 2 + 3) * height * 0.15,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0a0a0b" />
      <Group blendMode="plus">
        {/* Blob Rosa - más grande y visible */}
        <Group>
          <Circle
            cx={blob1X}
            cy={blob1Y}
            r={width * 0.6}
            color="#ff6b9d"
            opacity={0.6}
          />
          <Blur blur={80} />
        </Group>
        {/* Blob Cyan */}
        <Group>
          <Circle
            cx={blob2X}
            cy={blob2Y}
            r={width * 0.55}
            color="#4ecdc4"
            opacity={0.55}
          />
          <Blur blur={75} />
        </Group>
        {/* Blob Púrpura */}
        <Group>
          <Circle
            cx={blob3X}
            cy={blob3Y}
            r={width * 0.5}
            color="#a855f7"
            opacity={0.5}
          />
          <Blur blur={70} />
        </Group>
        {/* Blob Naranja */}
        <Group>
          <Circle
            cx={blob4X}
            cy={blob4Y}
            r={width * 0.45}
            color="#f97316"
            opacity={0.45}
          />
          <Blur blur={65} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 3. LAVA LAMP - Blobs flotantes (MEJORADO)
// ============================================

export function LavaLampGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 12000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [duration]);

  // Lava blobs con movimiento vertical
  const lava1X = useDerivedValue(
    () => width * 0.35 + Math.sin(progress.value * Math.PI * 2) * width * 0.15,
  );
  const lava1Y = useDerivedValue(
    () =>
      height * 0.2 +
      Math.pow(Math.sin(progress.value * Math.PI), 2) * height * 0.5,
  );

  const lava2X = useDerivedValue(
    () =>
      width * 0.65 - Math.cos(progress.value * Math.PI * 2 + 1) * width * 0.12,
  );
  const lava2Y = useDerivedValue(
    () =>
      height * 0.8 -
      Math.pow(Math.sin(progress.value * Math.PI + 0.5), 2) * height * 0.45,
  );

  const lava3X = useDerivedValue(
    () =>
      width * 0.5 + Math.sin(progress.value * Math.PI * 1.5 + 2) * width * 0.2,
  );
  const lava3Y = useDerivedValue(
    () => height * 0.5 + Math.cos(progress.value * Math.PI * 2) * height * 0.25,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0f0515" />
      <Group blendMode="plus">
        {/* Blob Rosa caliente - GRANDE */}
        <Group>
          <Circle
            cx={lava1X}
            cy={lava1Y}
            r={width * 0.5}
            color="#ff1493"
            opacity={0.7}
          />
          <Blur blur={70} />
        </Group>
        {/* Blob Naranja */}
        <Group>
          <Circle
            cx={lava2X}
            cy={lava2Y}
            r={width * 0.45}
            color="#ff6b00"
            opacity={0.65}
          />
          <Blur blur={65} />
        </Group>
        {/* Blob Púrpura */}
        <Group>
          <Circle
            cx={lava3X}
            cy={lava3Y}
            r={width * 0.4}
            color="#9333ea"
            opacity={0.6}
          />
          <Blur blur={60} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 4. AURORA BOREALIS - Ondas lineales
// ============================================

export function AuroraGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 10000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const angle = useDerivedValue(() => progress.value * Math.PI * 2);

  const start1 = useDerivedValue(() =>
    vec(
      width * 0.5 + Math.cos(angle.value) * width * 0.5,
      height * 0.2 + Math.sin(angle.value) * height * 0.1,
    ),
  );
  const end1 = useDerivedValue(() =>
    vec(
      width * 0.5 + Math.cos(angle.value + Math.PI) * width * 0.5,
      height * 0.8 + Math.sin(angle.value) * height * 0.1,
    ),
  );

  const start2 = useDerivedValue(() =>
    vec(
      width * 0.3 + Math.sin(angle.value + Math.PI / 3) * width * 0.4,
      height * 0.1,
    ),
  );
  const end2 = useDerivedValue(() =>
    vec(
      width * 0.7 - Math.sin(angle.value + Math.PI / 3) * width * 0.4,
      height * 0.9,
    ),
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0a0a0b" />
      <Group blendMode="screen">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={start1}
            end={end1}
            colors={["#22c55e90", "transparent", "#22c55e50"]}
          />
        </Rect>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={start2}
            end={end2}
            colors={["#3b82f690", "transparent", "#8b5cf650"]}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}

// ============================================
// 5. ALBUM GLOW - Estilo portada de álbum (Apple Music)
// ============================================

export function AlbumGlowGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 8000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  // Glow principal centrado arriba (como la portada)
  const glowY = useDerivedValue(
    () =>
      height * 0.25 + Math.sin(progress.value * Math.PI * 2) * height * 0.05,
  );
  const glowScale = useDerivedValue(
    () => 1 + Math.sin(progress.value * Math.PI * 4) * 0.1,
  );

  // Reflejos secundarios
  const reflect1X = useDerivedValue(
    () => width * 0.2 + Math.cos(progress.value * Math.PI * 2) * width * 0.1,
  );
  const reflect2X = useDerivedValue(
    () => width * 0.8 - Math.cos(progress.value * Math.PI * 2) * width * 0.1,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0a0a0b" />

      {/* Glow principal - azul intenso */}
      <Group blendMode="screen">
        <Group>
          <Circle
            cx={width * 0.5}
            cy={glowY}
            r={width * 0.7}
            color="#1e40af"
            opacity={0.7}
          />
          <Blur blur={100} />
        </Group>
        {/* Capa cyan */}
        <Group>
          <Circle
            cx={width * 0.5}
            cy={glowY}
            r={width * 0.5}
            color="#0891b2"
            opacity={0.5}
          />
          <Blur blur={80} />
        </Group>
      </Group>

      {/* Reflejos laterales */}
      <Group blendMode="plus">
        <Group>
          <Circle
            cx={reflect1X}
            cy={height * 0.6}
            r={width * 0.35}
            color="#7c3aed"
            opacity={0.3}
          />
          <Blur blur={60} />
        </Group>
        <Group>
          <Circle
            cx={reflect2X}
            cy={height * 0.7}
            r={width * 0.3}
            color="#be185d"
            opacity={0.25}
          />
          <Blur blur={55} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 6. VINYL HEAT - Degradado cálido tipo vinilo
// ============================================

export function VinylHeatGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 9000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [duration]);

  const blob1Y = useDerivedValue(
    () => height * 0.3 + Math.sin(progress.value * Math.PI * 2) * height * 0.15,
  );
  const blob2Y = useDerivedValue(
    () =>
      height * 0.6 + Math.cos(progress.value * Math.PI * 2 + 1) * height * 0.12,
  );
  const blob3X = useDerivedValue(
    () =>
      width * 0.5 + Math.sin(progress.value * Math.PI * 2 + 0.5) * width * 0.2,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0f0a05" />
      <Group blendMode="plus">
        {/* Naranja cálido */}
        <Group>
          <Circle
            cx={width * 0.3}
            cy={blob1Y}
            r={width * 0.5}
            color="#ea580c"
            opacity={0.6}
          />
          <Blur blur={70} />
        </Group>
        {/* Rojo profundo */}
        <Group>
          <Circle
            cx={width * 0.7}
            cy={blob2Y}
            r={width * 0.45}
            color="#dc2626"
            opacity={0.55}
          />
          <Blur blur={65} />
        </Group>
        {/* Amarillo acento */}
        <Group>
          <Circle
            cx={blob3X}
            cy={height * 0.75}
            r={width * 0.35}
            color="#f59e0b"
            opacity={0.4}
          />
          <Blur blur={60} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 7. OCEAN DEEP - Azules profundos
// ============================================

export function OceanDeepGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 11000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const wave1Y = useDerivedValue(
    () => height * 0.25 + Math.sin(progress.value * Math.PI * 2) * height * 0.1,
  );
  const wave2Y = useDerivedValue(
    () =>
      height * 0.5 +
      Math.sin(progress.value * Math.PI * 2 + Math.PI / 2) * height * 0.12,
  );
  const wave3Y = useDerivedValue(
    () =>
      height * 0.75 +
      Math.sin(progress.value * Math.PI * 2 + Math.PI) * height * 0.08,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#020617" />
      <Group blendMode="plus">
        <Group>
          <Circle
            cx={width * 0.3}
            cy={wave1Y}
            r={width * 0.6}
            color="#0369a1"
            opacity={0.6}
          />
          <Blur blur={80} />
        </Group>
        <Group>
          <Circle
            cx={width * 0.7}
            cy={wave2Y}
            r={width * 0.5}
            color="#0e7490"
            opacity={0.5}
          />
          <Blur blur={70} />
        </Group>
        <Group>
          <Circle
            cx={width * 0.5}
            cy={wave3Y}
            r={width * 0.45}
            color="#4f46e5"
            opacity={0.45}
          />
          <Blur blur={65} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 8. NEON CITY - Colores neón vibrantes
// ============================================

export function NeonCityGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 7000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [duration]);

  const neon1X = useDerivedValue(
    () => width * 0.25 + Math.sin(progress.value * Math.PI * 2) * width * 0.15,
  );
  const neon2X = useDerivedValue(
    () => width * 0.75 - Math.cos(progress.value * Math.PI * 2) * width * 0.15,
  );
  const neon3Y = useDerivedValue(
    () =>
      height * 0.5 + Math.sin(progress.value * Math.PI * 2 + 1) * height * 0.2,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0a0a0f" />
      <Group blendMode="screen">
        {/* Magenta neón */}
        <Group>
          <Circle
            cx={neon1X}
            cy={height * 0.3}
            r={width * 0.5}
            color="#ff00ff"
            opacity={0.5}
          />
          <Blur blur={70} />
        </Group>
        {/* Cyan neón */}
        <Group>
          <Circle
            cx={neon2X}
            cy={height * 0.6}
            r={width * 0.45}
            color="#00ffff"
            opacity={0.45}
          />
          <Blur blur={65} />
        </Group>
        {/* Verde neón */}
        <Group>
          <Circle
            cx={width * 0.5}
            cy={neon3Y}
            r={width * 0.4}
            color="#00ff88"
            opacity={0.4}
          />
          <Blur blur={60} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 9. COSMIC DUST - Púrpuras cósmicos
// ============================================

export function CosmicDustGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 13000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const dust1X = useDerivedValue(
    () => width * 0.35 + Math.sin(progress.value * Math.PI * 2) * width * 0.2,
  );
  const dust1Y = useDerivedValue(
    () => height * 0.3 + Math.cos(progress.value * Math.PI * 2) * height * 0.15,
  );
  const dust2X = useDerivedValue(
    () =>
      width * 0.65 + Math.cos(progress.value * Math.PI * 2 + 1) * width * 0.15,
  );
  const dust2Y = useDerivedValue(
    () =>
      height * 0.55 +
      Math.sin(progress.value * Math.PI * 2 + 0.5) * height * 0.18,
  );
  const dust3Y = useDerivedValue(
    () =>
      height * 0.8 + Math.sin(progress.value * Math.PI * 2 + 2) * height * 0.1,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0c0015" />
      <Group blendMode="plus">
        {/* Púrpura profundo */}
        <Group>
          <Circle
            cx={dust1X}
            cy={dust1Y}
            r={width * 0.55}
            color="#7c3aed"
            opacity={0.6}
          />
          <Blur blur={75} />
        </Group>
        {/* Rosa cósmico */}
        <Group>
          <Circle
            cx={dust2X}
            cy={dust2Y}
            r={width * 0.5}
            color="#c026d3"
            opacity={0.5}
          />
          <Blur blur={70} />
        </Group>
        {/* Azul índigo */}
        <Group>
          <Circle
            cx={width * 0.4}
            cy={dust3Y}
            r={width * 0.4}
            color="#4338ca"
            opacity={0.45}
          />
          <Blur blur={60} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 10. SUNSET GLOW - Atardecer suave
// ============================================

export function SunsetGlowGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 10000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [duration]);

  const sunY = useDerivedValue(
    () =>
      height * 0.35 + Math.sin(progress.value * Math.PI * 2) * height * 0.08,
  );
  const cloud1X = useDerivedValue(
    () => width * 0.25 + Math.cos(progress.value * Math.PI * 2) * width * 0.1,
  );
  const cloud2X = useDerivedValue(
    () => width * 0.75 - Math.cos(progress.value * Math.PI * 2) * width * 0.1,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0f0805" />
      <Group blendMode="plus">
        {/* Sol principal */}
        <Group>
          <Circle
            cx={width * 0.5}
            cy={sunY}
            r={width * 0.6}
            color="#f97316"
            opacity={0.65}
          />
          <Blur blur={90} />
        </Group>
        {/* Nubes rosadas */}
        <Group>
          <Circle
            cx={cloud1X}
            cy={height * 0.5}
            r={width * 0.4}
            color="#ec4899"
            opacity={0.45}
          />
          <Blur blur={60} />
        </Group>
        <Group>
          <Circle
            cx={cloud2X}
            cy={height * 0.6}
            r={width * 0.35}
            color="#f43f5e"
            opacity={0.4}
          />
          <Blur blur={55} />
        </Group>
        {/* Horizonte púrpura */}
        <Group>
          <Circle
            cx={width * 0.5}
            cy={height * 0.85}
            r={width * 0.5}
            color="#7c2d12"
            opacity={0.35}
          />
          <Blur blur={70} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 11. SWEEP RAINBOW - Gradient circular
// ============================================

export function SweepRainbowGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 15000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [duration]);

  const centerX = useDerivedValue(
    () => width * 0.5 + Math.sin(progress.value * Math.PI * 4) * width * 0.1,
  );
  const centerY = useDerivedValue(
    () => height * 0.5 + Math.cos(progress.value * Math.PI * 3) * height * 0.08,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0a0a0b" />
      <Group blendMode="screen" opacity={0.8}>
        <Group>
          <Circle cx={centerX} cy={centerY} r={Math.max(width, height) * 0.7}>
            <SweepGradient
              c={vec(0, 0)}
              colors={[
                "#ff6b6b90",
                "#feca5790",
                "#4ecdc490",
                "#45b7d190",
                "#a855f790",
                "#ff6b9d90",
                "#ff6b6b90",
              ]}
            />
          </Circle>
          <Blur blur={80} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 12. APPLE MESH GRADIENT - Movimiento lento, cortes duros, sin fondo negro
// Ideal para fondos de botones y cards estilo Apple moderno
// ============================================

interface AppleMeshGradientProps extends BaseGradientProps {
  colors?: string[];
  blurAmount?: number;
}

export function AppleMeshGradient({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 25000, // Muy lento
  colors,
  blurAmount = 15, // Blur bajo para cortes más duros
}: AppleMeshGradientProps) {
  const progress = useSharedValue(0);

  // Colores por defecto: paleta Apple vibrante
  const meshColors = colors || [
    "#5E5CE6", // Indigo Apple
    "#BF5AF2", // Purple Apple
    "#FF2D55", // Pink Apple
    "#FF9500", // Orange Apple
    "#30D158", // Green Apple
    "#00C7BE", // Teal Apple
  ];

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  // Posiciones de los blobs - movimiento suave y lento
  const blob1X = useDerivedValue(
    () => width * 0.15 + Math.sin(progress.value * Math.PI * 2) * width * 0.15,
  );
  const blob1Y = useDerivedValue(
    () =>
      height * 0.2 +
      Math.cos(progress.value * Math.PI * 2 * 0.6) * height * 0.12,
  );

  const blob2X = useDerivedValue(
    () =>
      width * 0.85 +
      Math.cos(progress.value * Math.PI * 2 + 0.8) * width * 0.12,
  );
  const blob2Y = useDerivedValue(
    () =>
      height * 0.25 +
      Math.sin(progress.value * Math.PI * 2 * 0.8) * height * 0.1,
  );

  const blob3X = useDerivedValue(
    () =>
      width * 0.5 +
      Math.sin(progress.value * Math.PI * 2 * 0.4 + 1.5) * width * 0.2,
  );
  const blob3Y = useDerivedValue(
    () =>
      height * 0.5 +
      Math.cos(progress.value * Math.PI * 2 * 0.5) * height * 0.15,
  );

  const blob4X = useDerivedValue(
    () =>
      width * 0.2 +
      Math.cos(progress.value * Math.PI * 2 * 0.7 + 2) * width * 0.15,
  );
  const blob4Y = useDerivedValue(
    () =>
      height * 0.75 +
      Math.sin(progress.value * Math.PI * 2 * 0.6) * height * 0.1,
  );

  const blob5X = useDerivedValue(
    () =>
      width * 0.8 +
      Math.sin(progress.value * Math.PI * 2 * 0.5 + 3) * width * 0.15,
  );
  const blob5Y = useDerivedValue(
    () =>
      height * 0.8 +
      Math.cos(progress.value * Math.PI * 2 * 0.7) * height * 0.08,
  );

  const blob6X = useDerivedValue(
    () =>
      width * 0.5 +
      Math.cos(progress.value * Math.PI * 2 * 0.3 + 4) * width * 0.25,
  );
  const blob6Y = useDerivedValue(
    () =>
      height * 0.1 +
      Math.sin(progress.value * Math.PI * 2 * 0.4) * height * 0.05,
  );

  return (
    <Canvas style={[styles.canvasFill, { width, height }, style]}>
      {/* Sin Fill negro - los colores ocupan todo */}
      <Group blendMode="screen">
        {/* Blob 1 - Indigo */}
        <Group>
          <Circle
            cx={blob1X}
            cy={blob1Y}
            r={width * 0.7}
            color={meshColors[0]}
            opacity={0.85}
          />
          <Blur blur={blurAmount} />
        </Group>
        {/* Blob 2 - Purple */}
        <Group>
          <Circle
            cx={blob2X}
            cy={blob2Y}
            r={width * 0.65}
            color={meshColors[1]}
            opacity={0.8}
          />
          <Blur blur={blurAmount} />
        </Group>
        {/* Blob 3 - Pink */}
        <Group>
          <Circle
            cx={blob3X}
            cy={blob3Y}
            r={width * 0.6}
            color={meshColors[2]}
            opacity={0.75}
          />
          <Blur blur={blurAmount * 1.2} />
        </Group>
        {/* Blob 4 - Orange */}
        <Group>
          <Circle
            cx={blob4X}
            cy={blob4Y}
            r={width * 0.55}
            color={meshColors[3]}
            opacity={0.7}
          />
          <Blur blur={blurAmount} />
        </Group>
        {/* Blob 5 - Green */}
        <Group>
          <Circle
            cx={blob5X}
            cy={blob5Y}
            r={width * 0.5}
            color={meshColors[4]}
            opacity={0.65}
          />
          <Blur blur={blurAmount * 0.8} />
        </Group>
        {/* Blob 6 - Teal */}
        <Group>
          <Circle
            cx={blob6X}
            cy={blob6Y}
            r={width * 0.45}
            color={meshColors[5]}
            opacity={0.6}
          />
          <Blur blur={blurAmount} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// APPLE MESH BUTTON - Botón con AppleMeshGradient de fondo
// ============================================

// Gradient específico para botones - más notorio y llamativo
function ButtonMeshGradient({
  width,
  height,
  colors,
  duration = 8000,
}: {
  width: number;
  height: number;
  colors?: string[];
  duration?: number;
}) {
  const progress = useSharedValue(0);

  // Colores más saturados y vibrantes para botones
  const meshColors = colors || [
    "#7B68EE", // Morado vibrante
    "#FF6B9D", // Rosa intenso
    "#00D4FF", // Cyan brillante
    "#FF8C42", // Naranja fuego
    "#7B68EE", // Loop back
  ];

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [duration]);

  // Posiciones animadas para el centro del sweep gradient
  const centerX = useDerivedValue(
    () => width * 0.3 + Math.sin(progress.value * Math.PI * 2) * width * 0.4,
  );

  // Offset del gradient lineal
  const gradientOffset = useDerivedValue(() => progress.value * width * 2);

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]}>
      {/* Fondo base con gradient lineal animado */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(-width + gradientOffset.value, 0)}
          end={vec(width + gradientOffset.value, height)}
          colors={meshColors}
        />
      </Rect>
      {/* Capa adicional con sweep para más profundidad */}
      <Group blendMode="overlay" opacity={0.6}>
        <Circle cx={centerX} cy={height / 2} r={width * 0.8}>
          <SweepGradient
            c={vec(0, 0)}
            colors={[
              meshColors[0] + "CC",
              meshColors[1] + "CC",
              meshColors[2] + "CC",
              meshColors[0] + "CC",
            ]}
          />
        </Circle>
        <Blur blur={8} />
      </Group>
      {/* Highlights brillantes */}
      <Group blendMode="screen" opacity={0.4}>
        <Circle
          cx={width * 0.2}
          cy={height * 0.3}
          r={height * 0.6}
          color="#FFFFFF"
          opacity={0.3}
        />
        <Blur blur={15} />
      </Group>
    </Canvas>
  );
}

interface AppleMeshButtonProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  size?: "small" | "medium" | "large" | "xl";
  disabled?: boolean;
  style?: ViewStyle;
  colors?: string[];
}

const MESH_BUTTON_SIZES = {
  small: {
    height: 44,
    paddingHorizontal: 20,
    fontSize: 15,
    subtitleSize: 11,
    borderRadius: 12,
    iconSize: 16,
  },
  medium: {
    height: 56,
    paddingHorizontal: 28,
    fontSize: 17,
    subtitleSize: 12,
    borderRadius: 14,
    iconSize: 18,
  },
  large: {
    height: 64,
    paddingHorizontal: 32,
    fontSize: 19,
    subtitleSize: 13,
    borderRadius: 16,
    iconSize: 20,
  },
  xl: {
    height: 80,
    paddingHorizontal: 40,
    fontSize: 22,
    subtitleSize: 14,
    borderRadius: 20,
    iconSize: 24,
  },
};

export function AppleMeshButton({
  title,
  subtitle,
  onPress,
  size = "medium",
  disabled = false,
  style,
  colors,
}: AppleMeshButtonProps) {
  const pressed = useSharedValue(0);
  const sizeConfig = MESH_BUTTON_SIZES[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
  }));

  const handlePressIn = () => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        animatedStyle,
        {
          height: sizeConfig.height,
          borderRadius: sizeConfig.borderRadius,
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
          ...Platform.select({
            ios: {
              shadowColor: "#5E5CE6",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
            },
            android: { elevation: 12 },
          }),
        },
        style,
      ]}
    >
      {/* Gradient de fondo - más notorio para botones */}
      <ButtonMeshGradient
        width={400}
        height={sizeConfig.height}
        duration={6000}
        colors={colors}
      />
      {/* Borde interior brillante */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: sizeConfig.borderRadius,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.25)",
          },
        ]}
      />
      {/* Contenido */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: sizeConfig.paddingHorizontal,
        }}
      >
        <Text
          style={{
            fontSize: sizeConfig.fontSize,
            fontWeight: "600",
            color: "#FFFFFF",
            letterSpacing: -0.3,
            textShadowColor: "rgba(0, 0, 0, 0.3)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontSize: sizeConfig.subtitleSize,
              fontWeight: "500",
              color: "rgba(255, 255, 255, 0.8)",
              marginTop: 2,
              letterSpacing: -0.2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

// ============================================
// GRADIENT BUTTON - Estilo Apple moderno
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BUTTON_VARIANTS = {
  primary: { colors: ["#007AFF", "#5856D6"], shadowColor: "#007AFF" },
  secondary: { colors: ["#34C759", "#30D158"], shadowColor: "#34C759" },
  aurora: { colors: ["#5E5CE6", "#BF5AF2", "#FF2D55"], shadowColor: "#BF5AF2" },
  sunset: { colors: ["#FF9500", "#FF3B30"], shadowColor: "#FF6B00" },
  ocean: { colors: ["#00C7BE", "#007AFF", "#5856D6"], shadowColor: "#007AFF" },
};

const BUTTON_SIZES = {
  small: { height: 40, paddingHorizontal: 20, fontSize: 14, borderRadius: 12 },
  medium: { height: 50, paddingHorizontal: 28, fontSize: 16, borderRadius: 14 },
  large: { height: 58, paddingHorizontal: 36, fontSize: 18, borderRadius: 16 },
};

export function GradientButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  style,
}: GradientButtonProps) {
  const pressed = useSharedValue(0);
  const config = BUTTON_VARIANTS[variant];
  const sizeConfig = BUTTON_SIZES[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.96]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.9]),
  }));

  const handlePressIn = () => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        animatedStyle,
        {
          height: sizeConfig.height,
          borderRadius: sizeConfig.borderRadius,
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
          ...Platform.select({
            ios: {
              shadowColor: config.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
            },
            android: { elevation: 8 },
          }),
        },
        style,
      ]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={300} height={sizeConfig.height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(300, 0)}
            colors={config.colors}
          />
        </Rect>
      </Canvas>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: sizeConfig.borderRadius,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
        ]}
      />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: sizeConfig.paddingHorizontal,
        }}
      >
        <Text
          style={{
            fontSize: sizeConfig.fontSize,
            fontWeight: "600",
            color: "#FFFFFF",
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
      </View>
    </AnimatedPressable>
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
  canvasFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default {
  SolidCirclesGradient,
  MeshBlobGradient,
  LavaLampGradient,
  AuroraGradient,
  AlbumGlowGradient,
  VinylHeatGradient,
  OceanDeepGradient,
  NeonCityGradient,
  CosmicDustGradient,
  SunsetGlowGradient,
  SweepRainbowGradient,
  AppleMeshGradient,
  AppleMeshButton,
  GradientButton,
};
