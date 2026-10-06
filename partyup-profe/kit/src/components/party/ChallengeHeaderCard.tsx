/**
 * Challenge header card that mirrors the StyledGameCard design from GamesScreen.
 * Displays challenge number and question, background texture pattern, and
 * sticker collage. Tappable to trigger onPress (e.g. open results sheet).
 */

import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { Spacing } from '@/src/constants/theme';
import { useChallengeCountdown } from '@/src/hooks';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

// ============================================
// STICKER POOL (same set used in GamesScreen)
// ============================================

const STICKER_POOL = [
  require('@/assets/emojis/fire.png'),
  require('@/assets/emojis/partying_face.png'),
  require('@/assets/emojis/mirror_ball.png'),
  require('@/assets/emojis/crown.png'),
  require('@/assets/emojis/tada.png'),
  require('@/assets/emojis/champagne.png'),
  require('@/assets/emojis/beer.png'),
  require('@/assets/emojis/beers.png'),
  require('@/assets/emojis/cocktail.png'),
  require('@/assets/emojis/tropical_drink.png'),
  require('@/assets/emojis/wine_glass.png'),
  require('@/assets/emojis/game_dice.png'),
];

const STICKER_POSITIONS = [
  { right: -25, bottom: -28, size: 120, rotate: -12, zIndex: 10 },
  { right: 52, bottom: -12, size: 72, rotate: 18, zIndex: 5 },
  { right: -10, bottom: 57, size: 58, rotate: -15, zIndex: 4 },
  { right: 94, bottom: -5, size: 55, rotate: -10, zIndex: 3 },
  { right: 65, bottom: 42, size: 44, rotate: -10, zIndex: 2 },
];

// ============================================
// GRADIENT PALETTES PER CHALLENGE TYPE
// ============================================

const CHALLENGE_GRADIENTS: Record<string, [string, string]> = {
  image: ['#F97316', '#EA580C'],
  note: ['#8B5CF6', '#6D28D9'],
  check: ['#10B981', '#059669'],
};

const ACCENT_COLORS: Record<string, string> = {
  image: '#FED7AA',
  note: '#C4B5FD',
  check: '#6EE7B7',
};

// ============================================
// TEXTURE PATTERNS (identical to GamesScreen)
// ============================================

type TextureFade = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

const TEXTURES_BY_TYPE: Record<string, { type: string; fade: TextureFade; intensity: number }> = {
  image: { type: 'diagonal-lines', fade: 'top-left', intensity: 0.06 },
  note: { type: 'confetti', fade: 'center', intensity: 0.1 },
  check: { type: 'dots-grid', fade: 'bottom-right', intensity: 0.07 },
};

function getOpacityForPosition(
  x: number,
  y: number,
  fade: TextureFade,
  baseIntensity: number,
): number {
  let fadeMultiplier = 1;
  switch (fade) {
    case 'top-left':
      fadeMultiplier = 1 - (x * 0.6 + y * 0.4);
      break;
    case 'top-right':
      fadeMultiplier = 1 - ((1 - x) * 0.6 + y * 0.4);
      break;
    case 'bottom-left':
      fadeMultiplier = 1 - (x * 0.6 + (1 - y) * 0.4);
      break;
    case 'bottom-right':
      fadeMultiplier = 1 - ((1 - x) * 0.6 + (1 - y) * 0.4);
      break;
    case 'center': {
      const dist = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2));
      fadeMultiplier = 1 - dist * 1.2;
      break;
    }
  }
  return Math.max(0, Math.min(1, fadeMultiplier)) * baseIntensity;
}

function renderTexture(textureType: string, fade: TextureFade, intensity: number) {
  switch (textureType) {
    case 'diagonal-lines':
      return Array.from({ length: 15 }).map((_, i) => {
        const x = i / 15;
        const opacity = getOpacityForPosition(x, 0.5, fade, intensity);
        return (
          <View
            key={`line-${i}`}
            style={{
              position: 'absolute',
              width: 2,
              height: 400,
              backgroundColor: `rgba(255, 255, 255, ${opacity})`,
              left: -60 + i * 22,
              top: -80,
              transform: [{ rotate: '45deg' }],
            }}
          />
        );
      });

    case 'dots-grid':
      return Array.from({ length: 24 }).map((_, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const x = col / 6;
        const y = row / 4;
        const opacity = getOpacityForPosition(x, y, fade, intensity);
        return (
          <View
            key={`dot-${i}`}
            style={{
              position: 'absolute',
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: `rgba(255, 255, 255, ${opacity})`,
              left: `${12 + col * 16}%` as any,
              top: `${15 + row * 22}%` as any,
            }}
          />
        );
      });

    case 'confetti':
      return Array.from({ length: 12 }).map((_, i) => {
        const x = (i % 4) / 4 + 0.1;
        const y = Math.floor(i / 4) / 3 + 0.1;
        const opacity = getOpacityForPosition(x, y, fade, intensity);
        const rotations = [15, -20, 45, -10, 30, -35, 20, -25, 40, -15, 25, -30];
        return (
          <View
            key={`confetti-${i}`}
            style={{
              position: 'absolute',
              width: 4,
              height: 12,
              backgroundColor: `rgba(255, 255, 255, ${opacity})`,
              borderRadius: 2,
              left: `${8 + (i % 4) * 24}%` as any,
              top: `${12 + Math.floor(i / 4) * 28}%` as any,
              transform: [{ rotate: `${rotations[i]}deg` }],
            }}
          />
        );
      });

    default:
      return null;
  }
}

// ============================================
// DETERMINISTIC RANDOM (seeded by challenge order)
// ============================================

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// TYPES
// ============================================

export type ChallengeSource =
  | { type: 'venue'; name: string; isVerified: boolean }
  | { type: 'party' };

const FIRE_STICKER = require('@/assets/emojis/fire.png');

// ============================================
// COMPONENT
// ============================================

interface ChallengeHeaderCardProps {
  orderNumber: number;
  question: string;
  type: string;
  expiresAt?: string;
  isCompleted?: boolean;
  source?: ChallengeSource;
  width?: number;
  onPress?: () => void;
}

export function ChallengeHeaderCard({ orderNumber, question, type, expiresAt, isCompleted, source, width, onPress }: ChallengeHeaderCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const countdown = useChallengeCountdown(expiresAt ?? new Date(0).toISOString());
  const showFinished = isCompleted || (expiresAt && countdown.isExpired);
  const showTimer = expiresAt && !isCompleted && !countdown.isExpired;

  const gradientColors = CHALLENGE_GRADIENTS[type] ?? CHALLENGE_GRADIENTS.check;
  const accentColor = ACCENT_COLORS[type] ?? ACCENT_COLORS.check;
  const texture = TEXTURES_BY_TYPE[type] ?? TEXTURES_BY_TYPE.check;

  const stickers = useMemo(
    () => seededShuffle(STICKER_POOL, orderNumber).slice(0, STICKER_POSITIONS.length),
    [orderNumber],
  );

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardWidth = width ?? CARD_WIDTH;
  const cardHeight = cardWidth * 0.45;

  return (
    <Animated.View style={[styles.wrapper, { width: cardWidth, height: cardHeight }, cardAnimStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={styles.inner}>
          {/* Background gradient */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Texture pattern */}
          <View style={styles.texture} pointerEvents="none">
            {renderTexture(texture.type, texture.fade, texture.intensity)}
          </View>

          {/* Status badge - top right */}
          {(showTimer || showFinished) && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {showFinished
                  ? t('challenges.finished')
                  : countdown.formattedTime}
              </Text>
            </View>
          )}

          {/* Text content */}
          <View style={styles.textContent}>
            <View>
              <View style={styles.titleContainer}>
                <Text style={styles.titleRow}>
                  {t('challenges.challengeTitle')}
                  <Text style={[styles.orderNumber, { color: accentColor }]}>
                    {' '}#{orderNumber}
                  </Text>
                </Text>
              </View>
              {source && (
                <View style={styles.sourceBadge}>
                  {source.type === 'venue' ? (
                    <>
                      <Text style={styles.sourceBadgeText} numberOfLines={1}>
                        {source.name}
                      </Text>
                      {source.isVerified && <VerifiedBadge size={12} />}
                    </>
                  ) : (
                    <>
                      <Image source={FIRE_STICKER} style={styles.sourceBadgeIcon} contentFit="contain" />
                      <Text style={styles.sourceBadgeText}>Party</Text>
                    </>
                  )}
                </View>
              )}
            </View>
            <Text style={styles.question} numberOfLines={3}>
              {question}
            </Text>
          </View>

          {/* Sticker collage - bottom right */}
          <View style={styles.stickersContainer} pointerEvents="none">
            {stickers.map((sticker, i) => {
              const pos = STICKER_POSITIONS[i];
              return (
                <Image
                  key={i}
                  source={sticker}
                  style={[
                    styles.sticker,
                    {
                      right: pos.right,
                      bottom: pos.bottom,
                      width: pos.size,
                      height: pos.size,
                      transform: [{ rotate: `${pos.rotate}deg` }],
                      zIndex: pos.zIndex,
                    },
                  ]}
                  contentFit="contain"
                />
              );
            })}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  pressable: {
    flex: 1,
  },
  inner: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  textContent: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    right: '40%',
    bottom: Spacing.md,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleRow: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  orderNumber: {
    fontWeight: '900',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  question: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
    fontFamily: ROUNDED,
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: ROUNDED,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    marginLeft: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: '90%',
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: ROUNDED,
  },
  sourceBadgeIcon: {
    width: 12,
    height: 12,
  },
  stickersContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: '60%',
    width: '70%',
    zIndex: 1,
  },
  sticker: {
    position: 'absolute',
    opacity: 1,
  },
});
