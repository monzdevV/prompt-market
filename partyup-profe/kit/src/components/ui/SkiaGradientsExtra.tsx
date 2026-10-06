/**
 * Skia Gradients Extra - Mesh Variations + Apple Buttons with Real Blur
 * ======================================================================
 * Colección de mesh gradients con variaciones de blur y botones premium
 * Inspirado en Bump app y Apple iOS design
 */

import {
    Blur,
    Canvas,
    Circle,
    Fill,
    Group,
    LinearGradient,
    Rect,
    RoundedRect,
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

// ============================================
// 1. SOFT AQUA MESH - Inspirado en Bump (azules suaves)
// ============================================

export function SoftAquaMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 15000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const blob1X = useDerivedValue(
    () => width * 0.2 + Math.sin(progress.value * Math.PI * 2) * width * 0.15,
  );
  const blob1Y = useDerivedValue(
    () =>
      height * 0.3 +
      Math.cos(progress.value * Math.PI * 2 * 0.7) * height * 0.1,
  );
  const blob2X = useDerivedValue(
    () =>
      width * 0.8 + Math.cos(progress.value * Math.PI * 2 + 1) * width * 0.12,
  );
  const blob2Y = useDerivedValue(
    () =>
      height * 0.5 +
      Math.sin(progress.value * Math.PI * 2 * 0.8) * height * 0.15,
  );
  const blob3X = useDerivedValue(
    () =>
      width * 0.5 + Math.sin(progress.value * Math.PI * 2 * 0.5) * width * 0.2,
  );
  const blob3Y = useDerivedValue(
    () => height * 0.7 + Math.cos(progress.value * Math.PI * 2) * height * 0.08,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      {/* Fondo base azul claro */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["#E8F4FD", "#D4E9F7", "#C5E0F5"]}
        />
      </Rect>
      <Group blendMode="screen">
        {/* Blob cyan suave - blur muy alto */}
        <Group>
          <Circle
            cx={blob1X}
            cy={blob1Y}
            r={width * 0.7}
            color="#7DD3FC"
            opacity={0.6}
          />
          <Blur blur={100} />
        </Group>
        {/* Blob azul medio */}
        <Group>
          <Circle
            cx={blob2X}
            cy={blob2Y}
            r={width * 0.6}
            color="#60A5FA"
            opacity={0.5}
          />
          <Blur blur={80} />
        </Group>
        {/* Blob púrpura muy suave */}
        <Group>
          <Circle
            cx={blob3X}
            cy={blob3Y}
            r={width * 0.5}
            color="#C4B5FD"
            opacity={0.4}
          />
          <Blur blur={90} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 2. CRISP EDGE MESH - Blur bajo, bordes más definidos
// ============================================

export function CrispEdgeMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 12000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [duration]);

  const blob1X = useDerivedValue(
    () => width * 0.25 + Math.sin(progress.value * Math.PI * 2) * width * 0.2,
  );
  const blob1Y = useDerivedValue(
    () =>
      height * 0.25 +
      Math.cos(progress.value * Math.PI * 2 * 0.6) * height * 0.15,
  );
  const blob2X = useDerivedValue(
    () => width * 0.75 + Math.cos(progress.value * Math.PI * 2) * width * 0.15,
  );
  const blob2Y = useDerivedValue(
    () =>
      height * 0.6 +
      Math.sin(progress.value * Math.PI * 2 * 0.8) * height * 0.12,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#F0F4F8" />
      <Group blendMode="multiply">
        {/* Blob con blur bajo - bordes más visibles */}
        <Group>
          <Circle
            cx={blob1X}
            cy={blob1Y}
            r={width * 0.45}
            color="#93C5FD"
            opacity={0.8}
          />
          <Blur blur={25} />
        </Group>
        <Group>
          <Circle
            cx={blob2X}
            cy={blob2Y}
            r={width * 0.4}
            color="#A5B4FC"
            opacity={0.75}
          />
          <Blur blur={20} />
        </Group>
        {/* Acento con blur mínimo */}
        <Group>
          <Circle
            cx={width * 0.5}
            cy={height * 0.4}
            r={width * 0.3}
            color="#FCA5A5"
            opacity={0.5}
          />
          <Blur blur={15} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 3. DUAL BLUR MESH - Combina blurs extremos (muy alto + muy bajo)
// ============================================

export function DualBlurMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 18000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const softX = useDerivedValue(
    () => width * 0.3 + Math.sin(progress.value * Math.PI * 2) * width * 0.2,
  );
  const softY = useDerivedValue(
    () =>
      height * 0.4 +
      Math.cos(progress.value * Math.PI * 2 * 0.5) * height * 0.15,
  );
  const crispX = useDerivedValue(
    () =>
      width * 0.7 + Math.cos(progress.value * Math.PI * 2 + 1) * width * 0.15,
  );
  const crispY = useDerivedValue(
    () =>
      height * 0.6 +
      Math.sin(progress.value * Math.PI * 2 * 0.7) * height * 0.1,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#FAFBFC" />
      <Group blendMode="screen">
        {/* Capa ULTRA suave - blur 120 */}
        <Group>
          <Circle
            cx={softX}
            cy={softY}
            r={width * 0.8}
            color="#818CF8"
            opacity={0.5}
          />
          <Blur blur={120} />
        </Group>
        {/* Capa CRISP - blur 10 */}
        <Group>
          <Circle
            cx={crispX}
            cy={crispY}
            r={width * 0.25}
            color="#F472B6"
            opacity={0.7}
          />
          <Blur blur={10} />
        </Group>
        {/* Capa media */}
        <Group>
          <Circle
            cx={width * 0.5}
            cy={height * 0.3}
            r={width * 0.4}
            color="#22D3EE"
            opacity={0.4}
          />
          <Blur blur={50} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 4. BUMP STYLE MESH - Exacto estilo Bump app (azul agua)
// ============================================

export function BumpStyleMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 20000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const wave1X = useDerivedValue(
    () => width * 0.3 + Math.sin(progress.value * Math.PI * 2) * width * 0.15,
  );
  const wave1Y = useDerivedValue(
    () =>
      height * 0.35 +
      Math.cos(progress.value * Math.PI * 2 * 0.6) * height * 0.1,
  );
  const wave2X = useDerivedValue(
    () =>
      width * 0.7 + Math.cos(progress.value * Math.PI * 2 + 0.5) * width * 0.12,
  );
  const wave2Y = useDerivedValue(
    () =>
      height * 0.55 +
      Math.sin(progress.value * Math.PI * 2 * 0.7) * height * 0.12,
  );
  const wave3X = useDerivedValue(
    () =>
      width * 0.5 +
      Math.sin(progress.value * Math.PI * 2 * 0.4 + 1) * width * 0.18,
  );
  const wave3Y = useDerivedValue(
    () =>
      height * 0.75 +
      Math.cos(progress.value * Math.PI * 2 * 0.5) * height * 0.08,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      {/* Base gradient tipo Bump */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={["#E0F2FE", "#BAE6FD", "#7DD3FC"]}
        />
      </Rect>
      <Group blendMode="screen">
        {/* Onda principal - azul brillante */}
        <Group>
          <Circle
            cx={wave1X}
            cy={wave1Y}
            r={width * 0.65}
            color="#38BDF8"
            opacity={0.6}
          />
          <Blur blur={85} />
        </Group>
        {/* Onda secundaria - cyan */}
        <Group>
          <Circle
            cx={wave2X}
            cy={wave2Y}
            r={width * 0.55}
            color="#22D3EE"
            opacity={0.5}
          />
          <Blur blur={75} />
        </Group>
        {/* Acento púrpura suave */}
        <Group>
          <Circle
            cx={wave3X}
            cy={wave3Y}
            r={width * 0.4}
            color="#A78BFA"
            opacity={0.35}
          />
          <Blur blur={70} />
        </Group>
        {/* Highlight blanco */}
        <Group>
          <Circle
            cx={width * 0.4}
            cy={height * 0.2}
            r={width * 0.3}
            color="#FFFFFF"
            opacity={0.4}
          />
          <Blur blur={60} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 5. GRADIENT LAYERS MESH - Capas con diferentes opacidades y blur
// ============================================

export function GradientLayersMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 14000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [duration]);

  const layer1Y = useDerivedValue(
    () => height * 0.2 + Math.sin(progress.value * Math.PI * 2) * height * 0.1,
  );
  const layer2Y = useDerivedValue(
    () =>
      height * 0.5 +
      Math.cos(progress.value * Math.PI * 2 * 0.8) * height * 0.08,
  );
  const layer3Y = useDerivedValue(
    () =>
      height * 0.8 +
      Math.sin(progress.value * Math.PI * 2 * 0.6 + 1) * height * 0.06,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#F8FAFC" />
      {/* Capa 1 - Top, blur alto, opacidad baja */}
      <Group blendMode="screen">
        <Rect x={0} y={layer1Y} width={width} height={height * 0.5}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height * 0.5)}
            colors={["#3B82F6", "#8B5CF6"]}
          />
        </Rect>
        <Blur blur={80} />
      </Group>
      {/* Capa 2 - Middle, blur medio, opacidad media */}
      <Group blendMode="screen" opacity={0.7}>
        <Rect x={0} y={layer2Y} width={width} height={height * 0.4}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height * 0.4)}
            colors={["#EC4899", "#F97316"]}
          />
        </Rect>
        <Blur blur={50} />
      </Group>
      {/* Capa 3 - Bottom, blur bajo, opacidad alta */}
      <Group blendMode="screen" opacity={0.5}>
        <Rect x={0} y={layer3Y} width={width} height={height * 0.3}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height * 0.3)}
            colors={["#14B8A6", "#22D3EE"]}
          />
        </Rect>
        <Blur blur={30} />
      </Group>
    </Canvas>
  );
}

// ============================================
// 6. CLOUD SOFT MESH - Ultra suave tipo nube
// ============================================

export function CloudSoftMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 25000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const cloud1X = useDerivedValue(
    () => width * 0.2 + Math.sin(progress.value * Math.PI * 2) * width * 0.1,
  );
  const cloud2X = useDerivedValue(
    () =>
      width * 0.6 + Math.cos(progress.value * Math.PI * 2 * 0.7) * width * 0.15,
  );
  const cloud3X = useDerivedValue(
    () =>
      width * 0.8 +
      Math.sin(progress.value * Math.PI * 2 * 0.5 + 1) * width * 0.08,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      {/* Base blanca con tinte */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={["#FFFFFF", "#F0F9FF", "#E0F2FE"]}
        />
      </Rect>
      <Group blendMode="multiply">
        {/* Nube 1 - ULTRA blur */}
        <Group>
          <Circle
            cx={cloud1X}
            cy={height * 0.3}
            r={width * 0.9}
            color="#BFDBFE"
            opacity={0.5}
          />
          <Blur blur={150} />
        </Group>
        {/* Nube 2 */}
        <Group>
          <Circle
            cx={cloud2X}
            cy={height * 0.6}
            r={width * 0.7}
            color="#DDD6FE"
            opacity={0.4}
          />
          <Blur blur={130} />
        </Group>
        {/* Nube 3 */}
        <Group>
          <Circle
            cx={cloud3X}
            cy={height * 0.8}
            r={width * 0.5}
            color="#FBCFE8"
            opacity={0.35}
          />
          <Blur blur={110} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 7. SHARP ACCENT MESH - Blur alto con un acento sharp
// ============================================

export function SharpAccentMesh({
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

  const bgX = useDerivedValue(
    () => width * 0.4 + Math.sin(progress.value * Math.PI * 2) * width * 0.2,
  );
  const bgY = useDerivedValue(
    () =>
      height * 0.5 +
      Math.cos(progress.value * Math.PI * 2 * 0.6) * height * 0.15,
  );
  const accentX = useDerivedValue(
    () =>
      width * 0.6 + Math.cos(progress.value * Math.PI * 2 + 0.5) * width * 0.1,
  );
  const accentY = useDerivedValue(
    () =>
      height * 0.4 +
      Math.sin(progress.value * Math.PI * 2 * 0.8) * height * 0.1,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      <Fill color="#0F172A" />
      <Group blendMode="screen">
        {/* Fondo ultra difuso */}
        <Group>
          <Circle
            cx={bgX}
            cy={bgY}
            r={width * 0.9}
            color="#1E40AF"
            opacity={0.7}
          />
          <Blur blur={120} />
        </Group>
        <Group>
          <Circle
            cx={width * 0.2}
            cy={height * 0.7}
            r={width * 0.6}
            color="#7C3AED"
            opacity={0.5}
          />
          <Blur blur={100} />
        </Group>
        {/* Acento SHARP - blur mínimo */}
        <Group>
          <Circle
            cx={accentX}
            cy={accentY}
            r={width * 0.15}
            color="#F472B6"
            opacity={0.9}
          />
          <Blur blur={8} />
        </Group>
        {/* Segundo acento sharp */}
        <Group>
          <Circle
            cx={width * 0.3}
            cy={height * 0.3}
            r={width * 0.1}
            color="#34D399"
            opacity={0.85}
          />
          <Blur blur={5} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 8. HOLOGRAPHIC MESH - Iridiscente con múltiples blur
// ============================================

export function HolographicMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 8000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [duration]);

  const offset = useDerivedValue(() => progress.value * width);
  const blob1X = useDerivedValue(
    () => width * 0.3 + Math.sin(progress.value * Math.PI * 4) * width * 0.2,
  );
  const blob2X = useDerivedValue(
    () => width * 0.7 + Math.cos(progress.value * Math.PI * 3) * width * 0.15,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      {/* Fondo con sweep */}
      <Rect x={0} y={0} width={width} height={height}>
        <SweepGradient
          c={vec(width / 2, height / 2)}
          colors={["#FF00FF40", "#00FFFF40", "#FFFF0040", "#FF00FF40"]}
        />
      </Rect>
      <Group blendMode="screen">
        {/* Blob iridiscente 1 - blur medio */}
        <Group>
          <Circle
            cx={blob1X}
            cy={height * 0.4}
            r={width * 0.5}
            color="#FF6B9D"
            opacity={0.6}
          />
          <Blur blur={60} />
        </Group>
        {/* Blob iridiscente 2 - blur alto */}
        <Group>
          <Circle
            cx={blob2X}
            cy={height * 0.6}
            r={width * 0.45}
            color="#4ECDC4"
            opacity={0.55}
          />
          <Blur blur={80} />
        </Group>
        {/* Shimmer animado - blur bajo */}
        <Group>
          <Rect
            x={-width + offset.value * 2}
            y={0}
            width={width * 0.3}
            height={height}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width * 0.3, 0)}
              colors={["transparent", "#FFFFFF60", "transparent"]}
            />
          </Rect>
          <Blur blur={20} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 9. METAL LIQUID MESH - Metálico con reflejos
// ============================================

export function MetalLiquidMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 16000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const reflex1Y = useDerivedValue(
    () => height * 0.3 + Math.sin(progress.value * Math.PI * 2) * height * 0.1,
  );
  const reflex2Y = useDerivedValue(
    () =>
      height * 0.6 +
      Math.cos(progress.value * Math.PI * 2 * 0.7) * height * 0.12,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      {/* Base metálica */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["#374151", "#6B7280", "#374151"]}
        />
      </Rect>
      <Group blendMode="screen">
        {/* Reflejo plateado 1 - blur muy alto */}
        <Group>
          <Circle
            cx={width * 0.4}
            cy={reflex1Y}
            r={width * 0.6}
            color="#E5E7EB"
            opacity={0.5}
          />
          <Blur blur={100} />
        </Group>
        {/* Reflejo dorado - blur medio */}
        <Group>
          <Circle
            cx={width * 0.7}
            cy={reflex2Y}
            r={width * 0.4}
            color="#FCD34D"
            opacity={0.35}
          />
          <Blur blur={60} />
        </Group>
        {/* Highlight brillante - blur bajo */}
        <Group>
          <Circle
            cx={width * 0.3}
            cy={height * 0.2}
            r={width * 0.2}
            color="#FFFFFF"
            opacity={0.6}
          />
          <Blur blur={25} />
        </Group>
      </Group>
    </Canvas>
  );
}

// ============================================
// 10. COSMIC ICE MESH - Hielo cósmico con cristales
// ============================================

export function CosmicIceMesh({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  style,
  duration = 22000,
}: BaseGradientProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration]);

  const shimmerOffset = useDerivedValue(() => progress.value * width * 3);
  const crystal1X = useDerivedValue(
    () => width * 0.3 + Math.sin(progress.value * Math.PI * 2) * width * 0.1,
  );
  const crystal2X = useDerivedValue(
    () =>
      width * 0.7 + Math.cos(progress.value * Math.PI * 2 * 0.6) * width * 0.08,
  );

  return (
    <Canvas style={[styles.canvas, { width, height }, style]}>
      {/* Base helada */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["#ECFEFF", "#CFFAFE", "#A5F3FC"]}
        />
      </Rect>
      <Group blendMode="screen">
        {/* Cristal 1 - blur muy alto */}
        <Group>
          <Circle
            cx={crystal1X}
            cy={height * 0.4}
            r={width * 0.55}
            color="#22D3EE"
            opacity={0.5}
          />
          <Blur blur={90} />
        </Group>
        {/* Cristal 2 - blur medio */}
        <Group>
          <Circle
            cx={crystal2X}
            cy={height * 0.65}
            r={width * 0.4}
            color="#818CF8"
            opacity={0.45}
          />
          <Blur blur={60} />
        </Group>
        {/* Shimmer cristalino - blur bajo */}
        <Group>
          <Rect
            x={-width + shimmerOffset.value}
            y={0}
            width={width * 0.2}
            height={height}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width * 0.2, 0)}
              colors={["transparent", "#FFFFFF80", "transparent"]}
            />
          </Rect>
          <Blur blur={15} />
        </Group>
      </Group>
      {/* Puntos de brillo (cristales pequeños) */}
      <Group blendMode="screen">
        <Circle
          cx={width * 0.2}
          cy={height * 0.25}
          r={8}
          color="#FFFFFF"
          opacity={0.8}
        />
        <Circle
          cx={width * 0.6}
          cy={height * 0.15}
          r={6}
          color="#FFFFFF"
          opacity={0.7}
        />
        <Circle
          cx={width * 0.85}
          cy={height * 0.4}
          r={5}
          color="#FFFFFF"
          opacity={0.6}
        />
        <Circle
          cx={width * 0.15}
          cy={height * 0.7}
          r={7}
          color="#FFFFFF"
          opacity={0.75}
        />
        <Circle
          cx={width * 0.75}
          cy={height * 0.8}
          r={4}
          color="#FFFFFF"
          opacity={0.65}
        />
      </Group>
    </Canvas>
  );
}

// ============================================
// BOTONES APPLE CON BLUR REAL DE SKIA
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AppleButtonProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  colors?: string[];
}

// Helper: Gradient de fondo para botones con blur real
function ButtonGradientBg({
  width,
  height,
  colors,
  blur = 15,
}: {
  width: number;
  height: number;
  colors: string[];
  blur?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const offset = useDerivedValue(() => progress.value * width * 2);
  const blob1X = useDerivedValue(
    () => width * 0.2 + Math.sin(progress.value * Math.PI * 2) * width * 0.3,
  );
  const blob2X = useDerivedValue(
    () =>
      width * 0.8 + Math.cos(progress.value * Math.PI * 2 + 1) * width * 0.25,
  );

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {/* Base gradient */}
      <RoundedRect x={0} y={0} width={width} height={height} r={height / 2}>
        <LinearGradient
          start={vec(-width + offset.value, 0)}
          end={vec(width + offset.value, height)}
          colors={colors}
        />
      </RoundedRect>
      {/* Blobs con blur real */}
      <Group blendMode="overlay">
        <Group>
          <Circle
            cx={blob1X}
            cy={height / 2}
            r={height * 0.8}
            color={colors[0]}
            opacity={0.6}
          />
          <Blur blur={blur} />
        </Group>
        <Group>
          <Circle
            cx={blob2X}
            cy={height / 2}
            r={height * 0.6}
            color={colors[colors.length - 1]}
            opacity={0.5}
          />
          <Blur blur={blur * 0.8} />
        </Group>
      </Group>
      {/* Highlight superior */}
      <Group blendMode="screen">
        <Rect x={0} y={0} width={width} height={height * 0.5}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height * 0.5)}
            colors={["rgba(255,255,255,0.3)", "transparent"]}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}

// ============================================
// BUTTON 1: Bump Primary Button - Estilo Bump azul
// ============================================

export function BumpPrimaryButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.96]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.9]),
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.bumpButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <ButtonGradientBg
        width={300}
        height={56}
        colors={["#3B82F6", "#6366F1", "#8B5CF6"]}
        blur={12}
      />
      <Text style={buttonStyles.bumpText}>{title}</Text>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 2: Aqua Glass Button - Cristal de agua
// ============================================

export function AquaGlassButton({
  title,
  subtitle,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.aquaButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <ButtonGradientBg
        width={280}
        height={64}
        colors={["#22D3EE", "#38BDF8", "#60A5FA"]}
        blur={18}
      />
      <View style={buttonStyles.aquaContent}>
        <Text style={buttonStyles.aquaTitle}>{title}</Text>
        {subtitle && <Text style={buttonStyles.aquaSubtitle}>{subtitle}</Text>}
      </View>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 3: Soft Pill Button - Pastilla suave
// ============================================

export function SoftPillButton({
  title,
  onPress,
  disabled = false,
  style,
  colors = ["#A78BFA", "#C084FC", "#E879F9"],
}: AppleButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.95]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.pillButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <ButtonGradientBg width={160} height={44} colors={colors} blur={10} />
      <Text style={buttonStyles.pillText}>{title}</Text>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 4: Crisp Action Button - Blur bajo, más definido
// ============================================

export function CrispActionButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.crispButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <ButtonGradientBg
        width={200}
        height={52}
        colors={["#10B981", "#34D399", "#6EE7B7"]}
        blur={6}
      />
      <Text style={buttonStyles.crispText}>{title}</Text>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 5: Sunset Glow Button
// ============================================

export function SunsetGlowButton({
  title,
  subtitle,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.96]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.sunsetButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <ButtonGradientBg
        width={260}
        height={68}
        colors={["#F97316", "#FB923C", "#FBBF24", "#F97316"]}
        blur={14}
      />
      <View style={buttonStyles.sunsetContent}>
        <Text style={buttonStyles.sunsetTitle}>{title}</Text>
        {subtitle && (
          <Text style={buttonStyles.sunsetSubtitle}>{subtitle}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 6: Neon Edge Button - Borde neón con blur
// ============================================

export function NeonEdgeButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.95]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.neonButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Glow exterior */}
        <RoundedRect x={-4} y={-4} width={208} height={64} r={18}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(208, 0)}
            colors={["#FF00FF", "#00FFFF"]}
          />
        </RoundedRect>
        <Blur blur={20} />
      </Canvas>
      <Canvas style={[StyleSheet.absoluteFill, { margin: 2 }]}>
        {/* Interior oscuro */}
        <RoundedRect x={0} y={0} width={196} height={52} r={14}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(196, 52)}
            colors={["#1a1a2e", "#16213e"]}
          />
        </RoundedRect>
      </Canvas>
      <Text style={buttonStyles.neonText}>{title}</Text>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 7: Cloud Button - Ultra suave
// ============================================

export function CloudButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.cloudButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <ButtonGradientBg
        width={180}
        height={50}
        colors={["#E0E7FF", "#C7D2FE", "#A5B4FC"]}
        blur={25}
      />
      <Text style={buttonStyles.cloudText}>{title}</Text>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 8: Metal Button - Metálico
// ============================================

export function MetalButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.96]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 20, stiffness: 500 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.metalButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <ButtonGradientBg
        width={180}
        height={52}
        colors={["#9CA3AF", "#D1D5DB", "#9CA3AF"]}
        blur={8}
      />
      <Text style={buttonStyles.metalText}>{title}</Text>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 9: Holographic Button
// ============================================

export function HolographicButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.95]) }],
  }));

  const shimmerOffset = useDerivedValue(() => progress.value * 400);

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.holoButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Base iridiscente */}
        <RoundedRect x={0} y={0} width={200} height={56} r={16}>
          <LinearGradient
            start={vec(-100 + shimmerOffset.value, 0)}
            end={vec(100 + shimmerOffset.value, 56)}
            colors={["#FF6B9D", "#4ECDC4", "#FFE66D", "#FF6B9D"]}
          />
        </RoundedRect>
        {/* Shimmer */}
        <Group blendMode="overlay">
          <RoundedRect
            x={-200 + shimmerOffset.value}
            y={0}
            width={80}
            height={56}
            r={16}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(80, 0)}
              colors={["transparent", "rgba(255,255,255,0.5)", "transparent"]}
            />
          </RoundedRect>
        </Group>
      </Canvas>
      <Text style={buttonStyles.holoText}>{title}</Text>
    </AnimatedPressable>
  );
}

// ============================================
// BUTTON 10: Premium XL Button - Grande y premium
// ============================================

export function PremiumXLButton({
  title,
  subtitle,
  onPress,
  disabled = false,
  style,
}: AppleButtonProps) {
  const pressed = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    shine.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
  }));

  const shineOffset = useDerivedValue(() => shine.value * 500);

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onPress?.();
      }}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
      }}
      disabled={disabled}
      style={[
        animatedStyle,
        buttonStyles.premiumButton,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Base gradient premium */}
        <RoundedRect x={0} y={0} width={320} height={80} r={20}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(320, 80)}
            colors={["#1E40AF", "#3B82F6", "#60A5FA", "#3B82F6", "#1E40AF"]}
          />
        </RoundedRect>
        {/* Mesh blobs */}
        <Group blendMode="overlay">
          <Group>
            <Circle cx={80} cy={40} r={60} color="#8B5CF6" opacity={0.6} />
            <Blur blur={20} />
          </Group>
          <Group>
            <Circle cx={240} cy={40} r={50} color="#06B6D4" opacity={0.5} />
            <Blur blur={18} />
          </Group>
        </Group>
        {/* Shine animado */}
        <Group blendMode="screen">
          <RoundedRect
            x={-100 + shineOffset.value}
            y={0}
            width={100}
            height={80}
            r={20}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(100, 0)}
              colors={["transparent", "rgba(255,255,255,0.4)", "transparent"]}
            />
          </RoundedRect>
        </Group>
      </Canvas>
      <View style={buttonStyles.premiumContent}>
        <Text style={buttonStyles.premiumTitle}>{title}</Text>
        {subtitle && (
          <Text style={buttonStyles.premiumSubtitle}>{subtitle}</Text>
        )}
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
});

const buttonStyles = StyleSheet.create({
  // Bump Primary
  bumpButton: {
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  bumpText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  // Aqua Glass
  aquaButton: {
    height: 64,
    borderRadius: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#22D3EE",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  aquaContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  aquaTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  aquaSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  // Soft Pill
  pillButton: {
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#A78BFA",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  pillText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Crisp Action
  crispButton: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 7 },
    }),
  },
  crispText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Sunset Glow
  sunsetButton: {
    height: 68,
    borderRadius: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#F97316",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
    }),
  },
  sunsetContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sunsetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sunsetSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  // Neon Edge
  neonButton: {
    width: 200,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FF00FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  neonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  // Cloud
  cloudButton: {
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  cloudText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3730A3",
  },

  // Metal
  metalButton: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#6B7280",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  metalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },

  // Holographic
  holoButton: {
    width: 200,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FF6B9D",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  holoText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Premium XL
  premiumButton: {
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#1E40AF",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  premiumContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  premiumSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});

export default {
  // 10 Mesh Gradients
  SoftAquaMesh,
  CrispEdgeMesh,
  DualBlurMesh,
  BumpStyleMesh,
  GradientLayersMesh,
  CloudSoftMesh,
  SharpAccentMesh,
  HolographicMesh,
  MetalLiquidMesh,
  CosmicIceMesh,
  // 10 Apple Buttons with Real Blur
  BumpPrimaryButton,
  AquaGlassButton,
  SoftPillButton,
  CrispActionButton,
  SunsetGlowButton,
  NeonEdgeButton,
  CloudButton,
  MetalButton,
  HolographicButton,
  PremiumXLButton,
};
