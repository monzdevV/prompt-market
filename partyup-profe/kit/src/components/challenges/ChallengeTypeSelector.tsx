/**
 * PARTYUP Challenge Type Selector
 * ================================
 * Reusable card components for selecting challenge types (image, note, check).
 * Used by both party and venue challenge flows.
 */

import {
  BorderRadius,
  Colors,
  Spacing,
} from '@/src/constants/theme';
import { ChallengeType } from '@/src/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { XMarkIcon } from 'react-native-heroicons/solid';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUNDED: string = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const CARD_HEIGHT = CARD_WIDTH * 0.45;

// ============================================
// EMOJI ASSETS
// ============================================

const EMOJIS = {
  fire: require('@/assets/emojis/fire.png'),
  partying_face: require('@/assets/emojis/partying_face.png'),
  mirror_ball: require('@/assets/emojis/mirror_ball.png'),
  crown: require('@/assets/emojis/crown.png'),
  tada: require('@/assets/emojis/tada.png'),
  beer: require('@/assets/emojis/beer.png'),
  champagne: require('@/assets/emojis/champagne.png'),
  speech_balloon: require('@/assets/emojis/speech_balloon.png'),
  question: require('@/assets/emojis/question.png'),
};

// ============================================
// STICKER POSITIONS
// ============================================

type StickerPosition = {
  right: number;
  bottom: number;
  size: number;
  rotate: number;
  zIndex: number;
};

const STICKER_POSITIONS: StickerPosition[] = [
  { right: -25, bottom: -28, size: 120, rotate: -12, zIndex: 10 },
  { right: 52, bottom: -12, size: 72, rotate: 18, zIndex: 5 },
  { right: -10, bottom: 57, size: 58, rotate: -15, zIndex: 4 },
  { right: 94, bottom: -5, size: 55, rotate: -10, zIndex: 3 },
  { right: 65, bottom: 42, size: 44, rotate: -10, zIndex: 2 },
];

// ============================================
// CHALLENGE TYPES CONFIG
// ============================================

export type ChallengeTypeConfig = {
  id: ChallengeType;
  titleKey: string;
  subtitleKey: string;
  gradientColors: [string, string];
  accentColor: string;
  texture: 'confetti' | 'diagonal-lines' | 'stars';
  emojis: any[];
};

export const CHALLENGE_TYPES: ChallengeTypeConfig[] = [
  {
    id: 'image',
    titleKey: 'challenges.imageChallenge',
    subtitleKey: 'challenges.imageSubtitle',
    gradientColors: ['#F97316', '#EA580C'],
    accentColor: '#FDBA74',
    texture: 'confetti',
    emojis: [
      EMOJIS.fire,
      EMOJIS.partying_face,
      EMOJIS.mirror_ball,
      EMOJIS.crown,
      EMOJIS.tada,
      EMOJIS.beer,
    ],
  },
  {
    id: 'note',
    titleKey: 'challenges.noteChallenge',
    subtitleKey: 'challenges.noteSubtitle',
    gradientColors: ['#8B5CF6', '#6D28D9'],
    accentColor: '#A78BFA',
    texture: 'diagonal-lines',
    emojis: [
      EMOJIS.speech_balloon,
      EMOJIS.question,
      EMOJIS.fire,
      EMOJIS.partying_face,
      EMOJIS.crown,
      EMOJIS.tada,
    ],
  },
  {
    id: 'check',
    titleKey: 'challenges.checkChallenge',
    subtitleKey: 'challenges.checkSubtitle',
    gradientColors: ['#10B981', '#059669'],
    accentColor: '#6EE7B7',
    texture: 'stars',
    emojis: [
      EMOJIS.partying_face,
      EMOJIS.fire,
      EMOJIS.mirror_ball,
      EMOJIS.crown,
      EMOJIS.champagne,
      EMOJIS.tada,
    ],
  },
];

// ============================================
// TEXTURE RENDERERS
// ============================================

type TextureFade = 'top-right' | 'top-left' | 'center';

const getOpacityForPosition = (
  x: number,
  y: number,
  fade: TextureFade,
  baseIntensity: number,
) => {
  let fadeMultiplier = 1;
  switch (fade) {
    case 'top-right':
      fadeMultiplier = 1 - ((1 - x) * 0.6 + y * 0.4);
      break;
    case 'top-left':
      fadeMultiplier = 1 - (x * 0.6 + y * 0.4);
      break;
    case 'center': {
      const distFromCenter = Math.sqrt(
        Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2),
      );
      fadeMultiplier = 1 - distFromCenter * 1.2;
      break;
    }
  }
  return Math.max(0, Math.min(1, fadeMultiplier)) * baseIntensity;
};

function renderConfettiTexture() {
  return Array.from({ length: 12 }).map((_, i) => {
    const x = (i % 4) / 4 + 0.1;
    const y = Math.floor(i / 4) / 3 + 0.1;
    const opacity = getOpacityForPosition(x, y, 'center', 0.1);
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
          left: `${8 + (i % 4) * 24}%`,
          top: `${12 + Math.floor(i / 4) * 28}%`,
          transform: [{ rotate: `${rotations[i]}deg` }],
        }}
      />
    );
  });
}

function renderDiagonalLinesTexture() {
  return Array.from({ length: 15 }).map((_, i) => {
    const x = i / 15;
    const opacity = getOpacityForPosition(x, 0.5, 'top-left', 0.06);
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
}

function renderStarsTexture() {
  return Array.from({ length: 8 }).map((_, i) => {
    const x = (i % 4) / 4 + 0.1;
    const y = Math.floor(i / 4) / 2 + 0.15;
    const opacity = getOpacityForPosition(x, y, 'top-right', 0.1);
    const size = 6 + (i % 3) * 4;
    return (
      <View
        key={`star-${i}`}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          backgroundColor: `rgba(255, 255, 255, ${opacity})`,
          left: `${10 + (i % 4) * 22}%`,
          top: `${18 + Math.floor(i / 4) * 38}%`,
          transform: [{ rotate: '45deg' }],
        }}
      />
    );
  });
}

export const TEXTURE_RENDERERS: Record<string, () => React.ReactNode> = {
  confetti: renderConfettiTexture,
  'diagonal-lines': renderDiagonalLinesTexture,
  stars: renderStarsTexture,
};

// ============================================
// CHALLENGE TYPE CARD
// ============================================

interface ChallengeTypeCardProps {
  config: ChallengeTypeConfig;
  index: number;
  onPress: () => void;
}

export function ChallengeTypeCard({ config, index, onPress }: ChallengeTypeCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderTexture = TEXTURE_RENDERERS[config.texture];

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).duration(400)}
      style={styles.cardWrapper}
    >
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.cardPressable}
        >
          <View style={styles.cardInner}>
            <LinearGradient
              colors={config.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.cartoonTexture} pointerEvents="none">
              {renderTexture()}
            </View>

            <View style={styles.textContent}>
              <Text style={styles.gameName}>{t(config.titleKey)}</Text>
              <Text
                style={[styles.gameSubtitle, { color: config.accentColor }]}
              >
                {t(config.subtitleKey)}
              </Text>
            </View>

            <View style={styles.stickersBackground} pointerEvents="none">
              {STICKER_POSITIONS.map((pos, i) => (
                <Image
                  key={i}
                  source={config.emojis[i]}
                  style={[
                    styles.backgroundSticker,
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
              ))}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ============================================
// CHALLENGE TYPE SCREEN (full-screen selector)
// ============================================

interface ChallengeTypeSelectorProps {
  onSelectType: (type: ChallengeType) => void;
  onClose: () => void;
}

export function ChallengeTypeSelector({ onSelectType, onClose }: ChallengeTypeSelectorProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.header}
      >
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={12}
        >
          <View style={styles.closeButtonInner}>
            <XMarkIcon size={18} color={Colors.text.primary} />
          </View>
        </Pressable>

        <Text style={styles.headerTitle}>
          {t('challenges.newWord')}{' '}
          <Text style={styles.headerTitleAccent}>{t('challenges.challengeWord')}</Text>
        </Text>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {CHALLENGE_TYPES.map((config, index) => (
          <ChallengeTypeCard
            key={config.id}
            config={config}
            index={index}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelectType(config.id);
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  closeButtonInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: ROUNDED,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  headerTitleAccent: {
    color: Colors.primary.main,
  },
  headerSpacer: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 10,
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
  cardPressable: {
    flex: 1,
  },
  cardInner: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  cartoonTexture: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  textContent: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  gameName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  gameSubtitle: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
    marginTop: -4,
  },
  stickersBackground: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: '60%',
    width: '70%',
    zIndex: 1,
  },
  backgroundSticker: {
    position: 'absolute',
    opacity: 1,
  },
});
