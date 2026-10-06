/**
 * FireParticles - Shared fire emoji particle system
 * ==================================================
 * Extracted from SwipeToCreateButton for reuse across screens.
 * Provides both individual AnimatedFireParticle and a ContinuousFireEmitter.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// ============================================
// CONSTANTS
// ============================================

export const FIRE_EMOJIS = ["\u{1F525}", "\u{1F525}", "\u{1F525}", "\u{1F525}", "\u2728", "\u{1F4A5}", "\u{2764}\u{200D}\u{1F525}"];
const MAX_PARTICLES = 16;
const PARTICLE_LIFETIME = 1000; // ms

// ============================================
// TYPES
// ============================================

export interface FireParticleData {
  id: number;
  emoji: string;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  initialScale: number;
  initialRotation: number;
}

// ============================================
// ANIMATED FIRE PARTICLE
// ============================================

export function AnimatedFireParticle({
  emoji,
  startX,
  startY,
  velocityX,
  velocityY,
  initialScale,
  initialRotation,
}: {
  emoji: string;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  initialScale: number;
  initialRotation: number;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(initialRotation);

  useEffect(() => {
    // Animate upward with gravity effect - bigger impulse, longer travel
    translateY.value = withSequence(
      withTiming(velocityY * 0.6, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      }),
      // Then fall down with gravity
      withTiming(velocityY * 0.6 + 180, {
        duration: 650,
        easing: Easing.in(Easing.quad),
      }),
    );

    // Horizontal drift — wider
    translateX.value = withTiming(velocityX * 2.5, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });

    // Scale down
    scale.value = withDelay(
      400,
      withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Fade out
    opacity.value = withDelay(
      500,
      withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Rotate
    rotation.value = withTiming(initialRotation + (Math.random() - 0.5) * 220, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: startX - 12,
    top: startY - 12,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.Text style={[styles.fireEmoji, animatedStyle]}>
      {emoji}
    </Animated.Text>
  );
}

// ============================================
// CONTINUOUS FIRE EMITTER
// ============================================

interface ContinuousFireEmitterProps {
  originX: number;
  originY: number;
  width?: number;
  height?: number;
}

export function ContinuousFireEmitter({
  originX,
  originY,
  width = 0,
  height = 0,
}: ContinuousFireEmitterProps) {
  const [particles, setParticles] = useState<FireParticleData[]>([]);
  const particleIdRef = useRef(0);

  const spawnParticle = useCallback(() => {
    const id = particleIdRef.current++;
    const emoji = FIRE_EMOJIS[Math.floor(Math.random() * FIRE_EMOJIS.length)];

    // Distribute across the entire button surface
    const startX = originX + (Math.random() - 0.5) * width;
    const startY = originY + Math.random() * height;

    const newParticle: FireParticleData = {
      id,
      emoji,
      startX,
      startY,
      velocityX: (Math.random() - 0.5) * 120,
      velocityY: -220 - Math.random() * 180,
      initialScale: 0.7 + Math.random() * 0.6,
      initialRotation: (Math.random() - 0.5) * 40,
    };

    setParticles((prev) => [...prev, newParticle].slice(-MAX_PARTICLES));

    // Remove particle after lifetime
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, PARTICLE_LIFETIME);
  }, [originX, originY, width, height]);

  useEffect(() => {
    const interval = setInterval(spawnParticle, 220);
    return () => clearInterval(interval);
  }, [spawnParticle]);

  return (
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
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible",
    zIndex: 100,
  },
  fireEmoji: {
    fontSize: 28,
    textShadowColor: "rgba(255, 80, 0, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
