/**
 * SwipeToCreateButton - Liquid Glass with native Mesh Gradient
 * ===========================================================
 *
 * ARCHITECTURE (from bottom to top):
 * 1. MeshGradient (dimmed) full screen – desaturated colors, always visible.
 * 2. MeshGradient (vibrant) clipped to slider width – same points and animation;
 *    more saturation/opacity in that zone (not reduced).
 * 3. Native Liquid Glass (expo-glass-effect GlassView) on entire track; fallback BlurView.
 * 4. Button UI (text, check, thumb with GIF; thumb has no glass).
 *
 * WHY IT WORKS WITH REAL BLUR:
 * - BlurView from expo-blur uses native system blur (UIVisualEffectView
 *   on iOS). What's drawn below (in our case vibrant mesh + dimmed
 *   mesh) is what gets blurred; no “fake glass” or opaque overlays.
 * - The vibrant mesh is on an intermediate layer clipped to the same width as the
 *   BlurView. This way, only the area under the glass shows vibrant colors; the
 *   rest keeps the dimmed mesh. Clipping is by layout (overflow:
 *   hidden + animated width), without global filters or Skia.
 * - Mesh: only animated points (sin/cos), fixed and darkened colors, infinite loop.
 */

import { AnimatedFireParticle, FIRE_EMOJIS, FireParticleData } from "./FireParticles";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MeshGradientView } from "expo-mesh-gradient";
import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Platform,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useDerivedValue,
    useFrameCallback,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

// ============================================
// MESH: Animated 4×4 Wave Mesh, reduced saturation
// ============================================

const MESH_COLUMNS = 4;
const MESH_ROWS = 4;
const MESH_COUNT = MESH_COLUMNS * MESH_ROWS;
const MESH_POINTS_ANIM_DURATION_MS = 28000; // one cycle 0→2π, slower = smoother
const MESH_POINT_OFFSET = 0.1;
const TWO_PI = 2 * Math.PI;
const MESH_SATURATION = 1;
const MESH_DARKEN = 0.85; // < 1 darkens the colors

// Colores base (purple, indigo, yellow, pink, orange)
const MESH_COLORS_BASE: string[] = [
  "#A855F7",
  "#6366F1",
  "#A855F7",
  "#FBBF24",
  "#EC4899",
  "#A855F7",
  "#EC4899",
  "#A855F7",
  "#F97316",
  "#EC4899",
  "#F97316",
  "#A855F7",
  "#FBBF24",
  "#F97316",
  "#EC4899",
  "#A855F7",
];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
}

function desaturateHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = 1 - amount;
  return rgbToHex(r * amount + l * t, g * amount + l * t, b * amount + l * t);
}

function darkenHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

// Fixed colors: desaturated + darkened (not animated)
const MESH_COLORS = MESH_COLORS_BASE.map((c) =>
  darkenHex(desaturateHex(c, MESH_SATURATION), MESH_DARKEN),
);

// Base 4×4 points with "rotated" horizontal progression → wave effect
const MESH_POINTS_BASE: number[][] = [
  [0.0, 0.0],
  [0.3, 0.0],
  [0.7, 0.0],
  [1.0, 0.0],
  [0.0, 0.3],
  [0.7, 0.4],
  [0.2, 0.2],
  [1.0, 0.3],
  [0.0, 0.7],
  [0.3, 0.8],
  [0.7, 0.6],
  [1.0, 0.7],
  [0.0, 1.0],
  [0.3, 1.0],
  [0.7, 1.0],
  [1.0, 1.0],
];

// Indices of interior points that animate (sin/cos as in the article)
const MESH_ANIMATED_POINT_INDICES = [5, 6, 9, 10];

function computeMeshPoints(timeRadians: number): number[][] {
  const offsetX = Math.sin(timeRadians) * MESH_POINT_OFFSET;
  const offsetY = Math.cos(timeRadians) * MESH_POINT_OFFSET;
  const points = MESH_POINTS_BASE.map((p) => [p[0], p[1]]);
  for (const i of MESH_ANIMATED_POINT_INDICES) {
    points[i][0] = Math.max(0, Math.min(1, points[i][0] + offsetX));
    points[i][1] = Math.max(0, Math.min(1, points[i][1] + offsetY));
  }
  return points;
}

// ============================================
// HOOK: continuous infinite animation (useFrameCallback, no restart → imperceptible loop)
// ============================================

function useMeshAnimationState() {
  const timeRadians = useSharedValue(0);
  const [points, setPoints] = useState<number[][]>(() => computeMeshPoints(0));
  const lastUpdate = useRef(0);
  const throttleMs = 10; // more frequent updates = smoother

  useFrameCallback((frameInfo) => {
    "worklet";
    const deltaMs = frameInfo.timeSincePreviousFrame ?? 16;
    const t =
      timeRadians.value + (deltaMs / MESH_POINTS_ANIM_DURATION_MS) * TWO_PI;
    timeRadians.value = t % TWO_PI;
  }, true);
  const syncPoints = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastUpdate.current < throttleMs) return;
    lastUpdate.current = now;
    // Modulo 2π: when time restarts 2π→0, sin/cos give the same → infinite loop without jump
    const t = ((time % TWO_PI) + TWO_PI) % TWO_PI;
    setPoints(computeMeshPoints(t));
  }, []);

  useAnimatedReaction(
    () => timeRadians.value,
    (time) => {
      runOnJS(syncPoints)(time);
    },
    [syncPoints],
  );

  return { points, colors: MESH_COLORS };
}

// ============================================
// BACKGROUND: only 1 dimmed mesh (no gradient on track)
// The track is just transparent liquid glass over this background.
// ============================================

type MeshBackgroundLayersProps = {
  width: number;
  height: number;
  points: number[][];
  colors: string[];
};

function MeshBackgroundLayers({
  width,
  height,
  points,
  colors,
}: MeshBackgroundLayersProps) {
  if (Platform.OS !== "ios") {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fallbackBackground]} />
    );
  }

  // Larger gradient (zoom out) so it doesn't get cut at edges; centered slightly to the left
  const baseSide = Math.max(width, height);
  const MESH_ZOOM = 1.28; // larger mesh so it doesn't get cut
  const MESH_PAN_RIGHT = 40; // shows a bit more of the right side of the gradient
  const side = baseSide * MESH_ZOOM;
  const left = (width - side) / 2 - MESH_PAN_RIGHT;
  const top = (height - side) / 2;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.meshRoot]}
      pointerEvents="none"
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.meshLayerWrap,
          { width, height },
        ]}
      >
        <MeshGradientView
          style={{
            position: "absolute",
            width: side,
            height: side,
            left,
            top,
            borderRadius: 40,
          }}
          columns={MESH_COLUMNS}
          rows={MESH_ROWS}
          colors={colors}
          points={points}
          smoothsColors={true}
          ignoresSafeArea={false}
        />
        {/* Subtle blur over mesh to smooth */}
        <BlurView
          tint="dark"
          intensity={30}
          style={[StyleSheet.absoluteFill, styles.meshBlurOverlay]}
        />
      </View>
    </View>
  );
}

// ============================================
// LIQUID GLASS – transparent track (no gradient background)
// Just glass; dimmed mesh is visible through it.
// ============================================

function TrackGlassOverlay({ style }: { style?: object }) {
  const hasLiquidGlass = isLiquidGlassAvailable();

  return (
    <View style={[styles.glassContainer, style]}>
      {hasLiquidGlass ? (
        <GlassView
          glassEffectStyle="clear"
          style={[StyleSheet.absoluteFill, styles.glassClip]}
        />
      ) : (
        <BlurView
          tint="light"
          intensity={14}
          style={[StyleSheet.absoluteFill, styles.glassClip]}
        />
      )}
      {/* Hard glass edge so liquid glass is noticeable */}
      <View
        style={[StyleSheet.absoluteFill, styles.glassEdge]}
        pointerEvents="none"
      />
    </View>
  );
}

// ============================================
// ASSETS AND UI CONSTANTS
// ============================================

const PARTY_GIFS = [
  require("@/assets/party_gifs/party text Sticker.gif"),
  require("@/assets/party_gifs/party text Sticker (1).gif"),
  require("@/assets/party_gifs/Party Sylvester Sticker by GIPHY Text.gif"),
  require("@/assets/party_gifs/party Sticker.gif"),
  require("@/assets/party_gifs/party Sticker (1).gif"),
];

const GLASS_BORDER_COLOR = "rgba(255, 255, 255, 0.28)";

// ============================================
// FIRE EMOJI PARTICLE SYSTEM (uses shared components from FireParticles.tsx)
// ============================================

const MAX_PARTICLES = 12;
const PARTICLE_LIFETIME = 800; // ms

function useFireParticles() {
  const [particles, setParticles] = useState<FireParticleData[]>([]);
  const particleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  const spawnParticle = useCallback(
    (
      thumbX: number,
      thumbY: number,
      velocity: number,
      progress: number = 0,
    ) => {
      const now = Date.now();
      // Dynamic throttle: more particles near the end (progress closer to 1)
      const baseThrottle = 80; // Base throttle at start
      const minThrottle = 35; // Minimum throttle at end (more frequent)
      const spawnThrottleMs =
        baseThrottle - (baseThrottle - minThrottle) * progress;

      if (now - lastSpawnRef.current < spawnThrottleMs) return;
      if (velocity < 2) return; // Only spawn if moving fast enough
      lastSpawnRef.current = now;

      const id = particleIdRef.current++;
      const emoji = FIRE_EMOJIS[Math.floor(Math.random() * FIRE_EMOJIS.length)];

      // Random initial velocity - upward with MORE variation (some go high, some less)
      const baseVelocityY = -180 - Math.random() * 140; // Much stronger upward impulse with more variation
      const baseVelocityX = (Math.random() - 0.5) * 80; // More horizontal spread

      // Scale based on velocity intensity
      const initialScale = 0.6 + Math.random() * 0.5;
      const initialRotation = (Math.random() - 0.5) * 30;

      const newParticle: FireParticleData = {
        id,
        emoji,
        startX: thumbX,
        startY: thumbY,
        velocityX: baseVelocityX,
        velocityY: baseVelocityY,
        initialScale,
        initialRotation,
      };

      setParticles((prev) => {
        const updated = [...prev, newParticle].slice(-MAX_PARTICLES);
        return updated;
      });

      // Remove particle after lifetime
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, PARTICLE_LIFETIME);
    },
    [],
  );

  return { particles, spawnParticle };
}

// ============================================
// TYPES
// ============================================

interface SwipeToCreateButtonProps {
  onComplete: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SwipeToCreateButton({
  onComplete,
  disabled = false,
  isLoading = false,
  title = "Desliza para crear",
  subtitle = "→",
}: SwipeToCreateButtonProps) {
  const { width: screenWidth } = useWindowDimensions();
  const BUTTON_WIDTH = screenWidth - 40;
  const BUTTON_HEIGHT = 72;
  const THUMB_SIZE = 90;
  const MAX_TRANSLATE = BUTTON_WIDTH - THUMB_SIZE - 12;
  const COMPLETE_THRESHOLD = MAX_TRANSLATE * 0.85;

  const { points, colors } = useMeshAnimationState();
  const { particles, spawnParticle } = useFireParticles();

  const [currentGifIndex, setCurrentGifIndex] = useState(() =>
    Math.floor(Math.random() * PARTY_GIFS.length),
  );

  const changeGif = useCallback(() => {
    setCurrentGifIndex(Math.floor(Math.random() * PARTY_GIFS.length));
  }, []);

  const translateX = useSharedValue(0);
  const lastTranslateX = useRef(0);
  const isPressed = useSharedValue(false);
  const hasCompleted = useSharedValue(false);

  const triggerHapticLight = useCallback(() => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const triggerHapticSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleComplete = useCallback(() => {
    triggerHapticSuccess();
    onComplete();
  }, [onComplete, triggerHapticSuccess]);

  // Fire particle spawner - calculates velocity and spawns particles
  const spawnFireParticle = useCallback(
    (currentX: number) => {
      const velocity = Math.abs(currentX - lastTranslateX.current);
      lastTranslateX.current = currentX;
      // Calculate progress (0 to 1)
      const progress = currentX / MAX_TRANSLATE;
      // Thumb center position (relative to button)
      const thumbCenterX = currentX + THUMB_SIZE / 2 + 5; // 5 is left offset
      const thumbCenterY = BUTTON_HEIGHT / 2;
      spawnParticle(thumbCenterX, thumbCenterY, velocity, progress);
    },
    [THUMB_SIZE, BUTTON_HEIGHT, MAX_TRANSLATE, spawnParticle],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled && !isLoading)
        .onBegin(() => {
          isPressed.value = true;
          runOnJS(triggerHapticLight)();
        })
        .onUpdate((event) => {
          const newX = Math.max(0, Math.min(event.translationX, MAX_TRANSLATE));
          translateX.value = newX;
          // Spawn fire particles while sliding
          runOnJS(spawnFireParticle)(newX);
          if (newX > MAX_TRANSLATE * 0.5 && !hasCompleted.value) {
            runOnJS(triggerHapticLight)();
          }
        })
        .onEnd(() => {
          isPressed.value = false;
          if (translateX.value >= COMPLETE_THRESHOLD) {
            hasCompleted.value = true;
            translateX.value = withSpring(MAX_TRANSLATE, {
              damping: 15,
              stiffness: 200,
            });
            runOnJS(handleComplete)();
          } else {
            translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
            runOnJS(changeGif)();
          }
        })
        .onFinalize(() => {
          isPressed.value = false;
        }),
    [
      disabled,
      isLoading,
      MAX_TRANSLATE,
      COMPLETE_THRESHOLD,
      handleComplete,
      changeGif,
      triggerHapticLight,
      spawnFireParticle,
    ],
  );

  const progress = useDerivedValue(() => translateX.value / MAX_TRANSLATE);
  const trackFillWidth = useDerivedValue(
    () => translateX.value + THUMB_SIZE + 12,
  );

  const thumbStyle = useAnimatedStyle(() => {
    const scale = interpolate(isPressed.value ? 1 : 0, [0, 1], [1, 0.95]);
    return {
      transform: [
        { translateX: translateX.value },
        { scale: withSpring(scale, { damping: 15, stiffness: 300 }) },
        { rotate: `${interpolate(progress.value, [0, 1], [0, 12])}deg` },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, 24]) }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0.8, 1], [0.5, 1]) }],
  }));

  const trackFillGlassStyle = useAnimatedStyle(() => ({
    width: trackFillWidth.value,
  }));

  return (
    <View
      style={[
        styles.outerWrapper,
        { width: BUTTON_WIDTH, height: BUTTON_HEIGHT },
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.container,
            { width: BUTTON_WIDTH, height: BUTTON_HEIGHT },
            disabled && styles.containerDisabled,
          ]}
        >
          {/* Background: dimmed mesh + vibrant mesh (clipped to slider) */}
          <View style={styles.darkBackground}>
            <MeshBackgroundLayers
              width={BUTTON_WIDTH}
              height={BUTTON_HEIGHT}
              points={points}
              colors={colors}
            />
          </View>

          {/* Liquid Glass only on what you're sliding (loaded track) */}
          <Animated.View style={[styles.trackFill, trackFillGlassStyle]}>
            <TrackGlassOverlay style={styles.trackGlass} />
          </Animated.View>

          {/* Smooth 3D depth + light from above Apple style */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Very visible top light (edge lit from above) */}
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.09)", "rgba(255, 255, 255, 0)"]}
              locations={[0, 1]}
              style={styles.innerLightTop}
            />
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.0)",
                "rgba(0,0,0,0.0)",

                "rgba(0, 0, 0, 0.1)",
              ]}
              locations={[0, 0.7, 1]}
              style={[StyleSheet.absoluteFill, styles.innerDepth]}
            />
            {/* Clear bottom edge (subtle bevel) */}
          </View>

          {/* Text */}
          <Animated.View style={[styles.textContainer, textStyle]}>
            <Text style={styles.title}>{isLoading ? "Creando..." : title}</Text>
            {!isLoading && <Text style={styles.subtitle}>{subtitle}</Text>}
          </Animated.View>

          {/* Check */}
          <Animated.View style={[styles.checkContainer, checkStyle]}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>

          {/* Thumb with GIF */}
          <Animated.View
            style={[
              styles.thumbOuter,
              { width: THUMB_SIZE, height: THUMB_SIZE },
              thumbStyle,
            ]}
          >
            <View style={styles.thumbInner}>
              <Image
                source={PARTY_GIFS[currentGifIndex]}
                style={styles.gifImage}
                contentFit="contain"
                autoplay
              />
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Fire emoji particles - outside container for overflow */}
      <View style={styles.particlesContainer} pointerEvents="none">
        {particles.map((particle) => (
          <AnimatedFireParticle
            key={particle.id}
            emoji={particle.emoji}
            startX={particle.startX}
            startY={particle.startY}
            velocityX={particle.velocityX}
            velocityY={particle.velocityY}
            initialScale={particle.initialScale}
            initialRotation={particle.initialRotation}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  outerWrapper: {
    overflow: "visible",
    position: "relative",
  },
  container: {
    borderRadius: 36,
    overflow: "hidden",
    justifyContent: "center",
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
    }),
  },
  containerDisabled: {
    opacity: 0.5,
  },
  darkBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  meshRoot: {
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  meshLayerWrap: {
    borderRadius: 40,
    overflow: "hidden",
  },
  meshBlurOverlay: {
    borderRadius: 40,
    overflow: "hidden",
  },
  meshLayerClip: {
    borderRadius: 36,
    overflow: "hidden",
  },
  fallbackBackground: {
    backgroundColor: "#1a1225",
  },
  vibrantClipContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    borderRadius: 36,
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  trackGlass: {
    flex: 1,
    borderRadius: 36,
    overflow: "hidden",
  },
  glassContainer: {
    overflow: "hidden",
    borderRadius: 36,
    backgroundColor: "transparent",
  },
  glassClip: {
    borderRadius: 36,
    overflow: "hidden",
  },
  glassEdge: {
    borderRadius: 36,
  },
  innerDepth: {
    borderRadius: 36,
    overflow: "hidden",
  },
  innerLightTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 16,
    borderRadius: 36,
    overflow: "hidden",
  },
  innerBevelBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 14,
    borderRadius: 36,
    overflow: "hidden",
  },
  innerDepthBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  textContainer: {
    position: "absolute",
    left: 110,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "ui-rounded" : undefined,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    padding: 3,
  },
  subtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    opacity: 0.95,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    padding: 3,
  },
  checkContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  thumbOuter: {
    position: "absolute",
    left: 5,
    borderRadius: 31,
    overflow: "hidden",
  },
  thumbInner: {
    flex: 1,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  gifImage: {
    width: "80%",
    height: "100%",
    borderRadius: 27,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible",
    zIndex: 100,
  },
});

export default SwipeToCreateButton;
