/**
 * PARTYUP Venue Offer Type Selection
 * ====================================
 * Full-screen card selector for venue offer types (2x1, 3x2, Custom).
 * Visual style mirrors the challenge type screen with red gradients.
 */

import { TEXTURE_RENDERERS } from '@/src/components/challenges';
import {
  BorderRadius,
  Colors,
  Spacing,
} from '@/src/constants/theme';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef } from 'react';
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
  beer: require('@/assets/emojis/beer.png'),
  beers: require('@/assets/emojis/beers.png'),
  cocktail: require('@/assets/emojis/cocktail.png'),
  tropical_drink: require('@/assets/emojis/tropical_drink.png'),
  champagne: require('@/assets/emojis/champagne.png'),
  clinking_glasses: require('@/assets/emojis/clinking_glasses.png'),
  wine_glass: require('@/assets/emojis/wine_glass.png'),
  crown: require('@/assets/emojis/crown.png'),
  fire: require('@/assets/emojis/fire.png'),
  partying_face: require('@/assets/emojis/partying_face.png'),
  tada: require('@/assets/emojis/tada.png'),
  tumbler_glass: require('@/assets/emojis/tumbler_glass.png'),
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
// OFFER TYPES CONFIG
// ============================================

export type OfferTypeId = '2x1' | '3x2' | 'custom';

type OfferTypeConfig = {
  id: OfferTypeId;
  titleKey: string;
  subtitleKey: string;
  gradientColors: [string, string];
  accentColor: string;
  texture: 'confetti' | 'diagonal-lines' | 'stars';
  emojis: any[];
};

const OFFER_TYPES: OfferTypeConfig[] = [
  {
    id: '2x1',
    titleKey: 'venueDashboard.offer2x1',
    subtitleKey: 'venueDashboard.offer2x1Subtitle',
    gradientColors: ['#EF4444', '#DC2626'],
    accentColor: '#FCA5A5',
    texture: 'confetti',
    emojis: [
      EMOJIS.beers,
      EMOJIS.beer,
      EMOJIS.cocktail,
      EMOJIS.partying_face,
      EMOJIS.fire,
      EMOJIS.tada,
    ],
  },
  {
    id: '3x2',
    titleKey: 'venueDashboard.offer3x2',
    subtitleKey: 'venueDashboard.offer3x2Subtitle',
    gradientColors: ['#E11D48', '#BE123C'],
    accentColor: '#FDA4AF',
    texture: 'diagonal-lines',
    emojis: [
      EMOJIS.champagne,
      EMOJIS.clinking_glasses,
      EMOJIS.tropical_drink,
      EMOJIS.wine_glass,
      EMOJIS.crown,
      EMOJIS.tada,
    ],
  },
  {
    id: 'custom',
    titleKey: 'venueDashboard.offerCustom',
    subtitleKey: 'venueDashboard.offerCustomSubtitle',
    gradientColors: ['#F43F5E', '#E11D48'],
    accentColor: '#FB7185',
    texture: 'stars',
    emojis: [
      EMOJIS.tumbler_glass,
      EMOJIS.fire,
      EMOJIS.partying_face,
      EMOJIS.crown,
      EMOJIS.champagne,
      EMOJIS.tada,
    ],
  },
];

// ============================================
// OFFER TYPE CARD
// ============================================

interface OfferTypeCardProps {
  config: OfferTypeConfig;
  index: number;
  onPress: () => void;
}

function OfferTypeCard({ config, index, onPress }: OfferTypeCardProps) {
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
// MAIN SCREEN
// ============================================

export default function VenueOfferTypeScreen() {
  const { t } = useTranslation();
  const isNavigatingRef = useRef(false);

  const handleSelectType = (type: OfferTypeId) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/venue/offer-details?offerType=${type}` as any);
    setTimeout(() => { isNavigatingRef.current = false; }, 1000);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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
          {t('venueDashboard.newWord')}{' '}
          <Text style={styles.headerTitleAccent}>{t('venueDashboard.offerWord')}</Text>
        </Text>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {OFFER_TYPES.map((config, index) => (
          <OfferTypeCard
            key={config.id}
            config={config}
            index={index}
            onPress={() => handleSelectType(config.id)}
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
    color: '#EF4444',
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
