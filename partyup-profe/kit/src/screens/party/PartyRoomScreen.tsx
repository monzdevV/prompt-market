/**
 * PARTYUP Party Room Screen
 * ==========================
 * Main party screen orchestrating extracted components:
 * - Hero section with animated glow background
 * - Party code display with copy
 * - People carousel (manual scroll)
 * - Drink counter with particle effects
 * - Photo gallery (Moments) with upload prompt
 * - Notes section
 */

import { AvatarImage } from '@/src/components/ui/AvatarImage';
import { getRandomPartyGif } from '@/src/constants/partyBackgrounds';
import {
  Colors,
  Spacing,
  Typography,
} from '@/src/constants/theme';
import { useApp, useIsPremium } from '@/src/store';
import { DrinkCount, DrinkType, OfferTicket, PartyChallenge, PartyMedia, PartyParticipant, PhotoReaction, Venue } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MeshGradientView } from 'expo-mesh-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CAROUSEL_CARD_WIDTH,
  ChallengeCarousel,
  DrinkParticlesOverlay,
  FallingConfetti,
  NotesSection,
  PeopleCarousel,
  PhotoGrid,
  SectionHeader,
  TearTicket,
  Toast,
  useDrinkParticles,
} from '@/src/components/party';
import { ChallengeHeaderCard, ChallengeSource } from '@/src/components/party/ChallengeHeaderCard';
import { ProBanner } from '@/src/components/subscription/ProBanner';
import { ProBadge } from '@/src/components/ui/ProBadge';
import { VenueHeroCard } from '@/src/components/ui/VenueHeroCard';
import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { useAppState, useChallengeCountdown, useTick } from '@/src/hooks';
import { darkenColors, MESH_COLUMNS, MESH_ROWS, useMeshGradient } from '@/src/hooks/useMeshGradient';
import {
  getChallengesByParty,
  getResponsesByParty,
  MAX_CHALLENGES_PER_PARTY,
  subscribeToChallengeResponses,
  subscribeToChallenges,
} from '@/src/services/challengeService';
import { getPartyPhotos, subscribeToPhotos } from '@/src/services/mediaService';
import { getPartyNotes, subscribeToNotes } from '@/src/services/noteService';
import { addDrink, canUploadPhotos, endParty, FREE_PARTY_MEMBER_LIMIT, getActiveParty, getPartyById, leaveParty, MAX_DRINKS_PER_USER, PRO_PARTY_MEMBER_LIMIT, removeDrink, subscribeToParty } from '@/src/services/partyService';
import {
  getChallengeReactionsByParty,
  getReactionsByParty,
  removeReaction,
  subscribeToChallengeReactions,
  subscribeToReactions,
  upsertReaction,
} from '@/src/services/reactionService';
import {
  getOfferTicketsForParty,
  redeemOfferTicket,
  subscribeToOfferTickets,
} from '@/src/services/venueOfferService';
import { getVenueById } from '@/src/services/venueService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// MESH GRADIENT COLORS (for photo prompt card)
// ============================================

const PHOTO_MESH_COLORS = darkenColors([
  '#A855F7', '#6366F1', '#A855F7', '#FBBF24',
  '#EC4899', '#A855F7', '#EC4899', '#A855F7',
  '#F97316', '#EC4899', '#F97316', '#A855F7',
  '#FBBF24', '#F97316', '#EC4899', '#A855F7',
]);

// ============================================
// CHALLENGE CARD (Impostor card style)
// ============================================

const CHALLENGE_STICKER_POSITIONS = [
  { right: -25, bottom: -28, size: 120, rotate: -12, zIndex: 10 },
  { right: 52, bottom: -12, size: 72, rotate: 18, zIndex: 5 },
  { right: -10, bottom: 57, size: 58, rotate: -15, zIndex: 4 },
  { right: 94, bottom: -5, size: 55, rotate: -10, zIndex: 3 },
  { right: 65, bottom: 42, size: 44, rotate: -10, zIndex: 2 },
  { right: 120, bottom: 30, size: 40, rotate: 20, zIndex: 1 },
  { right: 30, bottom: 80, size: 36, rotate: -25, zIndex: 1 },
];

const CHALLENGE_CARD_STICKERS = [
  require('@/assets/emojis/fire.png'),
  require('@/assets/emojis/partying_face.png'),
  require('@/assets/emojis/mirror_ball.png'),
  require('@/assets/emojis/crown.png'),
  require('@/assets/emojis/tada.png'),
  require('@/assets/emojis/champagne.png'),
  require('@/assets/emojis/beer.png'),
];

const CHALLENGE_GRADIENTS: Record<string, [string, string]> = {
  image: ['#F97316', '#EA580C'],
  note: ['#8B5CF6', '#6D28D9'],
  check: ['#10B981', '#059669'],
};

interface ChallengeCardProps {
  challenge: { type: string; orderNumber: number; expiresAt: string };
  source?: ChallengeSource;
  onPress: () => void;
  width?: number;
}

const FIRE_STICKER = require('@/assets/emojis/fire.png');

function ChallengeCard({ challenge, source, onPress, width }: ChallengeCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const { formattedTime, isUrgent } = useChallengeCountdown(challenge.expiresAt);

  // Pulse animation for urgent state
  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    if (isUrgent) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseAnim);
      pulseAnim.value = 1;
    }
  }, [isUrgent]);

  const timerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

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

  const gradient = CHALLENGE_GRADIENTS[challenge.type] ?? ['#F97316', '#EA580C'];
  const cardWidth = width ?? CHALLENGE_CARD_WIDTH;
  const cardHeight = cardWidth * 0.45;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[challengeCardStyles.wrapper, { width: cardWidth, height: cardHeight }]}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={challengeCardStyles.pressable}
        >
          <View style={challengeCardStyles.inner}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Confetti texture */}
            <View style={challengeCardStyles.texture} pointerEvents="none">
              {Array.from({ length: 12 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 4,
                    height: 12,
                    backgroundColor: `rgba(255,255,255,${0.06 + (i % 3) * 0.02})`,
                    borderRadius: 2,
                    left: `${8 + (i % 4) * 24}%`,
                    top: `${12 + Math.floor(i / 4) * 28}%`,
                    transform: [{ rotate: `${[15, -20, 45, -10, 30, -35, 20, -25, 40, -15, 25, -30][i]}deg` }],
                  }}
                />
              ))}
            </View>

            {/* Source badge */}
            {source && (
              <View style={challengeCardStyles.sourceBadge}>
                {source.type === 'venue' ? (
                  <>
                    <Text style={challengeCardStyles.sourceBadgeText} numberOfLines={1}>
                      {source.name}
                    </Text>
                    {source.isVerified && <VerifiedBadge size={14} />}
                  </>
                ) : (
                  <>
                    <Image source={FIRE_STICKER} style={challengeCardStyles.sourceBadgeIcon} contentFit="contain" />
                    <Text style={challengeCardStyles.sourceBadgeText}>Party</Text>
                  </>
                )}
              </View>
            )}

            {/* Text content with countdown */}
            <View style={challengeCardStyles.textContent}>
              <View style={challengeCardStyles.titleRow}>
                <Text style={challengeCardStyles.title}>
                  {t('challenges.challengeTitle')}
                </Text>
                <Text style={challengeCardStyles.subtitle}>
                  {' '}#{challenge.orderNumber}
                </Text>
              </View>
              <Animated.View style={[{ flex: 1, justifyContent: 'flex-end', overflow: 'visible' }, timerPulseStyle]}>
                <Text
                  style={[
                    challengeCardStyles.countdown,
                    isUrgent && challengeCardStyles.countdownUrgent,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formattedTime}
                </Text>
              </Animated.View>
            </View>

            {/* Sticker cluster */}
            <View style={challengeCardStyles.stickers} pointerEvents="none">
              {CHALLENGE_STICKER_POSITIONS.map((pos, i) => (
                <Image
                  key={i}
                  source={CHALLENGE_CARD_STICKERS[i % CHALLENGE_CARD_STICKERS.length]}
                  style={[
                    challengeCardStyles.sticker,
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

const CHALLENGE_CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;


const challengeCardStyles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  pressable: { flex: 1 },
  inner: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  texture: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 0 },
  textContent: {
    position: 'absolute',
    top: 16,
    left: 20,
    bottom: 12,
    right: '40%',
    zIndex: 10,
    overflow: 'visible',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '900',
    color: 'rgba(0,0,0,0.3)',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  countdown: {
    fontSize: 46,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 48,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    transform: [{ scaleY: 1.1 }],
  },
  countdownUrgent: {
    color: '#FF3B30',
  },
  stickers: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: '60%',
    width: '70%',
    zIndex: 1,
  },
  sticker: { position: 'absolute', opacity: 1 },
  sourceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
    maxWidth: '55%',
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  sourceBadgeIcon: {
    width: 14,
    height: 14,
  },
});

// ============================================
// DRINK COUNTER
// ============================================

/** Drink types the user can log, with their 3D emoji (same order as DRINK_INFO). */
const DRINK_TYPE_OPTIONS: { type: DrinkType; icon: number }[] = [
  { type: 'beer', icon: require('@/assets/emojis/beer.png') },
  { type: 'cubata', icon: require('@/assets/emojis/tumbler_glass.png') },
  { type: 'shot', icon: require('@/assets/emojis/clinking_glasses.png') },
  { type: 'wine', icon: require('@/assets/emojis/wine_glass.png') },
  { type: 'cocktail', icon: require('@/assets/emojis/tropical_drink.png') },
  { type: 'other', icon: require('@/assets/emojis/cocktail.png') },
];

interface DrinkCounterProps {
  count: number;
  maxReached: boolean;
  selectedType: DrinkType;
  onSelectType: (type: DrinkType) => void;
  onAdd: () => void;
  onRemove: () => void;
  buttonRef?: React.RefObject<View | null>;
}

function DrinkCounter({ count, maxReached, selectedType, onSelectType, onAdd, onRemove, buttonRef }: DrinkCounterProps) {
  const { t } = useTranslation();
  const addScale = useSharedValue(1);
  const removeScale = useSharedValue(1);
  const [displayCount, setDisplayCount] = useState(count);
  const prevCount = useRef(count);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (count !== displayCount) {
      const increasing = count > prevCount.current;
      prevCount.current = count;
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      translateY.value = increasing ? 30 : -30;
      opacity.value = 0;
      setDisplayCount(count);
      translateY.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 120 });
    }
  }, [count]);

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleAdd = () => {
    if (maxReached) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { damping: 18, stiffness: 180, mass: 0.8 }),
    );
    onAdd();
  };

  const handleRemove = () => {
    if (count <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { damping: 18, stiffness: 180, mass: 0.8 }),
    );
    onRemove();
  };

  const addBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }));
  const removeBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: removeScale.value }] }));

  const DrinkBtn = ({ icon, disabled, style: animStyle, onPress: press }: {
    icon: string; disabled?: boolean;
    style: StyleProp<ViewStyle>;
    onPress: () => void;
  }) => (
    <Animated.View style={animStyle}>
      <Pressable onPress={press} disabled={disabled} style={[styles.drinkBtn, disabled && styles.drinkBtnDisabled]}>
        <View style={styles.drinkBtnGlass}>
          <Ionicons name={icon as any} size={20} color={disabled ? 'rgba(255,255,255,0.3)' : '#fff'} />
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.drinkWrapper}>
      <LinearGradient
        colors={['#FF5200', '#FF8C00', '#FFA500', '#FFD000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.drinkContainer}
      >
        {/* Background pattern */}
        <View style={styles.drinkPattern} pointerEvents="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.drinkPatternIcon,
                {
                  left: `${18 + i * 10}%`,
                  top: `${10 + (i % 3) * 28}%`,
                  opacity: 0.1 + (i % 3) * 0.03,
                  transform: [{ rotate: `${-15 + i * 10}deg` }, { scale: 0.6 + (i % 3) * 0.15 }],
                },
              ]}
            >
              <Ionicons name="beer-outline" size={16} color="#fff" />
            </View>
          ))}
        </View>
        <View style={styles.drinkStickerLeft} pointerEvents="none">
          <Image
            source={require('@/assets/emojis/beers.png')}
            style={{ width: 80, height: 80, transform: [{ rotate: '18deg' }] }}
            contentFit="contain"
          />
        </View>
        <View style={styles.drinkStickerRight} pointerEvents="none">
          <Image
            source={require('@/assets/emojis/champagne.png')}
            style={{ width: 72, height: 72, transform: [{ rotate: '14deg' }] }}
            contentFit="contain"
          />
        </View>
        <View ref={buttonRef} style={styles.drinkInner}>
          <DrinkBtn icon="remove" disabled={count === 0} style={removeBtnStyle} onPress={handleRemove} />
          <View style={styles.drinkCountDisplay}>
            <Text style={styles.drinkLabel}>{t('partyRoom.drinks')}</Text>
            <View style={styles.drinkNumberBox}>
              <Animated.Text style={[styles.drinkNumber, numberStyle]}>{displayCount}</Animated.Text>
            </View>
          </View>
          <DrinkBtn icon="add" disabled={maxReached} style={addBtnStyle} onPress={handleAdd} />
        </View>
        <View style={styles.drinkTypeRow} accessibilityRole="radiogroup">
          {DRINK_TYPE_OPTIONS.map(({ type, icon }) => {
            const selected = type === selectedType;
            return (
              <Pressable
                key={type}
                onPress={() => {
                  if (selected) return;
                  Haptics.selectionAsync();
                  onSelectType(type);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`drinkTypes.${type}`)}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.drinkTypeChip,
                  selected && styles.drinkTypeChipSelected,
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}
              >
                <Image source={icon} style={styles.drinkTypeIcon} contentFit="contain" />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.drinkTypeLabel}>{t(`drinkTypes.${selectedType}`)}</Text>
      </LinearGradient>
    </View>
  );
}

// ============================================
// PHOTO PROMPT CARD
// ============================================

function PhotoPromptCard({ partyId, itemSize }: { partyId: string; itemSize: number }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const { points, colors } = useMeshGradient(PHOTO_MESH_COLORS);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );
    router.push({ pathname: '/photo-sheet', params: { partyId } });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.promptCard, { width: itemSize, height: itemSize * (4 / 3) }, animatedStyle]}
    >
      <Pressable onPress={handlePress} style={styles.promptCardPressable}>
        {Platform.OS === 'ios' ? (
          <View style={StyleSheet.absoluteFill}>
            <MeshGradientView
              style={StyleSheet.absoluteFill}
              columns={MESH_COLUMNS}
              rows={MESH_ROWS}
              colors={colors}
              points={points}
              smoothsColors
              ignoresSafeArea={false}
            />
            <BlurView tint="dark" intensity={25} style={StyleSheet.absoluteFill} />
          </View>
        ) : (
          <LinearGradient colors={['#1C1C1E', '#141416', '#0A0A0B']} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.promptPreview}>
          <View style={styles.promptCameraIcon}>
            <Ionicons
              name="camera"
              size={80}
              color="rgba(255,255,255,0.85)"
              style={{ transform: [{ rotate: '45deg' }] }}
            />
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 0, y: 1 }}
            style={styles.promptPreviewGradient}
          />
        </View>
        <View style={styles.promptCardContent}>
          <Text style={styles.promptCardTitle}>{t('partyRoom.quickSnap')}</Text>
          <Text style={styles.promptCardSubtitle}>{t('partyRoom.shareAPhoto')}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// GALLERY SECTION (Moments) - uses unified PhotoGrid
// ============================================

interface GallerySectionProps {
  photos: PartyMedia[];
  reactions: PhotoReaction[];
  partyId: string;
  currentUserId?: string;
  canUpload: boolean;
  onReact: (mediaId: string, stickerId: string) => void;
  onRemoveReaction: (mediaId: string) => void;
}

function GallerySection({
  photos,
  reactions,
  partyId,
  currentUserId,
  canUpload,
  onReact,
  onRemoveReaction,
}: GallerySectionProps) {
  const { t } = useTranslation();

  const itemSize = (SCREEN_WIDTH - Spacing.lg * 2 - 2) / 2;
  const hasOwnPhoto = photos.some(p => p.uploaderId === currentUserId);
  const showPrompt = !hasOwnPhoto && canUpload;
  const showUpsell = !hasOwnPhoto && !canUpload;

  if (photos.length === 0) {
    return (
      <View style={styles.gallerySection}>
        <SectionHeader title={t('partyRoom.partyMomentsTitle')} accentTitle={t('partyRoom.partyMomentsAccent')} emojiSource={require('@/assets/emojis/fire.png')} />
        {showUpsell && (
          <View style={styles.proBannerWrapper}>
            <ProBanner text={t('partyRoom.unlockPartyPhotos')} />
          </View>
        )}
        {showPrompt && (
          <PhotoPromptCard partyId={partyId} itemSize={itemSize} />
        )}
        {!showPrompt && !showUpsell && (
          <View style={styles.emptyPlaceholder}>
            <Ionicons name="camera-outline" size={32} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyPlaceholderText}>{t('partyRoom.noPhotosYet')}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.gallerySection}>
      <SectionHeader title={t('partyRoom.partyMomentsTitle')} accentTitle={t('partyRoom.partyMomentsAccent')} emojiSource={require('@/assets/emojis/fire.png')} />
      {showUpsell && (
        <View style={styles.proBannerWrapper}>
          <ProBanner text={t('partyRoom.unlockPartyPhotos')} />
        </View>
      )}
      <PhotoGrid
        photos={photos}
        reactions={reactions}
        currentUserId={currentUserId}
        promptElement={showPrompt ? <PhotoPromptCard partyId={partyId} itemSize={itemSize} /> : undefined}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />
    </View>
  );
}

// ============================================
// PARTY ROOM TOOLBAR (floating above tab bar)
// ============================================

interface PartyRoomToolbarProps {
  party: { id: string; code: string; creatorId: string; creatorIsPro: boolean };
  activeParticipantCount: number;
  isCreator: boolean;
  challengeCount: number;
  dispatch: ReturnType<typeof useApp>['dispatch'];
}

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

function PartyRoomToolbar({ party, activeParticipantCount, isCreator, challengeCount, dispatch }: PartyRoomToolbarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isNavigatingRef = useRef(false);
  const maxMembers = party.creatorIsPro ? PRO_PARTY_MEMBER_LIMIT : FREE_PARTY_MEMBER_LIMIT;
  // Only the creator can use the button. In a non-Pro party it stays enabled
  // and opens the paywall; in a Pro party it is disabled at the challenge limit.
  const challengeDisabled = !isCreator || (party.creatorIsPro && challengeCount >= MAX_CHALLENGES_PER_PARTY);

  const handleCopyCode = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(party.code);
    dispatch({ type: 'SHOW_TOAST', payload: t('partyRoom.codeCopied') });
  };

  const handleAddAction = () => {
    if (!isCreator) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!party.creatorIsPro) {
      router.push('/paywall-sheet');
      return;
    }
    if (challengeCount >= MAX_CHALLENGES_PER_PARTY) return;
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push('/party/challenge-type');
    setTimeout(() => { isNavigatingRef.current = false; }, 1000);
  };

  const handleLeaveOrEnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isCreator) {
      Alert.alert(
        t('partyRoom.endPartyTitle'),
        t('partyRoom.endPartyMessage'),
        [
          { text: t('partyRoom.notYet'), style: 'cancel' },
          {
            text: t('partyRoom.endPartyConfirm'),
            style: 'destructive',
            onPress: () => {
              dispatch({ type: 'LEAVE_PARTY' });
              endParty(party.id).catch(() => {});
            },
          },
        ],
      );
    } else {
      Alert.alert(
        t('partyRoom.leavePartyTitle'),
        t('partyRoom.leavePartyMessage'),
        [
          { text: t('partyRoom.stay'), style: 'cancel' },
          {
            text: t('partyRoom.leave'),
            style: 'destructive',
            onPress: () => {
              dispatch({ type: 'LEAVE_PARTY' });
              leaveParty(party.id).catch(() => {});
            },
          },
        ],
      );
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(500).springify()}
      style={[toolbarStyles.container, { bottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}
    >
      <View style={toolbarStyles.pill}>
        <View style={toolbarStyles.solidBg} />
        <View style={toolbarStyles.border} pointerEvents="none" />

        <View style={toolbarStyles.content}>
          {/* Left action button (create challenge / paywall) */}
          <Pressable
            onPress={handleAddAction}
            disabled={challengeDisabled}
            style={({ pressed }) => [
              toolbarStyles.actionButton,
              challengeDisabled && toolbarStyles.actionButtonDisabled,
              pressed && !challengeDisabled && toolbarStyles.actionButtonPressed,
            ]}
          >
            <Ionicons name="add" size={22} color={challengeDisabled ? 'rgba(255,255,255,0.3)' : Colors.text.inverse} />
          </Pressable>

          {/* Center code pill (tappable to copy) */}
          <Pressable
            onPress={handleCopyCode}
            style={({ pressed }) => [toolbarStyles.codePill, pressed && toolbarStyles.codePillPressed]}
          >
            {party.creatorIsPro && <ProBadge size={16} />}
            <Text style={toolbarStyles.codeText}>#{party.code}</Text>
            <Ionicons name="people" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={toolbarStyles.countText}>{activeParticipantCount}/{maxMembers}</Text>
          </Pressable>

          {/* Right leave/end button */}
          <Pressable
            onPress={handleLeaveOrEnd}
            style={({ pressed }) => [toolbarStyles.leaveButton, pressed && toolbarStyles.leaveButtonPressed]}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const toolbarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 50,
  },
  pill: {
    height: 52,
    borderRadius: 28,
    overflow: 'hidden',
  },
  solidBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background.secondary,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    opacity: 0.35,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.93 }],
  },
  codePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
    paddingHorizontal: 14,
  },
  codePillPressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  leaveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.93 }],
  },
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function PartyRoomScreen() {
  const { t } = useTranslation();
  const { partyId: paramPartyId } = useLocalSearchParams<{ partyId: string }>();
  const { state, dispatch } = useApp();
  const party = state.currentParty;
  const partyId = paramPartyId ?? party?.id;

  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();


  const { particles, spawnParticles } = useDrinkParticles();
  const drinkButtonRef = useRef<View>(null);
  const lastParticleTime = useRef(0);
  const pendingDrinkOps = useRef(0);
  const [selectedDrinkType, setSelectedDrinkType] = useState<DrinkType>('beer');

  const partyCode = party?.code ?? 'PARTY';
  const partyName = party?.name ?? 'My Party';
  const currentUserId = state.user?.id;
  const isCreator = party?.creatorId === currentUserId;
  const isPremium = useIsPremium();
  const photosAllowed = party ? canUploadPhotos(party, isPremium) : false;

  // Participants from party state, updated via realtime subscription
  const [participants, setParticipants] = useState<PartyParticipant[]>(party?.participants ?? []);
  const [isDataReady, setIsDataReady] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);

  // Sync participants when party object changes (e.g. initial load or rejoin)
  useEffect(() => {
    if (party?.participants?.length) {
      setParticipants(party.participants);
    }
  }, [party?.participants]);

  // Fetch venue details when the party is linked to a venue
  useEffect(() => {
    if (!party?.venueId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getVenueById(party.venueId!);
        if (!cancelled) setVenue(data);
      } catch (err) {
        console.warn('[PartyRoom] Venue fetch failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [party?.venueId]);

  // Current user's drink total derived from participants
  const myDrinkCounts = participants.find(p => p.userId === currentUserId)?.drinks;
  const myDrinks = myDrinkCounts?.total ?? 0;

  // Separate venue challenges from user challenges based on venue's linked account
  const venueLinkedUserId = venue?.linkedUserId;
  const venueChallenges = useMemo(
    () => venueLinkedUserId
      ? state.partyChallenges.filter(c => c.creatorId === venueLinkedUserId)
      : [],
    [state.partyChallenges, venueLinkedUserId],
  );
  const userChallenges = useMemo(
    () => venueLinkedUserId
      ? state.partyChallenges.filter(c => c.creatorId !== venueLinkedUserId)
      : state.partyChallenges,
    [state.partyChallenges, venueLinkedUserId],
  );

  // A challenge is "active" when it hasn't expired AND the current user hasn't responded.
  // Once expired or responded, it moves to the completed results carousel.
  const isChallengeActive = useCallback(
    (c: { id: string; isExpired: boolean; expiresAt: string }) =>
      !c.isExpired &&
      new Date(c.expiresAt).getTime() > Date.now() &&
      !state.challengeResponses.some(r => r.challengeId === c.id && r.userId === currentUserId),
    [state.challengeResponses, currentUserId],
  );

  const activeChallenges = useMemo(
    () => state.partyChallenges.filter(isChallengeActive),
    [state.partyChallenges, isChallengeActive],
  );
  const completedVenueChallenges = useMemo(
    () => venueChallenges.filter(c => !isChallengeActive(c)),
    [venueChallenges, isChallengeActive],
  );
  const completedUserChallenges = useMemo(
    () => userChallenges.filter(c => !isChallengeActive(c)),
    [userChallenges, isChallengeActive],
  );
  const allCompletedChallenges = useMemo(
    () => [...completedVenueChallenges, ...completedUserChallenges],
    [completedVenueChallenges, completedUserChallenges],
  );

  const handleOpenVenueDetail = useCallback(() => {
    if (!venue) return;
    router.push({ pathname: '/club-detail-sheet', params: { venueId: venue.id } });
  }, [venue]);

  // Load photos, notes, and reactions from Supabase, subscribe to realtime updates.
  // If data was already prefetched (login/restore), skip the network fetch and
  // render immediately with the store data.
  const hasPrefetchedData = state.partyPhotos.length > 0 || state.partyNotes.length > 0;

  useEffect(() => {
    if (!partyId) return;

    if (hasPrefetchedData) {
      // Photos/notes were already loaded by prefetchAppData — render immediately
      setIsDataReady(true);
    } else {
      // No prefetched data (e.g. navigated from join flow) — fetch from network
      const loadData = async () => {
        try {
          const [photos, notes, reactions, challengeReactions, freshParty] = await Promise.all([
            getPartyPhotos(partyId),
            getPartyNotes(partyId),
            getReactionsByParty(partyId),
            getChallengeReactionsByParty(partyId),
            getPartyById(partyId),
          ]);
          dispatch({ type: 'SET_PHOTOS', payload: photos });
          dispatch({ type: 'SET_NOTES', payload: notes });
          dispatch({ type: 'SET_PHOTO_REACTIONS', payload: reactions });
          dispatch({ type: 'SET_CHALLENGE_PHOTO_REACTIONS', payload: challengeReactions });

          if (freshParty) {
            dispatch({ type: 'SET_CURRENT_PARTY', payload: freshParty });
            if (freshParty.participants?.length) {
              setParticipants(freshParty.participants);
            }
          }
        } catch (error) {
          console.warn('[PartyRoom] Failed to load party data:', error);
        } finally {
          setIsDataReady(true);
        }
      };

      loadData();
    }

    // Challenges and offer tickets are not included in the prefetch
    (async () => {
      try {
        const [challenges, challengeResponses, offerTickets] = await Promise.all([
          getChallengesByParty(partyId),
          getResponsesByParty(partyId),
          getOfferTicketsForParty(partyId),
        ]);
        dispatch({ type: 'SET_CHALLENGES', payload: challenges });
        dispatch({ type: 'SET_CHALLENGE_RESPONSES', payload: challengeResponses });
        dispatch({ type: 'SET_OFFER_TICKETS', payload: offerTickets });
      } catch (error) {
        console.warn('[PartyRoom] Failed to load challenges/tickets:', error);
      }
    })();

    const unsubPhotos = subscribeToPhotos(partyId, (photos) => {
      dispatch({ type: 'SET_PHOTOS', payload: photos });
    });
    const unsubNotes = subscribeToNotes(partyId, (notes) => {
      dispatch({ type: 'SET_NOTES', payload: notes });
    });
    const unsubReactions = subscribeToReactions(partyId, (reactions) => {
      dispatch({ type: 'SET_PHOTO_REACTIONS', payload: reactions });
    });
    const unsubChallengeReactions = subscribeToChallengeReactions(partyId, (reactions) => {
      dispatch({ type: 'SET_CHALLENGE_PHOTO_REACTIONS', payload: reactions });
    });
    const unsubChallenges = subscribeToChallenges(partyId, (challenges) => {
      dispatch({ type: 'SET_CHALLENGES', payload: challenges });
    });
    const unsubChallengeResponses = subscribeToChallengeResponses(partyId, (responses) => {
      dispatch({ type: 'SET_CHALLENGE_RESPONSES', payload: responses });
    });
    const unsubOfferTickets = subscribeToOfferTickets(partyId, currentUserId ?? '', (tickets) => {
      dispatch({ type: 'SET_OFFER_TICKETS', payload: tickets });
    });
    const unsubParty = subscribeToParty(partyId, {
      onParticipantChange: (updated) => {
        setParticipants((prev) => {
          if (pendingDrinkOps.current === 0) return updated;
          const localUser = prev.find((p) => p.userId === currentUserId);
          if (!localUser) return updated;
          return updated.map((u) =>
            u.userId === currentUserId ? { ...u, drinks: localUser.drinks } : u,
          );
        });
      },
      onPartyUpdate: (update) => {
        if (update.status === 'ended') {
          dispatch({ type: 'LEAVE_PARTY' });
        }
      },
    });

    return () => {
      unsubPhotos();
      unsubNotes();
      unsubReactions();
      unsubChallengeReactions();
      unsubChallenges();
      unsubChallengeResponses();
      unsubOfferTickets();
      unsubParty();
    };
  }, [partyId, dispatch, currentUserId]);

  // Re-validate and refresh all data when the app returns from background.
  // Realtime subscriptions may disconnect while backgrounded, so any missed
  // events (challenge expiry, new photos, etc.) are recovered here.
  const { justBecameActive } = useAppState();

  useEffect(() => {
    if (!justBecameActive || !partyId) return;

    (async () => {
      try {
        const activeParty = await getActiveParty();
        if (!activeParty) {
          dispatch({ type: 'LEAVE_PARTY' });
          return;
        }

        const [photos, notes, reactions, challengeReactions, challenges, challengeResponses, offerTickets] = await Promise.all([
          getPartyPhotos(partyId),
          getPartyNotes(partyId),
          getReactionsByParty(partyId),
          getChallengeReactionsByParty(partyId),
          getChallengesByParty(partyId),
          getResponsesByParty(partyId),
          getOfferTicketsForParty(partyId),
        ]);

        dispatch({ type: 'SET_PHOTOS', payload: photos });
        dispatch({ type: 'SET_NOTES', payload: notes });
        dispatch({ type: 'SET_PHOTO_REACTIONS', payload: reactions });
        dispatch({ type: 'SET_CHALLENGE_PHOTO_REACTIONS', payload: challengeReactions });
        dispatch({ type: 'SET_CHALLENGES', payload: challenges });
        dispatch({ type: 'SET_CHALLENGE_RESPONSES', payload: challengeResponses });
        dispatch({ type: 'SET_OFFER_TICKETS', payload: offerTickets });
      } catch (err) {
        console.warn('[PartyRoom] Failed to refresh data after foreground:', err);
      }
    })();
  }, [justBecameActive, partyId, dispatch]);

  // Tick every second while there are active challenges or unexpired tickets
  // so the filter re-evaluates and cards disappear the instant they expire.
  const hasActiveChallenges = state.partyChallenges.some(
    (c) => !c.isExpired && new Date(c.expiresAt).getTime() > Date.now(),
  );
  const hasActiveTickets = state.offerTickets.some(
    (t) => !t.isRedeemed && new Date(t.offer.expiresAt).getTime() > Date.now(),
  );
  useTick(hasActiveChallenges || hasActiveTickets);

  const activeTickets = useMemo(
    () => state.offerTickets.filter(
      (t) => !t.isRedeemed && new Date(t.offer.expiresAt).getTime() > Date.now(),
    ),
    [state.offerTickets],
  );
  const redeemedTickets = useMemo(
    () => state.offerTickets.filter((t) => t.isRedeemed),
    [state.offerTickets],
  );

  // Scroll animations
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const heroOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 120], [1, 0], 'clamp'),
  }));

  // GIF background follows scroll downward but stays pinned at top on overscroll
  const gifScrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(0, -scrollY.value) }],
  }));

  // Optimistic local update for drink counts
  const applyDrinkDelta = useCallback((drinkType: DrinkType, delta: number) => {
    if (!currentUserId) return;
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.userId !== currentUserId) return p;
        const drinks = { ...p.drinks };
        drinks[drinkType] = Math.max(0, (drinks[drinkType] ?? 0) + delta);
        drinks.total = Math.max(0, (drinks.total ?? 0) + delta);
        return { ...p, drinks };
      }),
    );
  }, [currentUserId]);

  // Reconcile local state with authoritative server value
  const reconcileMyDrinks = useCallback((serverDrinks: DrinkCount) => {
    if (!currentUserId) return;
    setParticipants((prev) =>
      prev.map((p) =>
        p.userId === currentUserId ? { ...p, drinks: serverDrinks } : p,
      ),
    );
  }, [currentUserId]);

  const handleAddDrink = () => {
    if (!partyId || party?.status === 'ended' || myDrinks >= MAX_DRINKS_PER_USER) return;

    // Spawn particles (debounced at 300ms)
    const now = Date.now();
    if (now - lastParticleTime.current > 300) {
      lastParticleTime.current = now;
      drinkButtonRef.current?.measure((_x, _y, width, _h, pageX, pageY) => {
        spawnParticles(pageX + width / 2, pageY, 12);
      });
    }

    const drinkType = selectedDrinkType;
    pendingDrinkOps.current++;
    applyDrinkDelta(drinkType, 1);
    addDrink(partyId, drinkType)
      .then((serverDrinks) => {
        pendingDrinkOps.current--;
        if (pendingDrinkOps.current === 0) reconcileMyDrinks(serverDrinks);
      })
      .catch((err) => {
        pendingDrinkOps.current--;
        console.warn('[PartyRoom] Failed to add drink:', err);
        applyDrinkDelta(drinkType, -1);
      });
  };

  const handleRemoveDrink = () => {
    if (!partyId || myDrinks <= 0 || party?.status === 'ended') return;
    // Remove the selected drink; if the user has none of that type, remove
    // one of a type they do have so the total can still go down.
    const drinkType: DrinkType = (myDrinkCounts?.[selectedDrinkType] ?? 0) > 0
      ? selectedDrinkType
      : DRINK_TYPE_OPTIONS.map((o) => o.type).find((type) => (myDrinkCounts?.[type] ?? 0) > 0) ?? selectedDrinkType;
    pendingDrinkOps.current++;
    applyDrinkDelta(drinkType, -1);
    removeDrink(partyId, drinkType)
      .then((serverDrinks) => {
        pendingDrinkOps.current--;
        if (pendingDrinkOps.current === 0) reconcileMyDrinks(serverDrinks);
      })
      .catch((err) => {
        pendingDrinkOps.current--;
        console.warn('[PartyRoom] Failed to remove drink:', err);
        applyDrinkDelta(drinkType, 1);
      });
  };

  // Optimistic reaction upsert with server sync
  const handleReact = useCallback(async (mediaId: string, stickerId: string) => {
    if (!currentUserId) return;
    dispatch({
      type: 'UPSERT_PHOTO_REACTION',
      payload: { id: `temp-${Date.now()}`, mediaId, userId: currentUserId, stickerId, createdAt: new Date().toISOString() },
    });
    try {
      await upsertReaction(mediaId, stickerId);
    } catch (err) {
      console.warn('[PartyRoom] Failed to upsert reaction:', err);
      dispatch({ type: 'REMOVE_PHOTO_REACTION', payload: { mediaId, userId: currentUserId } });
    }
  }, [currentUserId, dispatch]);

  const handleRemoveReaction = useCallback(async (mediaId: string) => {
    if (!currentUserId) return;
    dispatch({ type: 'REMOVE_PHOTO_REACTION', payload: { mediaId, userId: currentUserId } });
    try {
      await removeReaction(mediaId);
    } catch (err) {
      console.warn('[PartyRoom] Failed to remove reaction:', err);
    }
  }, [currentUserId, dispatch]);

  const handleRedeemTicket = useCallback(async (ticketId: string) => {
    dispatch({ type: 'REDEEM_OFFER_TICKET', payload: ticketId });
    try {
      await redeemOfferTicket(ticketId);
    } catch (error) {
      console.warn('[PartyRoom] Failed to redeem ticket:', error);
      const tickets = await getOfferTicketsForParty(partyId ?? '');
      dispatch({ type: 'SET_OFFER_TICKETS', payload: tickets });
    }
  }, [partyId, dispatch]);

  // Carousel render callbacks
  const renderActiveChallenge = useCallback(
    (challenge: PartyChallenge) => {
      const isFromVenue = venueLinkedUserId != null && challenge.creatorId === venueLinkedUserId;
      const source: ChallengeSource = isFromVenue
        ? { type: 'venue', name: venue?.name ?? '', isVerified: venue?.isVerified ?? false }
        : { type: 'party' };
      return (
        <ChallengeCard
          challenge={challenge}
          source={source}
          width={CAROUSEL_CARD_WIDTH}
          onPress={() => router.push({ pathname: '/party/challenge-reveal', params: { challengeId: challenge.id } })}
        />
      );
    },
    [venueLinkedUserId, venue],
  );

  const renderCompletedChallenge = useCallback(
    (challenge: PartyChallenge) => {
      const isFromVenue = venueLinkedUserId != null && challenge.creatorId === venueLinkedUserId;
      const source: ChallengeSource = isFromVenue
        ? { type: 'venue', name: venue?.name ?? '', isVerified: venue?.isVerified ?? false }
        : { type: 'party' };
      return (
        <ChallengeHeaderCard
          orderNumber={challenge.orderNumber}
          question={challenge.question}
          type={challenge.type}
          expiresAt={challenge.expiresAt}
          source={source}
          width={CAROUSEL_CARD_WIDTH}
          onPress={() => router.push({
            pathname: '/challenge-results-sheet',
            params: {
              challengeId: challenge.id,
              partyId: challenge.partyId,
              orderNumber: String(challenge.orderNumber),
              question: challenge.question,
              type: challenge.type,
              sourceType: source.type,
              sourceName: source.type === 'venue' ? source.name : '',
              sourceVerified: source.type === 'venue' ? String(source.isVerified) : '',
            },
          })}
        />
      );
    },
    [venueLinkedUserId, venue],
  );

  const challengeKeyExtractor = useCallback((c: PartyChallenge) => c.id, []);

  const ticketKeyExtractor = useCallback((ticket: OfferTicket) => ticket.id, []);

  const renderActiveTicket = useCallback(
    (ticket: OfferTicket) => (
      <TearTicket
        title={ticket.offer.title}
        subtitle={ticket.offer.description ?? ticket.offer.offerType.toUpperCase()}
        code={`#${ticket.id.slice(0, 8).toUpperCase()}`}
        offerType={ticket.offer.offerType}
        expiresAt={ticket.offer.expiresAt}
        swipeHintLabel={t('partyRoom.swipeToRedeem')}
        onTear={() => handleRedeemTicket(ticket.id)}
      />
    ),
    [t, handleRedeemTicket],
  );

  const renderRedeemedTicket = useCallback(
    (ticket: OfferTicket) => (
      <TearTicket
        title={ticket.offer.title}
        subtitle={ticket.offer.description ?? ticket.offer.offerType.toUpperCase()}
        code={`#${ticket.id.slice(0, 8).toUpperCase()}`}
        offerType={ticket.offer.offerType}
        isRedeemed
        disabled
        redeemedLabel={t('partyRoom.ticketRedeemed')}
      />
    ),
    [t],
  );

  const gifSource = useMemo(() => getRandomPartyGif(), []);

  if (!isDataReady || !party) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={Colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* GIF background (absolute layer, scrolls with content via translateY) */}
      <Animated.View style={[styles.heroGifBackground, gifScrollStyle]} pointerEvents="none">
        <Image source={gifSource} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(10,10,11,0.6)', 'rgba(10,10,11,0.96)', '#0A0A0B']}
          locations={[0, 0.5, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="never"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {/* Hero Section */}
          <Animated.View style={[styles.heroSection, heroOpacity]}>
            <Animated.View
              entering={FadeInUp.delay(300).springify()}
              style={styles.heroContent}
            >
              <View style={styles.heroNameWrapper}>
                <Text style={styles.partyName} numberOfLines={2}>
                  {partyName}
                </Text>
              </View>
              <View style={styles.heroCodeRow}>
                {party?.creatorIsPro ? (
                  <ProBadge size={20} />
                ) : null}
                <Text style={styles.partyCodeHero}>#{partyCode}</Text>
              </View>
            </Animated.View>
          </Animated.View>

          {/* Active offer tickets (above everything) */}
          {activeTickets.length > 0 && (
            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.activeTicketsSection}>
              <ChallengeCarousel
                items={activeTickets}
                keyExtractor={ticketKeyExtractor}
                renderItem={renderActiveTicket}
              />
            </Animated.View>
          )}

          {/* Active challenges carousel (all active: venue + user) */}
          {activeChallenges.length > 0 && (
            <Animated.View entering={FadeInUp.delay(250).springify()}>
              <ChallengeCarousel
                items={activeChallenges}
                keyExtractor={challengeKeyExtractor}
                renderItem={renderActiveChallenge}
              />
            </Animated.View>
          )}

          {/* Venue section: card + completed venue challenges + offers */}
          {venue && (
            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.venueCardWrapper}>
              <VenueHeroCard venue={venue} onPress={handleOpenVenueDetail} height={120} />
            </Animated.View>
          )}

          {/* Party Drinks header + carousel */}
          <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.drinksSectionHeader}>
            <SectionHeader title={t('partyRoom.partyDrinksTitle')} accentTitle={t('partyRoom.partyDrinksAccent')} emojiSource={require('@/assets/emojis/beer.png')} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <PeopleCarousel participants={participants} currentUserId={currentUserId} />
          </Animated.View>

          {/* Drink Counter */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <DrinkCounter count={myDrinks} maxReached={myDrinks >= MAX_DRINKS_PER_USER} selectedType={selectedDrinkType} onSelectType={setSelectedDrinkType} onAdd={handleAddDrink} onRemove={handleRemoveDrink} buttonRef={drinkButtonRef} />
          </Animated.View>

          {/* Gallery (Moments) */}
          <Animated.View entering={FadeInUp.delay(600).springify()}>
            <GallerySection
              photos={state.partyPhotos}
              reactions={state.photoReactions}
              partyId={partyId ?? ''}
              currentUserId={currentUserId}
              canUpload={photosAllowed}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
            />
          </Animated.View>

          {/* Notes section */}
          <Animated.View entering={FadeInUp.delay(650).springify()}>
            <NotesSection notes={state.partyNotes} partyId={partyId ?? ''} currentUserId={currentUserId} />
          </Animated.View>

          {/* All completed challenges (venue + party) */}
          {allCompletedChallenges.length > 0 && (
            <Animated.View entering={FadeInUp.delay(680).springify()}>
              <View style={styles.challengeSectionHeader}>
                <SectionHeader
                  title={t('partyRoom.partyChallengesTitle')}
                  accentTitle={t('partyRoom.partyChallengesAccent')}
                  emojiSource={require('@/assets/emojis/poop.png')}
                />
              </View>
              <ChallengeCarousel
                items={allCompletedChallenges}
                keyExtractor={challengeKeyExtractor}
                renderItem={renderCompletedChallenge}
              />
            </Animated.View>
          )}

          {/* Redeemed offer tickets */}
          {redeemedTickets.length > 0 && (
            <Animated.View entering={FadeInUp.delay(700).springify()} style={styles.redeemedTicketsWrapper}>
              <View style={styles.ticketsSectionHeader}>
                <SectionHeader
                  title={t('partyRoom.partyTicketsTitle')}
                  accentTitle={t('partyRoom.partyTicketsAccent')}
                  emojiSource={require('@/assets/emojis/tada.png')}
                />
              </View>
              <ChallengeCarousel
                items={redeemedTickets}
                keyExtractor={ticketKeyExtractor}
                renderItem={renderRedeemedTicket}
              />
            </Animated.View>
          )}

          {/* Party creator attribution */}
          {(() => {
            const creator = participants.find(p => p.userId === party.creatorId);
            return (
              <View style={styles.creatorFooter}>
                <Text style={styles.creatorFooterText}>
                  {t('partyRoom.createdBy')}{' '}
                </Text>
                {creator?.avatarUrl ? (
                  <AvatarImage uri={creator.avatarUrl} style={styles.creatorAvatar} />
                ) : (
                  <View style={styles.creatorAvatarFallback}>
                    <Ionicons name="person" size={10} color="#FFFFFF" />
                  </View>
                )}
                <Text style={styles.creatorFooterUsername}>
                  @{creator?.username ?? creator?.displayName ?? 'unknown'}
                </Text>
              </View>
            );
          })()}
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Particle overlays (drinks) */}
      <View style={styles.particlesContainer} pointerEvents="none">
        <DrinkParticlesOverlay particles={particles} />
      </View>

      {/* Periodic falling confetti */}
      <FallingConfetti />

      <Toast />

      {/* Floating toolbar above tab bar */}
      <PartyRoomToolbar
        party={party}
        activeParticipantCount={participants.filter(p => p.isActive).length}
        isCreator={isCreator}
        challengeCount={userChallenges.length}
        dispatch={dispatch}
      />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 200, gap: Spacing.md },

  // Hero GIF background
  heroGifBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 430,
    overflow: 'hidden',
  },

  // Hero
  heroSection: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['xl'],
    minHeight: 300,
    overflow: 'visible' as any,
  },
  heroContent: {
    alignItems: 'center',
    gap: 0,
  },
  heroNameWrapper: {
    alignSelf: 'center',
    position: 'relative',
  },
  partyName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : 'sans-serif',
    letterSpacing: -0.5,
    lineHeight: 44,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
    paddingBottom: 2,
  },
  partyCodeHero: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary.main,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : 'sans-serif',
  },
  heroCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  // Drinks section header
  drinksSectionHeader: { paddingHorizontal: Spacing.lg },

  // Drink counter
  drinkWrapper: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  drinkContainer: {
    borderRadius: 18,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  drinkPattern: { ...StyleSheet.absoluteFillObject },
  drinkPatternIcon: { position: 'absolute' },
  drinkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  drinkBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drinkBtnGlass: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  drinkBtnDisabled: { opacity: 0.35 },
  drinkStickerLeft: {
    position: 'absolute',
    left: -14,
    bottom: -18,
    opacity: 0.75,
    zIndex: 0,
  },
  drinkStickerRight: {
    position: 'absolute',
    right: -10,
    bottom: -14,
    opacity: 0.75,
    zIndex: 0,
  },
  drinkCountDisplay: { alignItems: 'center', minWidth: 80 },
  drinkTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  drinkTypeChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  drinkTypeChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: '#fff',
  },
  drinkTypeIcon: { width: 24, height: 24 },
  drinkTypeLabel: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  drinkLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  drinkNumberBox: { height: 44, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  drinkNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : 'System',
  },

  // Prompt cards (photo / note upload prompts)
  promptCard: { borderRadius: 16, overflow: 'hidden' },
  promptCardPressable: { flex: 1 },
  promptPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  promptPreviewGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  promptCameraIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    zIndex: 5,
  },
  promptCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    zIndex: 11,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  promptCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  promptCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
    textAlign: 'center',
  },

  // Gallery
  gallerySection: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  proBannerWrapper: { marginBottom: Spacing.md },

  // Empty state placeholder
  emptyPlaceholder: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '500',
  },

  // Venue card in party
  venueCardWrapper: { paddingHorizontal: Spacing.lg },

  // Offer tickets
  activeTicketsSection: {
    position: 'relative',
    zIndex: 2,
  },
  redeemedTicketsWrapper: {
    position: 'relative',
    zIndex: 10,
    overflow: 'visible',
  },
  ticketsSectionHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // Challenge results
  challengeSectionHeader: {
    paddingHorizontal: Spacing.lg,
  },
  // Creator footer
  creatorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
  creatorFooterText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
  creatorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 4,
  },
  creatorAvatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  creatorFooterUsername: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold as '600',
    color: '#FFFFFF',
  },

  // Drink particles overlay
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
    zIndex: 1000,
  },
});
