/**
 * PhotoStickerOverlay
 * ===================
 * Continuous floating-sticker effect rendered on top of photo cards.
 * Reaction stickers rise slowly from the bottom to the middle of the
 * photo, drifting sideways and fading out -- similar to live-stream
 * reaction animations (Instagram Live, TikTok, etc.).
 */

import { Image, ImageSource } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PhotoReaction, getStickerById } from '@/src/types';

// ============================================
// CONFIGURATION
// ============================================

const MAX_PARTICLES = 8;
const SPAWN_INTERVAL_MS = 1200;
const PARTICLE_LIFETIME_MS = 3500;
const MIN_SIZE = 24;
const MAX_SIZE = 32;
const DRIFT_X = 15;

// ============================================
// TYPES
// ============================================

interface StickerParticle {
  id: number;
  source: ImageSource;
  startX: number;
  size: number;
  driftX: number;
  travelY: number;
}

// ============================================
// ANIMATED PARTICLE
// ============================================

function FloatingSticker({
  source,
  startX,
  size,
  driftX,
  travelY,
}: Omit<StickerParticle, 'id'>) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    const riseDuration = PARTICLE_LIFETIME_MS;
    const riseEasing = Easing.out(Easing.quad);
    const fadeInDuration = 300;
    const scaleInDuration = 400;

    // Fade in quickly, hold, then fade out in the last portion
    opacity.value = withSequence(
      withTiming(1, { duration: fadeInDuration, easing: Easing.out(Easing.cubic) }),
      withDelay(
        riseDuration * 0.6 - fadeInDuration,
        withTiming(0, { duration: riseDuration * 0.4, easing: Easing.in(Easing.cubic) }),
      ),
    );

    // Scale up, hold, then shrink slightly before disappearing
    scale.value = withSequence(
      withTiming(1, { duration: scaleInDuration, easing: Easing.out(Easing.cubic) }),
      withDelay(
        riseDuration * 0.7 - scaleInDuration,
        withTiming(0.6, { duration: riseDuration * 0.3, easing: Easing.in(Easing.cubic) }),
      ),
    );

    // Rise upward
    translateY.value = withTiming(-travelY, { duration: riseDuration, easing: riseEasing });

    // Subtle horizontal drift
    translateX.value = withTiming(driftX, { duration: riseDuration, easing: riseEasing });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: startX,
    bottom: -size,
    width: size,
    height: size,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image source={source} style={styles.stickerImage} contentFit="contain" autoplay />
    </Animated.View>
  );
}

// ============================================
// COMPONENT
// ============================================

interface PhotoStickerOverlayProps {
  reactions: PhotoReaction[];
}

export function PhotoStickerOverlay({ reactions }: PhotoStickerOverlayProps) {
  const [particles, setParticles] = useState<StickerParticle[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const nextId = useRef(0);

  // Collect unique sticker sources from reactions
  const stickerSources = useMemo(() => {
    const seen = new Set<string>();
    const sources: ImageSource[] = [];
    for (const r of reactions) {
      if (seen.has(r.stickerId)) continue;
      seen.add(r.stickerId);
      const def = getStickerById(r.stickerId);
      if (def) sources.push(def.source as ImageSource);
    }
    return sources;
  }, [reactions]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  // Continuous spawn loop
  useEffect(() => {
    if (stickerSources.length === 0 || containerSize.width === 0) return;

    const spawn = () => {
      const source = stickerSources[Math.floor(Math.random() * stickerSources.length)];
      const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
      const padding = size / 2;
      const startX = padding + Math.random() * (containerSize.width - size - padding);
      const driftX = (Math.random() - 0.5) * DRIFT_X * 2;
      const travelY = containerSize.height * (0.4 + Math.random() * 0.15);

      const particle: StickerParticle = {
        id: nextId.current++,
        source,
        startX,
        size,
        driftX,
        travelY,
      };

      setParticles(prev => [...prev, particle].slice(-MAX_PARTICLES));

      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== particle.id));
      }, PARTICLE_LIFETIME_MS);
    };

    // Spawn first particle immediately
    spawn();
    const interval = setInterval(spawn, SPAWN_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [stickerSources, containerSize]);

  if (reactions.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none" onLayout={handleLayout}>
      {particles.map(p => (
        <FloatingSticker
          key={p.id}
          source={p.source}
          startX={p.startX}
          size={p.size}
          driftX={p.driftX}
          travelY={p.travelY}
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
    overflow: 'hidden',
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
});
