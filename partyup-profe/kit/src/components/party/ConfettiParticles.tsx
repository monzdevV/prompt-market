/**
 * Confetti particle system for radial color bursts
 * Spawns small colored paper pieces in all directions from a center point
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
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

const CONFETTI_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#00C7BE', '#007AFF', '#5856D6', '#AF52DE',
  '#FF2D55', '#5AC8FA', '#FFD60A', '#32D74B',
];
const MAX_PARTICLES = 30;
const PARTICLE_LIFETIME_MS = 1000;
const SPAWN_RADIUS = 20;
const TRAVEL_DISTANCE = 220;

// ============================================
// TYPES
// ============================================

interface ConfettiParticleData {
  id: number;
  color: string;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  initialScale: number;
  initialRotation: number;
}

// ============================================
// ANIMATED PARTICLE
// ============================================

function AnimatedConfettiParticle({
  color,
  startX,
  startY,
  velocityX,
  velocityY,
  initialScale,
  initialRotation,
}: Omit<ConfettiParticleData, 'id'>) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(initialRotation);

  React.useEffect(() => {
    const outConfig = { duration: 800, easing: Easing.out(Easing.cubic) };

    translateX.value = withTiming(velocityX, outConfig);
    translateY.value = withTiming(velocityY, outConfig);
    scale.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(500, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    rotation.value = withTiming(initialRotation + (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 240), outConfig);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: startX - 4,
    top: startY - 3,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, { backgroundColor: color }, animatedStyle]} />
  );
}

// ============================================
// HOOK
// ============================================

export function useConfettiParticles() {
  const [particles, setParticles] = useState<ConfettiParticleData[]>([]);
  const nextId = useRef(0);

  const spawnConfetti = useCallback((centerX: number, centerY: number, count = 10) => {
    const batch: ConfettiParticleData[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const distance = TRAVEL_DISTANCE * (0.5 + Math.random() * 0.5);

      batch.push({
        id: nextId.current++,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        startX: centerX + Math.cos(angle) * SPAWN_RADIUS * Math.random(),
        startY: centerY + Math.sin(angle) * SPAWN_RADIUS * Math.random(),
        velocityX: Math.cos(angle) * distance,
        velocityY: Math.sin(angle) * distance,
        initialScale: 0.6 + Math.random() * 0.5,
        initialRotation: (Math.random() - 0.5) * 60,
      });
    }

    setParticles((prev) => [...prev, ...batch].slice(-MAX_PARTICLES));

    setTimeout(() => {
      const ids = new Set(batch.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, PARTICLE_LIFETIME_MS);
  }, []);

  return { particles, spawnConfetti };
}

// ============================================
// OVERLAY COMPONENT
// ============================================

export function ConfettiOverlay({ particles }: { particles: ConfettiParticleData[] }) {
  if (particles.length === 0) return null;

  return (
    <>
      {particles.map((p) => (
        <AnimatedConfettiParticle
          key={p.id}
          color={p.color}
          startX={p.startX}
          startY={p.startY}
          velocityX={p.velocityX}
          velocityY={p.velocityY}
          initialScale={p.initialScale}
          initialRotation={p.initialRotation}
        />
      ))}
    </>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  particle: {
    width: 8,
    height: 5,
    borderRadius: 2,
  },
});
