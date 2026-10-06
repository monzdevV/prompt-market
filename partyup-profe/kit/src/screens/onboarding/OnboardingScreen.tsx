/**
 * PARTYUP Onboarding Screen
 * ===========================
 * Dark onboarding with full-bleed video backgrounds fading via gradient,
 * stacked/rotated boarding cards, and animated Apple-style permission slides.
 * Shown before login when the user is not authenticated.
 */

import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path as SvgPath } from "react-native-svg";

import { ContinuousFireEmitter } from "@/src/components/ui/FireParticles";
import {
  getLocationPermissionStatus,
  requestLocationPermission,
} from "@/src/services/locationService";
import {
  getNotificationPermissionStatus,
  registerForPushNotifications,
} from "@/src/services/notificationService";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ROUNDED = Platform.OS === "ios" ? "ui-rounded" : "sans-serif";
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const AnimatedSvgPath = Animated.createAnimatedComponent(SvgPath);
const BUTTON_WIDTH = SCREEN_WIDTH - 48;

// ============================================
// CARD IMAGES
// ============================================

const CARD_IMAGES = {
  party: require("@/assets/boarding/card_party.png"),
  drinks: require("@/assets/boarding/card_drinks.png"),
  game: require("@/assets/boarding/card_game.png"),
};

// ============================================
// SLIDE DATA
// ============================================

interface CardConfig {
  image: any;
  rotation: number;
  translateX: number;
  translateY: number;
  scale: number;
  zIndex: number;
}

interface OnboardingSlide {
  backgroundImage: any;
  cards: CardConfig[];
  titleKey: string;
  subtitleKey: string;
  buttonLabelKey: string;
  showVideo?: boolean;
  videoSource?: any;
  isNotificationSlide?: boolean;
  isLocationSlide?: boolean;
  isChallengesSlide?: boolean;
}

const SLIDES: OnboardingSlide[] = [
  {
    backgroundImage: require("@/assets/onboarding/fondo-1.jpg"),
    cards: [],
    titleKey: "onboarding.slide1Title",
    subtitleKey: "onboarding.slide1Subtitle",
    buttonLabelKey: "onboarding.continue",
    showVideo: true,
    videoSource: require("@/assets/boarding/party_video.mp4"),
  },
  {
    backgroundImage: require("@/assets/onboarding/fondo-2.jpg"),
    cards: [],
    titleKey: "onboarding.slide2Title",
    subtitleKey: "onboarding.slide2Subtitle",
    buttonLabelKey: "onboarding.continue",
    showVideo: true,
    videoSource: require("@/assets/boarding/drink_video.mp4"),
  },
  {
    backgroundImage: require("@/assets/onboarding/fondo-3.jpg"),
    cards: [
      { image: CARD_IMAGES.game, rotation: -6, translateX: 0, translateY: 0, scale: 1, zIndex: 1 },
    ],
    titleKey: "onboarding.slide3Title",
    subtitleKey: "onboarding.slide3Subtitle",
    buttonLabelKey: "onboarding.continue",
    showVideo: true,
    videoSource: require("@/assets/games_preview/board_game.mp4"),
  },
  {
    backgroundImage: null,
    cards: [],
    titleKey: "onboarding.offersTitle",
    subtitleKey: "onboarding.offersSubtitle",
    buttonLabelKey: "onboarding.continue",
    showVideo: true,
    videoSource: require("@/assets/boarding/ticket.mp4"),
  },
  {
    backgroundImage: null,
    cards: [],
    titleKey: "onboarding.challengesTitle",
    subtitleKey: "onboarding.challengesSubtitle",
    buttonLabelKey: "onboarding.continue",
    isChallengesSlide: true,
  },
  {
    backgroundImage: null,
    cards: [],
    titleKey: "onboarding.notificationsTitle",
    subtitleKey: "onboarding.notificationsSubtitle",
    buttonLabelKey: "onboarding.enableNotifications",
    isNotificationSlide: true,
  },
  {
    backgroundImage: null,
    cards: [],
    titleKey: "onboarding.locationTitle",
    subtitleKey: "onboarding.locationSubtitle",
    buttonLabelKey: "onboarding.enableLocation",
    isLocationSlide: true,
  },
];

const TOTAL_PAGES = SLIDES.length;

// Card dimensions
const CARD_W = SCREEN_WIDTH * 0.3;
const CARD_H = CARD_W * 1.50;

// ============================================
// FLOATING STICKER
// ============================================

interface FloatingStickerProps {
  source: any;
  size: number;
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
  baseRotate: number;
  phase?: number;
}

function FloatingSticker({
  source, size, top, bottom, left, right, baseRotate, phase = 0,
}: FloatingStickerProps) {
  const floatY   = useSharedValue(0);
  const floatRot = useSharedValue(0);

  useEffect(() => {
    floatY.value = withDelay(
      Math.round(phase * 600),
      withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    floatRot.value = withDelay(
      Math.round(phase * 800),
      withRepeat(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatY.value, [0, 1], [-7, 7]) },
      { rotate: `${interpolate(floatRot.value, [0, 1], [baseRotate - 6, baseRotate + 6])}deg` },
    ],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(Math.round(phase * 300)).duration(700)}
      style={[
        styles.floatingSticker,
        { width: size, height: size, top: top as any, bottom: bottom as any,
          left: left as any, right: right as any },
      ]}
    >
      <Animated.View style={animStyle}>
        <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

// ============================================
// CHALLENGES PREVIEW HERO
// ============================================

function ChallengeCard({
  emoji,
  text,
  completed,
  delay,
  rotation,
  completionProgress,
}: {
  emoji: any;
  text: string;
  completed: boolean;
  delay: number;
  rotation: number;
  completionProgress?: SharedValue<number>;
}) {
  const greenOverlayStyle = useAnimatedStyle(() => {
    if (!completionProgress) return { opacity: 0 };
    return { opacity: completionProgress.value };
  });

  const checkFilledStyle = useAnimatedStyle(() => {
    if (!completionProgress) return { opacity: 0, transform: [{ scale: 0 }] };
    return {
      opacity: completionProgress.value,
      transform: [{ scale: interpolate(completionProgress.value, [0, 1], [0.3, 1]) }],
    };
  });

  const checkEmptyStyle = useAnimatedStyle(() => {
    if (!completionProgress) return {};
    return {
      opacity: 1 - completionProgress.value,
    };
  });

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500).springify().damping(16)}
      style={[styles.challengeCard, { transform: [{ rotate: `${rotation}deg` }] }]}
    >
      <BlurView style={StyleSheet.absoluteFillObject} intensity={28} tint="dark" />
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.challengeCardGradient}
      />
      {completed && (
        <View style={[StyleSheet.absoluteFillObject, { borderRadius: 16, overflow: "hidden" }]}>
          <LinearGradient
            colors={["rgba(191,255,0,0.22)", "rgba(191,255,0,0.07)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
          />
        </View>
      )}
      {completionProgress && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { borderRadius: 16, overflow: "hidden" }, greenOverlayStyle]}>
          <LinearGradient
            colors={["rgba(191,255,0,0.30)", "rgba(191,255,0,0.10)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
          />
        </Animated.View>
      )}
      <View style={styles.challengeCardBorder} />
      <View style={styles.challengeCardContent}>
        <Image source={emoji} style={styles.challengeCardEmoji} contentFit="contain" />
        <View style={styles.challengeCardTextWrap}>
          <Text style={styles.challengeCardText} numberOfLines={2}>{text}</Text>
        </View>
        {completed ? (
          <View style={styles.challengeCheckComplete}>
            <Ionicons name="checkmark" size={14} color="#0A0A0B" />
          </View>
        ) : completionProgress ? (
          <View style={{ width: 24, height: 24 }}>
            <Animated.View style={[styles.challengeCheckEmpty, { position: "absolute", top: 0, left: 0 }, checkEmptyStyle]} />
            <Animated.View style={[styles.challengeCheckComplete, { position: "absolute", top: 0, left: 0 }, checkFilledStyle]}>
              <Ionicons name="checkmark" size={14} color="#0A0A0B" />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.challengeCheckEmpty} />
        )}
      </View>
    </Animated.View>
  );
}

function ChallengesPreviewHero() {
  const floatY = useSharedValue(0);
  const drawProgress = useSharedValue(0);
  const completionProgress = useSharedValue(0);

  const STAR_PATH_LENGTH = 3500;

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    drawProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.cubic) }),
        withDelay(1200, withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.cubic) })),
        withTiming(0, { duration: 800 }),
      ),
      -1,
      false,
    );

    completionProgress.value = withDelay(
      1800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
          withDelay(1800, withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })),
          withTiming(0, { duration: 1200 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatY.value, [0, 1], [-5, 5]) }],
  }));

  const starPathProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(drawProgress.value, [0, 1], [STAR_PATH_LENGTH, 0]),
  }));

  return (
    <View style={styles.heroContainer}>
      <View style={styles.svgStarContainer} pointerEvents="none">
        <Svg width={SCREEN_WIDTH * 0.55} height={SCREEN_WIDTH * 0.55} viewBox="0 0 787 773">
          <AnimatedSvgPath
            animatedProps={starPathProps}
            d="M411.947 235.123L319.582 11.4505L308.036 272.789L20.1895 242.513L246.51 386.854L21.4846 617.752L313.606 483.237L383.057 765.776L449.393 449.86L771.161 492.004L489.756 327.062L645.16 119.548L411.947 235.123Z"
            stroke="#BFFF00"
            strokeWidth={60}
            fill="none"
            strokeDasharray={STAR_PATH_LENGTH}
          />
        </Svg>
      </View>

      <FloatingSticker
        source={require("@/assets/emojis/fire.png")}
        size={44}
        top="10%"
        right="10%"
        baseRotate={20}
        phase={0}
      />
      <FloatingSticker
        source={require("@/assets/emojis/tada.png")}
        size={40}
        bottom="22%"
        left="8%"
        baseRotate={-18}
        phase={0.55}
      />

      <Animated.View style={[styles.challengeCardsStack, floatStyle]}>
        <ChallengeCard
          emoji={require("@/assets/emojis/fire.png")}
          text="Sube una foto haciendo un brindis"
          completed={true}
          delay={200}
          rotation={-3}
        />
        <ChallengeCard
          emoji={require("@/assets/emojis/game_dice.png")}
          text="Graba una nota de voz cantando"
          completed={false}
          delay={400}
          rotation={2}
          completionProgress={completionProgress}
        />
      </Animated.View>
    </View>
  );
}

// ============================================
// NOTIFICATION INVITE CARD HERO
// ============================================

function NotificationInviteHero() {
  const floatY = useSharedValue(0);
  const drawProgress = useSharedValue(0);

  const ZIGZAG_PATH_LENGTH = 18000;

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    drawProgress.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.cubic) }),
          withDelay(1000, withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.cubic) })),
          withTiming(0, { duration: 700 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatY.value, [0, 1], [-6, 6]) }],
  }));

  const zigzagPathProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(drawProgress.value, [0, 1], [ZIGZAG_PATH_LENGTH, 0]),
  }));

  return (
    <View style={styles.heroContainer}>
      <View style={styles.svgStarContainer} pointerEvents="none">
        <Svg width={SCREEN_WIDTH * 0.65} height={SCREEN_WIDTH * 0.70} viewBox="0 0 2266 2454">
          <AnimatedSvgPath
            animatedProps={zigzagPathProps}
            d="M1325.35 70.7931L560.432 777.056L1325.35 375.064L591.473 1052.45L1802.05 321.761L61.5698 1767.6L2205.57 435.029L560.432 1727.62L1802.05 1105.76L793.235 1969.71L1728.88 1434.46L1125.81 2402.79"
            stroke="#BFFF00"
            strokeWidth={192}
            fill="none"
            strokeDasharray={ZIGZAG_PATH_LENGTH}
          />
        </Svg>
      </View>

      <FloatingSticker
        source={require("@/assets/emojis/partying_face.png")}
        size={46}
        top="10%"
        right="9%"
        baseRotate={18}
        phase={0}
      />
      <FloatingSticker
        source={require("@/assets/emojis/champagne.png")}
        size={42}
        bottom="20%"
        left="8%"
        baseRotate={-16}
        phase={0.6}
      />

      <Animated.View
        entering={FadeInUp.delay(150).duration(600).springify().damping(14)}
        style={floatStyle}
      >
        <View style={styles.inviteCard}>
          <BlurView style={StyleSheet.absoluteFillObject} intensity={28} tint="dark" />
          <LinearGradient
            colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inviteCardGradient}
          />
          <View style={styles.inviteCardBorder} />

          <View style={styles.inviteCardHeader}>
            <View style={styles.inviteAppIcon}>
              <Image
                source={require("@/assets/emojis/partying_face.png")}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            </View>
            <Text style={styles.inviteAppName}>PARTYUP</Text>
            <Text style={styles.inviteTime}>ahora</Text>
          </View>

          <View style={styles.inviteCardBody}>
            <Text style={styles.inviteTitle}>Te han invitado a una fiesta</Text>
            <Text style={styles.inviteSubtext}>
              Laura te ha invitado a "Fiesta en la terraza". ¡Únete ahora!
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================
// CLUB LIST PREVIEW HERO
// ============================================

const PLACEHOLDER_CLUBS = [
  {
    name: "Opium Barcelona",
    address: "Pg. Marítim, 34",
    gif: require("@/assets/gifs/Dance Party Sticker.gif"),
    distance: "350m",
  },
  {
    name: "Pacha Madrid",
    address: "C/ Barceló, 11",
    gif: require("@/assets/gifs/Disco Ball Nightly Sticker by nightlyofficial.gif"),
    distance: "1.2km",
  },
  {
    name: "Amnesia Ibiza",
    address: "Ctra. Ibiza, km 5",
    gif: require("@/assets/gifs/Dance Party Sticker by Fuzzy Wobble.gif"),
    distance: "2.8km",
  },
];

function ClubCardRow({
  club,
  delay,
}: {
  club: (typeof PLACEHOLDER_CLUBS)[number];
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500).springify().damping(16)}
      style={styles.clubCard}
    >
      <BlurView style={StyleSheet.absoluteFillObject} intensity={28} tint="dark" />
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.clubCardGradient}
      />
      <View style={styles.clubCardBorder} />

      <View style={styles.clubCardThumb}>
        <Image source={club.gif} style={styles.clubCardThumbImg} contentFit="cover" />
      </View>

      <View style={styles.clubCardInfo}>
        <Text style={styles.clubCardName} numberOfLines={1}>{club.name}</Text>
        <Text style={styles.clubCardAddress} numberOfLines={1}>{club.address}</Text>
      </View>

      <View style={styles.clubCardBadge}>
        <Ionicons name="location" size={12} color="#34D399" />
        <Text style={styles.clubCardDist}>{club.distance}</Text>
      </View>
    </Animated.View>
  );
}

function ClubListPreviewHero() {
  const floatY = useSharedValue(0);
  const drawProgress = useSharedValue(0);

  const CURVED_PATH_LENGTH = 14000;

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    drawProgress.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.cubic) }),
          withDelay(1100, withTiming(0, { duration: 2100, easing: Easing.inOut(Easing.cubic) })),
          withTiming(0, { duration: 750 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatY.value, [0, 1], [-5, 5]) }],
  }));

  const curvedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(drawProgress.value, [0, 1], [CURVED_PATH_LENGTH, 0]),
  }));

  return (
    <View style={styles.heroContainer}>
      <View style={styles.svgStarContainer} pointerEvents="none">
        <Svg width={SCREEN_WIDTH * 0.60} height={SCREEN_WIDTH * 0.74} viewBox="0 0 1954 2408">
          <AnimatedSvgPath
            animatedProps={curvedPathProps}
            d="M137.917 439.589L1018.12 130.378C1026.41 127.465 1032.65 138.118 1026.06 143.929L129.205 933.989C121.889 940.434 130.276 951.879 138.625 946.843L1496.94 127.53C1504.99 122.677 1513.36 133.267 1506.79 139.979L517.247 1149.97C511 1156.34 518.306 1166.61 526.377 1162.8L1282.53 805.756C1289.91 802.269 1297.16 810.784 1292.54 817.516L923.575 1355.18C919.449 1361.19 924.861 1369.14 931.967 1367.5L1408.48 1257.7C1414.01 1256.43 1419.07 1261.15 1418.18 1266.76L1338.66 1765.27C1337.96 1769.61 1340.9 1773.69 1345.23 1774.42L1771.29 1846.16C1774.79 1846.75 1777.49 1849.59 1777.9 1853.12L1828.01 2282.11"
            stroke="#BFFF00"
            strokeWidth={250}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CURVED_PATH_LENGTH}
          />
        </Svg>
      </View>

      <FloatingSticker
        source={require("@/assets/emojis/cocktail.png")}
        size={44}
        top="9%"
        right="9%"
        baseRotate={22}
        phase={0}
      />
      <FloatingSticker
        source={require("@/assets/emojis/admission_tickets.png")}
        size={40}
        bottom="20%"
        left="7%"
        baseRotate={-18}
        phase={0.5}
      />

      <Animated.View style={[styles.clubCardsStack, floatStyle]}>
        {PLACEHOLDER_CLUBS.map((club, i) => (
          <ClubCardRow key={i} club={club} delay={150 + i * 180} />
        ))}
      </Animated.View>
    </View>
  );
}

// ============================================
// ANIMATED CARD
// ============================================

function AnimatedCard({
  card,
  slideIndex,
  scrollX,
}: {
  card: CardConfig;
  cardIndex: number;
  slideIndex: number;
  scrollX: SharedValue<number>;
}) {
  const inputRange = [
    (slideIndex - 1) * SCREEN_WIDTH,
    slideIndex * SCREEN_WIDTH,
    (slideIndex + 1) * SCREEN_WIDTH,
  ];

  const animStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollX.value, inputRange, [-1, 0, 1]);
    return {
      transform: [
        { translateX: card.translateX + progress * 25 },
        { translateY: card.translateY + progress * 10 },
        { rotate: `${card.rotation + progress * 5}deg` },
        { scale: card.scale * interpolate(scrollX.value, inputRange, [0.75, 1, 0.75]) },
      ],
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0]),
    };
  });

  return (
    <Animated.View style={[styles.card, { zIndex: card.zIndex }, animStyle]}>
      <Image source={card.image} style={styles.cardImage} contentFit="cover" />
    </Animated.View>
  );
}

// ============================================
// ANIMATED SLIDE
// ============================================

function SlideView({
  slide,
  index,
  scrollX,
  activeIndex,
}: {
  slide: OnboardingSlide;
  index: number;
  scrollX: SharedValue<number>;
  activeIndex: number;
}) {
  const { t } = useTranslation();
  const player = useVideoPlayer(
    slide.showVideo && slide.videoSource ? slide.videoSource : null,
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );

  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  useEffect(() => {
    if (activeIndex === index && slide.showVideo && player) {
      player.currentTime = 0;
      player.play();
    }
  }, [activeIndex, index, slide.showVideo, player]);

  const imageContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3]),
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollX.value, inputRange, [60, 0, 60]) },
    ],
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0]),
  }));

  const isPermissionSlide = slide.isNotificationSlide || slide.isLocationSlide;
  const isSpecialSlide = isPermissionSlide || slide.isChallengesSlide;

  return (
    <View style={[styles.slidePage, (slide.showVideo || isSpecialSlide) && { backgroundColor: "#0A0A0B" }]}>
      {!slide.showVideo && !isSpecialSlide && (
        <Animated.View style={[styles.slideImageArea, imageContainerStyle]}>
          <Image source={slide.backgroundImage} style={styles.slideImage} contentFit="cover" />
          <LinearGradient
            colors={["rgba(10,10,11,0)", "rgba(10,10,11,0.35)", "rgba(10,10,11,0.8)", "#0A0A0B"]}
            locations={[0, 0.4, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {slide.showVideo && slide.videoSource && (
        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="cover"
            nativeControls={false}
          />
          <View style={styles.videoTopGradient} pointerEvents="none">
            <LinearGradient
              colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0)"]}
              locations={[0, 1]}
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.videoBottomGradient} pointerEvents="none">
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)", "#000"]}
              locations={[0, 0.7, 1]}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      {slide.isNotificationSlide && (
        <Animated.View
          entering={FadeIn.delay(100).duration(500)}
          style={styles.permissionHeroWrapper}
        >
          <NotificationInviteHero />
        </Animated.View>
      )}

      {slide.isLocationSlide && (
        <Animated.View
          entering={FadeIn.delay(100).duration(500)}
          style={styles.permissionHeroWrapper}
        >
          <ClubListPreviewHero />
        </Animated.View>
      )}

      {slide.isChallengesSlide && (
        <Animated.View
          entering={FadeIn.delay(100).duration(500)}
          style={styles.challengesHeroWrapper}
        >
          <ChallengesPreviewHero />
        </Animated.View>
      )}

      {!slide.showVideo && !isSpecialSlide && slide.cards.length > 0 && (
        <View style={styles.cardStackContainer} pointerEvents="none">
          {slide.cards.map((card, ci) => (
            <AnimatedCard
              key={ci}
              card={card}
              cardIndex={ci}
              slideIndex={index}
              scrollX={scrollX}
            />
          ))}
        </View>
      )}

      <Animated.View style={[styles.slideTextContainer, textStyle]}>
        {(() => {
          const title = t(slide.titleKey);
          const lineBreak = title.indexOf('\n');
          if (lineBreak !== -1) {
            return (
              <Text style={styles.slideTitle}>
                {title.slice(0, lineBreak)}
                {'\n'}
                <Text style={styles.slideTitleAccent}>{title.slice(lineBreak + 1)}</Text>
              </Text>
            );
          }
          return <Text style={styles.slideTitle}>{title}</Text>;
        })()}
        <Text style={styles.slideSubtitle}>{t(slide.subtitleKey)}</Text>
      </Animated.View>
    </View>
  );
}

// ============================================
// ANIMATED DOT
// ============================================

function AnimatedDot({
  index,
  scrollX,
}: {
  index: number;
  scrollX: SharedValue<number>;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [8, 28, 8],
      "clamp"
    );
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [0.2, 1, 0.2],
      "clamp"
    );
    return { width, opacity };
  });

  return (
    <Animated.View style={[styles.dot, { backgroundColor: "#BFFF00" }, dotStyle]} />
  );
}

// ============================================
// MAIN
// ============================================

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const buttonScale = useSharedValue(1);
  const scrollX = useSharedValue(0);

  const isLastPage = activeIndex === TOTAL_PAGES - 1;
  const currentSlide = SLIDES[activeIndex];
  const isPermissionSlide = currentSlide?.isNotificationSlide || currentSlide?.isLocationSlide;

  const updateActiveIndex = useCallback((page: number) => {
    setActiveIndex(page);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const page = Math.round(e.contentOffset.x / SCREEN_WIDTH);
      runOnJS(updateActiveIndex)(page);
    },
  });

  const navigateToLogin = useCallback(() => {
    router.replace("/auth/login" as any);
  }, []);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });

    if (currentSlide?.isNotificationSlide) {
      const status = await getNotificationPermissionStatus();
      if (status === 'undetermined') {
        await registerForPushNotifications().catch((err) => {
          console.warn('[Onboarding] Failed to register notifications:', err);
        });
      } else if (status !== 'granted') {
        await Linking.openSettings();
      }
    }

    if (currentSlide?.isLocationSlide) {
      const status = await getLocationPermissionStatus();
      if (status === 'undetermined') {
        await requestLocationPermission().catch((err) => {
          console.warn('[Onboarding] Failed to request location:', err);
        });
      } else if (status !== 'granted') {
        await Linking.openSettings();
      }
    }

    if (isLastPage) {
      navigateToLogin();
    } else {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  }, [isLastPage, activeIndex, currentSlide, buttonScale, navigateToLogin]);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={styles.container}>
      <AnimatedScrollView
        ref={scrollRef as any}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.carousel}
      >
        {SLIDES.map((slide, index) => (
          <SlideView
            key={index}
            slide={slide}
            index={index}
            scrollX={scrollX}
            activeIndex={activeIndex}
          />
        ))}
      </AnimatedScrollView>

      <Animated.View
        entering={FadeInUp.delay(400).duration(500).springify().damping(20)}
        style={[
          styles.bottomControls,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 28 },
        ]}
      >
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <AnimatedDot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        <Animated.View style={[styles.nextBtnContainer, buttonAnimStyle]}>
          <View style={styles.fireButtonWrapper}>
            <ContinuousFireEmitter
              originX={BUTTON_WIDTH / 2}
              originY={0}
              width={BUTTON_WIDTH}
              height={56}
            />
            <Pressable
              onPress={handleNext}
              onPressIn={() => {
                buttonScale.value = withTiming(0.96, { duration: 100 });
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              }}
              style={styles.nextBtn}
            >
              <LinearGradient
                colors={
                  isPermissionSlide
                    ? ["#BFFF00", "#99CC00"]
                    : ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nextBtnGradient}
              >
                <Text style={[styles.nextBtnText, !isPermissionSlide && { color: "#FFFFFF" }]}>
                  {t(currentSlide?.buttonLabelKey ?? "onboarding.continue")}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>

        {isPermissionSlide ? (
          <Pressable
            onPress={() => {
              if (isLastPage) {
                navigateToLogin();
              } else {
                scrollRef.current?.scrollTo({ x: (activeIndex + 1) * SCREEN_WIDTH, animated: true });
              }
            }}
            hitSlop={12}
          >
            <Text style={styles.maybeLaterText}>{t("onboarding.maybeLater")}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0B",
  },
  carousel: {
    flex: 1,
  },

  // Slide
  slidePage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  slideImageArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.62,
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.62,
  },

  // Card stack
  cardStackContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.32,
    right: 24,
    height: CARD_H,
    width: CARD_W,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    width: CARD_W + 20,
    height: CARD_H,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  cardImage: {
    width: "100%" as any,
    height: "100%" as any,
  },

  // Video
  videoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.6,
    overflow: "hidden",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 36,
  },
  videoBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.18,
  },

  // Slide text
  slideTextContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.22,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    gap: 10,
  },
  slideTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    lineHeight: 40,
    fontFamily: ROUNDED,
  },
  slideTitleAccent: {
    color: "#BFFF00",
  },
  slideSubtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255,255,255,0.5)",
    lineHeight: 23,
    fontFamily: ROUNDED,
  },

  // Bottom controls
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    height: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtnContainer: {
    width: "100%",
  },
  fireButtonWrapper: {
    overflow: "visible",
    position: "relative",
  },
  nextBtn: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  nextBtnGradient: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.3,
    fontFamily: ROUNDED,
  },
  maybeLaterText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
    fontFamily: ROUNDED,
  },

  // Permission hero
  permissionHeroWrapper: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.06,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.48,
  },
  heroContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingSticker: {
    position: "absolute",
  },

  // SVG background
  svgStarContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    opacity: 1,
  },

  // Challenges hero
  challengesHeroWrapper: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.04,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.50,
  },
  challengeCardsStack: {
    gap: 12,
    width: SCREEN_WIDTH * 0.72,
    alignItems: "center",
  },
  challengeCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(12, 12, 15, 0.60)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        borderCurve: "continuous" as any,
      },
      android: { elevation: 8 },
    }),
  },
  challengeCardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  challengeCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  challengeCardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  challengeCardEmoji: {
    width: 32,
    height: 32,
  },
  challengeCardTextWrap: {
    flex: 1,
  },
  challengeCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 19,
    fontFamily: ROUNDED,
  },
  challengeCheckComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#BFFF00",
    alignItems: "center",
    justifyContent: "center",
  },
  challengeCheckEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },

  // Notification invite card
  inviteCard: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: "rgba(12, 12, 15, 0.60)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        borderCurve: "continuous" as any,
      },
      android: { elevation: 10 },
    }),
  },
  inviteCardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  inviteCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.10)",
  },
  inviteCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inviteAppIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "rgba(191,255,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteAppName: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
    fontFamily: ROUNDED,
    flex: 1,
  },
  inviteTime: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.3)",
    fontFamily: ROUNDED,
  },
  inviteCardBody: {
    gap: 4,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    fontFamily: ROUNDED,
  },
  inviteSubtext: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.50)",
    lineHeight: 18,
    fontFamily: ROUNDED,
  },

  // Club list cards
  clubCardsStack: {
    gap: 10,
    width: SCREEN_WIDTH * 0.82,
    alignItems: "center",
  },
  clubCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(12, 12, 15, 0.60)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        borderCurve: "continuous" as any,
      },
      android: { elevation: 6 },
    }),
  },
  clubCardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  clubCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  clubCardThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    margin: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  clubCardThumbImg: {
    width: "100%",
    height: "100%",
  },
  clubCardInfo: {
    flex: 1,
    gap: 2,
    paddingVertical: 12,
  },
  clubCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    fontFamily: ROUNDED,
  },
  clubCardAddress: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255,255,255,0.40)",
    fontFamily: ROUNDED,
  },
  clubCardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingRight: 14,
  },
  clubCardDist: {
    fontSize: 12,
    fontWeight: "600",
    color: "#34D399",
    fontFamily: ROUNDED,
  },
});
