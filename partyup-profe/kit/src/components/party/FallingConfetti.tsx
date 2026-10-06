/**
 * Periodic falling confetti effect that rains small colored pieces
 * from the top of the screen. Each burst happens automatically at
 * a configurable interval and particles drift down with slight wind.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// ============================================
// CONSTANTS
// ============================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const CONFETTI_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#00C7BE', '#007AFF', '#5856D6', '#AF52DE',
  '#FF2D55', '#5AC8FA', '#FFD60A', '#32D74B',
];

const PARTICLES_PER_BURST = 18;
const PARTICLE_LIFETIME_MS = 3500;
const BURST_INTERVAL_MS = 12000;
const MAX_PARTICLES = 36;

// ============================================
// TYPES
// ============================================

interface FallingParticle {
  id: number;
  color: string;
  startX: number;
  driftX: number;
  rotation: number;
  delay: number;
  scale: number;
}

// ============================================
// ANIMATED PARTICLE
// ============================================

function FallingParticleView({ color, startX, driftX, rotation, delay, scale }: Omit<FallingParticle, 'id'>) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(rotation);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const fallDuration = 2800 + Math.random() * 600;

    opacity.value = withDelay(delay, withTiming(1, { duration: 150 }));
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 40, { duration: fallDuration, easing: Easing.in(Easing.quad) }),
    );
    translateX.value = withDelay(
      delay,
      withTiming(driftX, { duration: fallDuration, easing: Easing.inOut(Easing.sin) }),
    );
    rotate.value = withDelay(
      delay,
      withTiming(rotation + (Math.random() > 0.5 ? 360 : -360), { duration: fallDuration }),
    );
    opacity.value = withDelay(
      delay + fallDuration - 600,
      withTiming(0, { duration: 600 }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: startX,
    top: 0,
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, { backgroundColor: color }, animatedStyle]} />
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FallingConfetti() {
  const [particles, setParticles] = useState<FallingParticle[]>([]);
  const nextId = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const spawnBurst = useCallback(() => {
    const batch: FallingParticle[] = [];

    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      batch.push({
        id: nextId.current++,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        startX: Math.random() * SCREEN_WIDTH,
        driftX: (Math.random() - 0.5) * 80,
        rotation: (Math.random() - 0.5) * 90,
        delay: Math.random() * 800,
        scale: 0.6 + Math.random() * 0.6,
      });
    }

    setParticles((prev) => [...prev, ...batch].slice(-MAX_PARTICLES));

    setTimeout(() => {
      const ids = new Set(batch.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, PARTICLE_LIFETIME_MS);
  }, []);

  useEffect(() => {
    // Initial burst after a short delay
    const initialTimeout = setTimeout(spawnBurst, 3000);

    intervalRef.current = setInterval(spawnBurst, BURST_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spawnBurst]);

  if (particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <FallingParticleView
          key={p.id}
          color={p.color}
          startX={p.startX}
          driftX={p.driftX}
          rotation={p.rotation}
          delay={p.delay}
          scale={p.scale}
        />
      ))}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  particle: {
    width: 8,
    height: 5,
    borderRadius: 2,
  },
});
