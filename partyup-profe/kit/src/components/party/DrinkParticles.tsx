/**
 * Drink particle system for celebratory emoji bursts
 * Spawns animated emoji particles when drinks are added
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const DRINK_EMOJIS = [
  '\u{1F37A}', '\u{1F37B}', '\u{1F942}', '\u{1F377}',
  '\u{1F378}', '\u{1F379}', '\u{1F943}', '\u2728', '\u{1F4A5}',
];
const MAX_PARTICLES = 8;
const PARTICLE_LIFETIME_MS = 800;

// ============================================
// TYPES
// ============================================

interface ParticleData {
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
// ANIMATED PARTICLE
// ============================================

function AnimatedParticle({
  emoji,
  startX,
  startY,
  velocityX,
  velocityY,
  initialScale,
  initialRotation,
}: Omit<ParticleData, 'id'>) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(initialRotation);

  useEffect(() => {
    const timingConfig = { duration: 600, easing: Easing.out(Easing.cubic) };

    translateY.value = withTiming(velocityY * 0.5, timingConfig);
    translateX.value = withTiming(velocityX * 2, timingConfig);
    scale.value = withDelay(200, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(300, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
    rotation.value = withTiming(initialRotation + (Math.random() - 0.5) * 180, timingConfig);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: startX - 15,
    top: startY - 15,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.Text style={[styles.particle, animatedStyle]}>
      {emoji}
    </Animated.Text>
  );
}

// ============================================
// HOOK
// ============================================

export function useDrinkParticles() {
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const nextId = useRef(0);

  const spawnParticles = useCallback((x: number, y: number, count = 4) => {
    const batch: ParticleData[] = [];

    for (let i = 0; i < count; i++) {
      batch.push({
        id: nextId.current++,
        emoji: DRINK_EMOJIS[Math.floor(Math.random() * DRINK_EMOJIS.length)],
        startX: x + (Math.random() - 0.5) * 40,
        startY: y + (Math.random() - 0.5) * 20,
        velocityX: (Math.random() - 0.5) * 120,
        velocityY: -200 - Math.random() * 180,
        initialScale: 0.7 + Math.random() * 0.6,
        initialRotation: (Math.random() - 0.5) * 40,
      });
    }

    setParticles((prev) => [...prev, ...batch].slice(-MAX_PARTICLES));

    setTimeout(() => {
      const ids = new Set(batch.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, PARTICLE_LIFETIME_MS);
  }, []);

  return { particles, spawnParticles };
}

// ============================================
// OVERLAY COMPONENT
// ============================================

export function DrinkParticlesOverlay({ particles }: { particles: ParticleData[] }) {
  if (particles.length === 0) return null;

  return (
    <>
      {particles.map((p) => (
        <AnimatedParticle
          key={p.id}
          emoji={p.emoji}
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
    fontSize: 28,
  },
});
