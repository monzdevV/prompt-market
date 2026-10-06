/**
 * PARTYUP Games Screen - Apple/Bump Modern Design
 * ================================================
 * Redesigned with:
 * - 2-column grid layout like Bump app
 * - Game cards with images, gradients, and modern badges
 * - Apple-style badges (New, Popular, Premium)
 * - Clean, rounded corners and liquid glass effects
 */

import { SwipeableGameCard } from "@/src/components/games/GameCard";
import {
    BorderRadius,
    Colors,
    Spacing,
    Typography,
} from "@/src/constants/theme";
import { useIsPremium, useUser } from "@/src/store";
import { useGameStore } from "@/src/store/gameStore";
import { Game, GameCard } from "@/src/types";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    InteractionManager,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    FireIcon,
    LockClosedIcon,
    PlusIcon,
    SparklesIcon,
    StarIcon,
    TrashIcon,
    UserGroupIcon,
    XMarkIcon,
} from "react-native-heroicons/solid";
import Animated, {
    FadeInDown,
    FadeInUp,
    SlideInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

const GLASS_AVAILABLE = isLiquidGlassAvailable();

function useGlassReady() {
  const [ready, setReady] = useState(!GLASS_AVAILABLE);
  useEffect(() => {
    if (!GLASS_AVAILABLE) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
    return () => handle.cancel();
  }, []);
  return GLASS_AVAILABLE && ready;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ROUNDED: string = Platform.OS === "ios" ? "System" : "sans-serif";

// Game route mapping
const GAME_ROUTES: Record<string, string> = {
  impostor: "/games/impostor",
  "truth-or-dare": "/games/truth-or-dare",
  "la-oca": "/games/la-oca",
  "never-have-i-ever": "/games/never-have-i-ever",
  "most-likely-to": "/games/most-likely-to",
  "would-you-rather": "/games/would-you-rather",
};

// Card dimensions - FULL WIDTH (1 column)
const CARD_GAP = 10;
const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const CARD_HEIGHT = CARD_WIDTH * 0.46;

// ============================================
// LIQUID GLASS CONSTANTS
// ============================================

const GLASS_BORDER_COLOR = "rgba(255, 255, 255, 0.15)";
const DASHED_BORDER_COLOR = "rgba(255, 255, 255, 0.5)";

// ============================================
// STICKERS for card backgrounds
// ============================================

// ============================================
// EMOJIS DISPONIBLES
// ============================================

const ALL_EMOJIS = [
  require("@/assets/emojis/beer.png"), // 0
  require("@/assets/emojis/beers.png"), // 1
  require("@/assets/emojis/clinking_glasses.png"), // 2
  require("@/assets/emojis/tropical_drink.png"), // 3
  require("@/assets/emojis/cocktail.png"), // 4
  require("@/assets/emojis/champagne.png"), // 5
  require("@/assets/emojis/wine_glass.png"), // 6
  require("@/assets/emojis/crown.png"), // 7
  require("@/assets/emojis/fire.png"), // 8
  require("@/assets/emojis/mirror_ball.png"), // 9
  require("@/assets/emojis/partying_face.png"), // 10
  require("@/assets/emojis/tada.png"), // 11
  require("@/assets/emojis/game_dice.png"), // 12 - dado
  require("@/assets/emojis/question.png"), // 13 - pregunta
  require("@/assets/emojis/speech_balloon.png"), // 14 - bocadillo
  require("@/assets/emojis/joystick.png"), // 15 - joystick
  require("@/assets/emojis/space_invader.png"), // 16 - space invader
  require("@/assets/emojis/right_anger_bubble.png"), // 17 - burbuja de enfado
];

// Main emoji (largest, in corner) + random secondary emojis per game
type GameEmojiConfig = {
  main: any; // Large main emoji in the corner
  secondary: number[]; // Indices of secondary emojis from ALL_EMOJIS
  count: number; // Total emojis (3-6)
};

const GAME_EMOJIS: Record<string, GameEmojiConfig> = {
  impostor: {
    main: require("@/assets/emojis/impostor.png"),
    secondary: [16, 8, 15, 10, 9], // space_invader, fire, joystick, partying_face, mirror_ball
    count: 6,
  },
  "truth-or-dare": {
    main: require("@/assets/emojis/truth_or_lie.png"),
    secondary: [8, 14, 13, 17, 10], // fire, speech_balloon, question, right_anger_bubble, partying_face
    count: 6,
  },
  "surprise-gift": {
    main: require("@/assets/emojis/tada.png"),
    secondary: [10, 7, 5, 9, 8], // partying_face, crown, champagne, mirror_ball, fire
    count: 6,
  },
  "la-oca": {
    main: require("@/assets/emojis/table_game.png"),
    secondary: [12, 15, 10, 8, 9], // game_dice, joystick, partying_face, fire, mirror_ball
    count: 6,
  },
  "would-you-rather": {
    main: require("@/assets/emojis/two_cards.png"),
    secondary: [13, 14, 8, 10, 17], // question, speech_balloon, fire, partying_face, right_anger_bubble
    count: 6,
  },
  "doodle-stories": {
    main: require("@/assets/emojis/partying_face.png"),
    secondary: [11, 8, 9, 7, 10], // tada, fire, mirror_ball, crown, partying_face
    count: 6,
  },
  "princess-treatment": {
    main: require("@/assets/emojis/crown.png"),
    secondary: [5, 6, 10, 11, 9], // champagne, wine_glass, partying_face, tada, mirror_ball
    count: 6,
  },
  "never-have-i-ever": {
    main: require("@/assets/emojis/beers.png"),
    secondary: [0, 2, 3, 4, 5], // beer, clinking_glasses, tropical_drink, cocktail, champagne
    count: 6,
  },
  "most-likely-to": {
    main: require("@/assets/emojis/raising_hand.png"),
    secondary: [8, 10, 13, 14, 9], // fire, partying_face, question, speech_balloon, mirror_ball
    count: 6,
  },
};

// Clustered positions in bottom-right corner - overlapping
type StickerPosition = {
  right: number;
  bottom: number;
  size: number;
  rotate: number;
  zIndex: number;
};

// Positions: collage style with emojis decreasing in size
const STICKER_POSITIONS_SETS: StickerPosition[][] = [
  // Set 0 - 4 emojis
  [
    { right: -25, bottom: -28, size: 120, rotate: -12, zIndex: 10 }, // MAIN
    { right: 50, bottom: -5, size: 70, rotate: 18, zIndex: 3 },
    { right: 28, bottom: 38, size: 55, rotate: -15, zIndex: 2 },
    { right: 85, bottom: 25, size: 45, rotate: 10, zIndex: 1 },
  ],
  // Set 1 - 5 emojis
  [
    { right: -25, bottom: -28, size: 120, rotate: -10, zIndex: 10 }, // MAIN
    { right: 55, bottom: -10, size: 68, rotate: 15, zIndex: 4 },
    { right: 30, bottom: 35, size: 55, rotate: -18, zIndex: 3 },
    { right: 90, bottom: 18, size: 48, rotate: 12, zIndex: 2 },
    { right: 68, bottom: 48, size: 42, rotate: -8, zIndex: 1 },
  ],
  // Set 2 - 6 emojis with decreasing sizes
  [
    { right: -25, bottom: -28, size: 120, rotate: -12, zIndex: 10 }, // MAIN - grande
    { right: 52, bottom: -12, size: 72, rotate: 18, zIndex: 5 }, // 2nd - large
    { right: -10, bottom: 57, size: 58, rotate: -15, zIndex: 4 }, // 3rd - medium
    { right: 94, bottom: -5, size: 55, rotate: -10, zIndex: 3 }, // 4th - medium
    { right: 65, bottom: 42, size: 44, rotate: -10, zIndex: 2 }, // 5th - small
  ],
  // Set 3 - 7 emojis
  [
    { right: -28, bottom: -30, size: 120, rotate: -10, zIndex: 10 }, // MAIN
    { right: 55, bottom: -15, size: 70, rotate: 18, zIndex: 6 },
    { right: 30, bottom: 30, size: 58, rotate: -12, zIndex: 5 },
    { right: 92, bottom: 8, size: 50, rotate: 10, zIndex: 4 },
    { right: 68, bottom: 40, size: 44, rotate: -15, zIndex: 3 },
    { right: 110, bottom: 35, size: 38, rotate: 8, zIndex: 2 },
    { right: 95, bottom: 58, size: 34, rotate: -5, zIndex: 1 },
  ],
];

// Mapping from count to position set - ALL use Set 2 (6 well-distributed emojis)
const getPositionsForCount = (count: number): StickerPosition[] => {
  return STICKER_POSITIONS_SETS[2]; // Always Set 2 - 6 large well-distributed emojis
};

// ============================================
// CARTOON TEXTURES - Different for each game
// ============================================

type TextureType =
  | "diagonal-lines"
  | "dots-grid"
  | "waves"
  | "circles"
  | "zigzag"
  | "confetti"
  | "stars"
  | "crosses";

type TextureFade =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

type GameTexture = {
  type: TextureType;
  fade: TextureFade;
  intensity: number; // 0.03 - 0.12
};

const GAME_TEXTURES: Record<string, GameTexture> = {
  impostor: { type: "zigzag", fade: "top-right", intensity: 0.08 },
  "truth-or-dare": {
    type: "diagonal-lines",
    fade: "top-left",
    intensity: 0.06,
  },
  "surprise-gift": { type: "confetti", fade: "center", intensity: 0.1 },
  "la-oca": { type: "dots-grid", fade: "bottom-right", intensity: 0.07 },
  "would-you-rather": { type: "waves", fade: "top-right", intensity: 0.08 },
  "doodle-stories": { type: "circles", fade: "bottom-left", intensity: 0.09 },
  "princess-treatment": { type: "stars", fade: "top-left", intensity: 0.1 },
  "never-have-i-ever": {
    type: "crosses",
    fade: "bottom-right",
    intensity: 0.07,
  },
  "most-likely-to": {
    type: "confetti",
    fade: "top-right",
    intensity: 0.08,
  },
};

// ============================================
// GAME CARD STYLES - Colors and configuration per game
// ============================================

type CardStickerLayout =
  | "right-stack"
  | "corner-spread"
  | "diagonal"
  | "bottom-row"
  | "scattered";

type GameCardStyle = {
  layout: CardStickerLayout;
  gradientColors: [string, string];
  accentColor: string;
  hasGlassOverlay: boolean;
};

const GAME_CARD_STYLES: Record<string, GameCardStyle> = {
  impostor: {
    layout: "right-stack",
    gradientColors: ["#EF4444", "#991B1B"],
    accentColor: "#FCA5A5",
    hasGlassOverlay: true,
  },
  "truth-or-dare": {
    layout: "right-stack",
    gradientColors: ["#3B82F6", "#1D4ED8"],
    accentColor: "#60A5FA",
    hasGlassOverlay: true,
  },
  "surprise-gift": {
    layout: "corner-spread",
    gradientColors: ["#8B5CF6", "#6D28D9"],
    accentColor: "#A78BFA",
    hasGlassOverlay: true,
  },
  "la-oca": {
    layout: "diagonal",
    gradientColors: ["#F59E0B", "#D97706"],
    accentColor: "#FCD34D",
    hasGlassOverlay: true,
  },
  "would-you-rather": {
    layout: "bottom-row",
    gradientColors: ["#EF4444", "#B91C1C"],
    accentColor: "#FCA5A5",
    hasGlassOverlay: true,
  },
  "doodle-stories": {
    layout: "scattered",
    gradientColors: ["#10B981", "#047857"],
    accentColor: "#6EE7B7",
    hasGlassOverlay: false,
  },
  "princess-treatment": {
    layout: "right-stack",
    gradientColors: ["#EC4899", "#BE185D"],
    accentColor: "#F9A8D4",
    hasGlassOverlay: true,
  },
  "never-have-i-ever": {
    layout: "diagonal",
    gradientColors: ["#A855F7", "#7C3AED"],
    accentColor: "#C4B5FD",
    hasGlassOverlay: false,
  },
  "most-likely-to": {
    layout: "right-stack",
    gradientColors: ["#F97316", "#EA580C"],
    accentColor: "#FDBA74",
    hasGlassOverlay: true,
  },
};

// ============================================
// GAME IMAGES - GIFs for each game
// ============================================

const GAME_IMAGES: Record<string, any> = {
  impostor: require("@/assets/gifs/Dance Party Sticker.gif"),
  "truth-or-dare": require("@/assets/gifs/Dance Party Sticker.gif"),
  "never-have-i-ever": require("@/assets/gifs/drunk happy hour Sticker.gif"),
  "la-oca": require("@/assets/gifs/Cat Dancing Sticker by WEPLAY Music GmbH.gif"),
  "would-you-rather": require("@/assets/gifs/Celebrate Happy Birthday Sticker by Originals.gif"),
  "princess-treatment": require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
  "random-questions": require("@/assets/gifs/Cat Beer Sticker.gif"),
  categories: require("@/assets/gifs/Beer Sticker by imoji.gif"),
  kings: require("@/assets/gifs/Disco Ball Nightly Sticker by nightlyofficial.gif"),
  "spin-bottle": require("@/assets/gifs/Dance Dancing Sticker.gif"),
  "surprise-gift": require("@/assets/gifs/Celebrate New Orleans Sticker by GIPHY Studios 2021.gif"),
  "most-likely-to": require("@/assets/gifs/Dance Party Sticker by Fuzzy Wobble.gif"),
};

// ============================================
// BADGE TYPES
// ============================================

type BadgeType = "new" | "popular" | "premium" | "hot" | null;

interface GameItemType extends Game {
  badge?: BadgeType;
  subtitle?: string;
  gradientColors: [string, string];
  image?: any;
}

// ============================================
// Games Data with Bump style
// ============================================

const GAMES_DATA: GameItemType[] = [
  {
    id: "impostor",
    type: "custom",
    name: "games.findThe",
    subtitle: "games.impostor",
    description: "games.impostorDesc",
    icon: "",
    color: "#EF4444",
    gradientColors: ["#EF4444", "#991B1B"],
    minPlayers: 4,
    maxPlayers: 12,
    isPremium: true,
    cards: [],
    timesPlayed: 0,
    rating: 4.9,
    badge: "premium",
    image: GAME_IMAGES["impostor"],
  },
  {
    id: "truth-or-dare",
    type: "truth-or-dare",
    name: "games.truth",
    subtitle: "games.orDare",
    description: "games.truthOrDareDesc",
    icon: "",
    color: "#3B82F6",
    gradientColors: ["#60A5FA", "#2563EB"],
    minPlayers: 2,
    maxPlayers: 15,
    isPremium: false,
    cards: [],
    timesPlayed: 0,
    rating: 4.7,
    badge: null,
    image: GAME_IMAGES["truth-or-dare"],
  },
  {
    id: "la-oca",
    type: "custom",
    name: "games.laOca",
    subtitle: "games.fiesta",
    description: "games.laOcaDesc",
    icon: "",
    color: "#F59E0B",
    gradientColors: ["#FBBF24", "#D97706"],
    minPlayers: 2,
    maxPlayers: 10,
    isPremium: false,
    cards: [],
    timesPlayed: 0,
    rating: 4.5,
    badge: "new",
    image: GAME_IMAGES["la-oca"],
  },
  {
    id: "would-you-rather",
    type: "random-questions",
    name: "games.wouldYou",
    subtitle: "games.rather",
    description: "games.wouldYouRatherDesc",
    icon: "",
    color: "#EF4444",
    gradientColors: ["#F87171", "#DC2626"],
    minPlayers: 2,
    maxPlayers: 20,
    isPremium: false,
    cards: [],
    timesPlayed: 0,
    rating: 4.8,
    badge: null,
    image: GAME_IMAGES["would-you-rather"],
  },
  {
    id: "never-have-i-ever",
    type: "never-have-i-ever",
    name: "games.neverHaveI",
    subtitle: "games.iEver",
    description: "games.neverHaveIEverDesc",
    icon: "",
    color: "#A855F7",
    gradientColors: ["#C084FC", "#9333EA"] as [string, string],
    minPlayers: 2,
    maxPlayers: 20,
    isPremium: false,
    cards: [],
    timesPlayed: 0,
    rating: 4.8,
    badge: "popular",
    image: GAME_IMAGES["never-have-i-ever"],
  },
  {
    id: "most-likely-to",
    type: "custom",
    name: "games.whoIs",
    subtitle: "games.mostLikely",
    description: "games.mostLikelyDesc",
    icon: "",
    color: "#F97316",
    gradientColors: ["#FB923C", "#EA580C"] as [string, string],
    minPlayers: 3,
    maxPlayers: 20,
    isPremium: false,
    cards: [],
    timesPlayed: 0,
    rating: 4.7,
    badge: "new",
    image: GAME_IMAGES["most-likely-to"],
  },
  // === JUEGOS OCULTOS (para futuro) ===
  // {
  //   id: "surprise-gift",
  //   type: "custom",
  //   name: "YOUR SURPRISE",
  //   subtitle: "IS WAITING",
  //   description: "Sorpresas exclusivas",
  //   icon: "",
  //   color: "#6B7280",
  //   gradientColors: ["#9CA3AF", "#4B5563"],
  //   minPlayers: 1,
  //   maxPlayers: 20,
  //   isPremium: true,
  //   cards: [],
  //   timesPlayed: 0,
  //   rating: 4.9,
  //   badge: "premium",
  //   image: GAME_IMAGES["surprise-gift"],
  // },
  // {
  //   id: "doodle-stories",
  //   type: "custom",
  //   name: "DOODLE",
  //   subtitle: "STORIES",
  //   description: "Dibuja y adivina",
  //   icon: "",
  //   color: "#374151",
  //   gradientColors: ["#6B7280", "#1F2937"],
  //   minPlayers: 3,
  //   maxPlayers: 12,
  //   isPremium: false,
  //   cards: [],
  //   timesPlayed: 0,
  //   rating: 4.6,
  //   badge: null,
  //   image: GAME_IMAGES["doodle-stories"],
  // },
  // {
  //   id: "princess-treatment",
  //   type: "custom",
  //   name: "REINA DEL",
  //   subtitle: "DRAMA",
  //   description: "El juego de la realeza",
  //   icon: "",
  //   color: "#EC4899",
  //   gradientColors: ["#F472B6", "#DB2777"],
  //   minPlayers: 4,
  //   maxPlayers: 15,
  //   isPremium: true,
  //   cards: [],
  //   timesPlayed: 0,
  //   rating: 4.9,
  //   badge: null,
  //   image: GAME_IMAGES["princess-treatment"],
  // },
];

// Sample cards
const NEVER_HAVE_I_EVER_CARDS: GameCard[] = [
  {
    id: "1",
    content: "I have never ever kissed someone in this group",
    type: "question",
    intensity: 2,
    drinkPenalty: 1,
    category: "romance",
    isPremium: false,
  },
  {
    id: "2",
    content: "I have never ever snuck into a party",
    type: "question",
    intensity: 1,
    drinkPenalty: 1,
    category: "party",
    isPremium: false,
  },
  {
    id: "3",
    content:
      "I have never ever lied about my age to get into a place",
    type: "question",
    intensity: 1,
    drinkPenalty: 1,
    category: "party",
    isPremium: false,
  },
  {
    id: "4",
    content: "I have never ever woken up not knowing where I was",
    type: "question",
    intensity: 2,
    drinkPenalty: 2,
    category: "party",
    isPremium: false,
  },
  {
    id: "5",
    content: "I have never ever texted my ex while drunk",
    type: "question",
    intensity: 3,
    drinkPenalty: 2,
    category: "romance",
    isPremium: false,
  },
];

// ============================================
// BADGE COMPONENT - Minimalist Apple style
// ============================================

interface BadgeProps {
  type: BadgeType;
}

function GameBadge({ type }: BadgeProps) {
  const { t } = useTranslation();
  if (!type) return null;

  const badgeConfig = {
    new: {
      icon: <StarIcon size={10} color="#000" />,
      text: t('games.badgeNew'),
      bgColor: "#FACC15",
      textColor: "#000",
    },
    popular: {
      icon: <FireIcon size={10} color="#fff" />,
      text: t('games.badgePopular'),
      bgColor: "#EF4444",
      textColor: "#fff",
    },
    premium: {
      icon: <SparklesIcon size={10} color="#000" />,
      text: t('games.badgePremium'),
      bgColor: "#FACC15",
      textColor: "#000",
    },
    hot: {
      icon: <FireIcon size={10} color="#fff" />,
      text: t('games.badgeHot'),
      bgColor: "#F97316",
      textColor: "#fff",
    },
  };

  const config = badgeConfig[type];

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      {config.icon}
      <Text
        style={[
          styles.badgeText,
          { color: config.textColor, fontFamily: ROUNDED },
        ]}
      >
        {config.text}
      </Text>
    </View>
  );
}

// ============================================
// STYLED GAME CARD - Image style with stickers and dotted border
// ============================================

interface StyledGameCardProps {
  game: GameItemType;
  onPress: () => void;
  disabled?: boolean;
  index: number;
  glassReady: boolean;
}

function StyledGameCard({
  game,
  onPress,
  disabled = false,
  index,
  glassReady,
}: StyledGameCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  // Get game-specific style or default
  const cardStyle = GAME_CARD_STYLES[game.id] || {
    layout: "right-stack" as CardStickerLayout,
    gradientColors: game.gradientColors,
    accentColor: "#FFFFFF",
    hasGlassOverlay: false,
  };

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

  // Render card content with or without liquid glass
  const renderCardContent = () => {
    // Get emoji configuration for this game
    const emojiConfig = GAME_EMOJIS[game.id] || {
      main: ALL_EMOJIS[0],
      secondary: [1, 2, 3],
      count: 4,
    };
    const positions = getPositionsForCount(emojiConfig.count);

    // Build emoji array: main first, then secondary
    const getEmojiForPosition = (index: number) => {
      if (index === 0) return emojiConfig.main; // First one is always the main emoji
      const secondaryIndex = (index - 1) % emojiConfig.secondary.length;
      return ALL_EMOJIS[emojiConfig.secondary[secondaryIndex]];
    };

    // Get texture for this game
    const texture = GAME_TEXTURES[game.id] || {
      type: "diagonal-lines",
      fade: "top-left",
      intensity: 0.06,
    };

    // Calculate opacity with fade based on position
    const getOpacityForPosition = (
      x: number,
      y: number,
      fade: TextureFade,
      baseIntensity: number,
    ) => {
      let fadeMultiplier = 1;
      switch (fade) {
        case "top-left":
          fadeMultiplier = 1 - (x * 0.6 + y * 0.4);
          break;
        case "top-right":
          fadeMultiplier = 1 - ((1 - x) * 0.6 + y * 0.4);
          break;
        case "bottom-left":
          fadeMultiplier = 1 - (x * 0.6 + (1 - y) * 0.4);
          break;
        case "bottom-right":
          fadeMultiplier = 1 - ((1 - x) * 0.6 + (1 - y) * 0.4);
          break;
        case "center":
          const distFromCenter = Math.sqrt(
            Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2),
          );
          fadeMultiplier = 1 - distFromCenter * 1.2;
          break;
      }
      return Math.max(0, Math.min(1, fadeMultiplier)) * baseIntensity;
    };

    // Render texture by type
    const renderTexture = () => {
      switch (texture.type) {
        case "diagonal-lines":
          return Array.from({ length: 15 }).map((_, i) => {
            const x = i / 15;
            const opacity = getOpacityForPosition(
              x,
              0.5,
              texture.fade,
              texture.intensity,
            );
            return (
              <View
                key={`line-${i}`}
                style={{
                  position: "absolute",
                  width: 2,
                  height: 400,
                  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                  left: -60 + i * 22,
                  top: -80,
                  transform: [{ rotate: "45deg" }],
                }}
              />
            );
          });

        case "dots-grid":
          return Array.from({ length: 24 }).map((_, i) => {
            const col = i % 6;
            const row = Math.floor(i / 6);
            const x = col / 6;
            const y = row / 4;
            const opacity = getOpacityForPosition(
              x,
              y,
              texture.fade,
              texture.intensity,
            );
            return (
              <View
                key={`dot-${i}`}
                style={{
                  position: "absolute",
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                  left: `${12 + col * 16}%`,
                  top: `${15 + row * 22}%`,
                }}
              />
            );
          });

        case "waves":
          return Array.from({ length: 5 }).map((_, i) => {
            const y = i / 5;
            const opacity = getOpacityForPosition(
              0.3,
              y,
              texture.fade,
              texture.intensity,
            );
            return (
              <View
                key={`wave-${i}`}
                style={{
                  position: "absolute",
                  width: "120%",
                  height: 3,
                  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                  left: -10,
                  top: `${18 + i * 18}%`,
                  borderRadius: 2,
                  transform: [{ scaleX: 1.1 }],
                }}
              />
            );
          });

        case "circles":
          return Array.from({ length: 6 }).map((_, i) => {
            const x = (i % 3) / 3 + 0.15;
            const y = Math.floor(i / 3) / 2 + 0.2;
            const opacity = getOpacityForPosition(
              x,
              y,
              texture.fade,
              texture.intensity,
            );
            const size = 20 + (i % 3) * 15;
            return (
              <View
                key={`circle-${i}`}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: 2,
                  borderColor: `rgba(255, 255, 255, ${opacity})`,
                  backgroundColor: "transparent",
                  left: `${15 + (i % 3) * 28}%`,
                  top: `${20 + Math.floor(i / 3) * 35}%`,
                }}
              />
            );
          });

        case "zigzag":
          return Array.from({ length: 8 }).map((_, i) => {
            const x = (i % 4) / 4;
            const y = Math.floor(i / 4) / 2;
            const opacity = getOpacityForPosition(
              x,
              y,
              texture.fade,
              texture.intensity,
            );
            return (
              <View
                key={`zig-${i}`}
                style={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  borderLeftWidth: 8,
                  borderRightWidth: 8,
                  borderBottomWidth: 12,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderBottomColor: `rgba(255, 255, 255, ${opacity})`,
                  left: `${10 + (i % 4) * 22}%`,
                  top: `${15 + Math.floor(i / 4) * 40}%`,
                  transform: [{ rotate: i % 2 === 0 ? "0deg" : "180deg" }],
                }}
              />
            );
          });

        case "confetti":
          return Array.from({ length: 12 }).map((_, i) => {
            const x = (i % 4) / 4 + 0.1;
            const y = Math.floor(i / 4) / 3 + 0.1;
            const opacity = getOpacityForPosition(
              x,
              y,
              texture.fade,
              texture.intensity,
            );
            const rotations = [
              15, -20, 45, -10, 30, -35, 20, -25, 40, -15, 25, -30,
            ];
            return (
              <View
                key={`confetti-${i}`}
                style={{
                  position: "absolute",
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

        case "stars":
          return Array.from({ length: 8 }).map((_, i) => {
            const x = (i % 4) / 4 + 0.1;
            const y = Math.floor(i / 4) / 2 + 0.15;
            const opacity = getOpacityForPosition(
              x,
              y,
              texture.fade,
              texture.intensity,
            );
            const size = 6 + (i % 3) * 4;
            return (
              <View
                key={`star-${i}`}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                  left: `${10 + (i % 4) * 22}%`,
                  top: `${18 + Math.floor(i / 4) * 38}%`,
                  transform: [{ rotate: "45deg" }],
                }}
              />
            );
          });

        case "crosses":
          return Array.from({ length: 9 }).map((_, i) => {
            const x = (i % 3) / 3 + 0.15;
            const y = Math.floor(i / 3) / 3 + 0.15;
            const opacity = getOpacityForPosition(
              x,
              y,
              texture.fade,
              texture.intensity,
            );
            return (
              <View
                key={`cross-${i}`}
                style={{
                  position: "absolute",
                  left: `${15 + (i % 3) * 30}%`,
                  top: `${18 + Math.floor(i / 3) * 28}%`,
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    width: 12,
                    height: 3,
                    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                    borderRadius: 1.5,
                    top: 4.5,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: 3,
                    height: 12,
                    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                    borderRadius: 1.5,
                    left: 4.5,
                  }}
                />
              </View>
            );
          });

        default:
          return null;
      }
    };

    return (
      <>
        {/* Background Gradient */}
        <LinearGradient
          colors={cardStyle.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Textura Cartoon única por juego con fade de opacidad */}
        <View style={styledStyles.cartoonTexture} pointerEvents="none">
          {renderTexture()}
        </View>

        {/* Text Content - ARRIBA IZQUIERDA */}
        <View style={styledStyles.textContent}>
          <Text style={styledStyles.gameName}>{t(game.name)}</Text>
          {game.subtitle && (
            <Text
              style={[
                styledStyles.gameSubtitle,
                { color: cardStyle.accentColor },
              ]}
            >
              {t(game.subtitle)}
            </Text>
          )}
        </View>

        {/* Emojis apelotonados - ABAJO DERECHA (principal grande + secundarios random) */}
        <View style={styledStyles.stickersBackground} pointerEvents="none">
          {positions.slice(0, emojiConfig.count).map((pos, i) => (
            <Image
              key={i}
              source={getEmojiForPosition(i)}
              style={[
                styledStyles.backgroundSticker,
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

        {/* Blur overlay for locked cards */}
        {disabled && (
          <BlurView
            intensity={25}
            tint="dark"
            style={styledStyles.lockBlurOverlay}
          />
        )}

        {/* Badge - abajo a la izquierda */}
        {game.badge && !disabled && (
          <View style={styledStyles.badgeContainer}>
            <GameBadge type={game.badge} />
          </View>
        )}

        {/* Lock for premium - liquid glass abajo izquierda */}
        {disabled && (
          <View style={styledStyles.lockContainer}>
            {glassReady ? (
              <GlassView style={styledStyles.lockGlass}>
                <LockClosedIcon size={18} color="rgba(255,255,255,0.9)" />
              </GlassView>
            ) : (
              <BlurView
                intensity={40}
                tint="dark"
                style={styledStyles.lockGlass}
              >
                <LockClosedIcon size={18} color="rgba(255,255,255,0.9)" />
              </BlurView>
            )}
          </View>
        )}
      </>
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).duration(400)}
      style={styledStyles.cardWrapper}
    >
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styledStyles.cardPressable}
        >
          <View style={styledStyles.cardInner}>{renderCardContent()}</View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// Styles for StyledGameCard
const STYLED_CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2; // Full width
const STYLED_CARD_HEIGHT = STYLED_CARD_WIDTH * 0.45; // Rectangular ratio

const styledStyles = StyleSheet.create({
  cardWrapper: {
    width: STYLED_CARD_WIDTH,
    height: STYLED_CARD_HEIGHT,
    marginBottom: CARD_GAP,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  cartoonTexture: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0,
  },
  stickersBackground: {
    position: "absolute",
    bottom: 0,
    right: 0,
    height: "60%",
    width: "70%",
    zIndex: 1,
  },
  backgroundSticker: {
    position: "absolute",
    opacity: 1,
  },
  dotsPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  patternDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  badgeContainer: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    zIndex: 15,
  },
  lockBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  lockContainer: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    zIndex: 20,
  },
  lockGlass: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContent: {
    position: "absolute",
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
  },
  gameName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  gameSubtitle: {
    fontSize: 34,
    fontWeight: "900",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
    marginTop: -4,
  },
});

// ============================================
// GAME GRID CARD - Bump style with image (backup)
// ============================================

interface GameGridCardProps {
  game: GameItemType;
  onPress: () => void;
  disabled?: boolean;
  index: number;
}

function GameGridCard({
  game,
  onPress,
  disabled = false,
  index,
}: GameGridCardProps) {
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

  // Determine if card has white border or no border
  const hasWhiteBorder =
    game.id === "surprise-gift" || game.id === "would-you-rather";

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).duration(400)}
      style={styles.gridCardWrapper}
    >
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        onPress={() => !disabled && onPress()}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.gridCardPressable}
      >
        <View
          style={[
            styles.gridCard,
            hasWhiteBorder && styles.gridCardWithBorder,
            disabled && styles.cardDisabled,
          ]}
        >
          {/* Background Gradient */}
          <LinearGradient
            colors={game.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Image/GIF */}
          {game.image && (
            <View style={styles.gridCardImageContainer}>
              <Image
                source={game.image}
                style={styles.gridCardImage}
                contentFit="cover"
                autoplay
              />
              {/* Gradient overlay for text readability */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gridCardImageOverlay}
              />
            </View>
          )}

          {/* Badge */}
          {game.badge && (
            <View style={styles.badgeContainer}>
              <GameBadge type={game.badge} />
            </View>
          )}

          {/* Lock for premium */}
          {disabled && (
            <View style={styles.lockOverlay}>
              <BlurView intensity={30} tint="dark" style={styles.lockBlur}>
                <LockClosedIcon size={24} color="rgba(255,255,255,0.8)" />
              </BlurView>
            </View>
          )}

          {/* Text Content */}
          <View style={styles.gridCardContent}>
            <Text style={styles.gridCardName}>{t(game.name)}</Text>
            {game.subtitle && (
              <Text
                style={[
                  styles.gridCardSubtitle,
                  {
                    color:
                      game.color === "#EF4444"
                        ? "#22D3EE"
                        : Colors.accent.yellow,
                  },
                ]}
              >
                {t(game.subtitle)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = useUser();
  const isPremium = useIsPremium();
  const glassReady = useGlassReady();
  const { state: gameState, addPlayer, removePlayer } = useGameStore();

  const [selectedGame, setSelectedGame] = useState<GameItemType | null>(null);
  const [currentCards, setCurrentCards] = useState<GameCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const playerInputRef = useRef<TextInput>(null);

  const players = gameState.players;

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name || players.length >= 12) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addPlayer(name);
    setNewPlayerName("");
    playerInputRef.current?.focus();
  };

  const handleRemovePlayer = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removePlayer(id);
  };

  const handleSelectGame = (game: GameItemType) => {
    if (game.isPremium && !isPremium) {
      router.push("/paywall-sheet");
      return;
    }

    // Navigate to dedicated game screen if route exists
    const gameRoute = GAME_ROUTES[game.id];
    if (gameRoute) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(gameRoute as any);
      return;
    }

    // Fallback to legacy card-based games
    setSelectedGame(game);
    setCurrentCards(NEVER_HAVE_I_EVER_CARDS);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handleSwipeLeft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < currentCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setSelectedGame(null);
    }
  };

  const handleSwipeRight = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (currentIndex < currentCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setSelectedGame(null);
    }
  };

  const handleSwipeUp = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (currentIndex < currentCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setSelectedGame(null);
    }
  };

  const handleExitGame = () => {
    setIsPlaying(false);
    setSelectedGame(null);
    setCurrentIndex(0);
  };

  // ============================================
  // PLAYING VIEW
  // ============================================
  if (isPlaying && selectedGame) {
    return (
      <View style={[styles.gameContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.gameHeader}
        >
          <Pressable
            onPress={handleExitGame}
            style={styles.exitButton}
            hitSlop={12}
          >
            <BlurView intensity={40} tint="dark" style={styles.exitButtonBlur}>
              <XMarkIcon size={18} color={Colors.text.primary} />
            </BlurView>
          </Pressable>

          <Text style={styles.gameHeaderName}>{t(selectedGame.name)}</Text>

          <View style={styles.cardCounter}>
            <BlurView intensity={40} tint="dark" style={styles.cardCounterBlur}>
              <Text style={styles.cardCounterText}>
                {currentIndex + 1}/{currentCards.length}
              </Text>
            </BlurView>
          </View>
        </Animated.View>

        {/* Progress */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              entering={SlideInRight.duration(300)}
              style={[
                styles.progressFill,
                {
                  width: `${((currentIndex + 1) / currentCards.length) * 100}%`,
                  backgroundColor: selectedGame.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Card Stack */}
        <View style={styles.cardStack}>
          {currentCards
            .slice(currentIndex, currentIndex + 3)
            .reverse()
            .map((card, index) => {
              const actualIndex = currentIndex + (2 - index);
              const isActive = actualIndex === currentIndex;

              return (
                <SwipeableGameCard
                  key={card.id}
                  card={card}
                  gameType={selectedGame.type}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onSwipeUp={handleSwipeUp}
                  isActive={isActive}
                  index={2 - index}
                />
              );
            })}
        </View>

        {/* Instructions */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={styles.instructions}
        >
          <View style={styles.instructionCard}>
            <BlurView intensity={30} tint="dark" style={styles.instructionBlur}>
              <View style={styles.instructionsRow}>
                <View style={styles.instructionItem}>
                  <ChevronLeftIcon size={16} color={Colors.text.muted} />
                  <Text style={styles.instructionText}>{t('games.skip')}</Text>
                </View>
                <View style={styles.instructionItem}>
                  <ChevronUpIcon size={16} color={Colors.primary.main} />
                  <Text
                    style={[
                      styles.instructionText,
                      { color: Colors.primary.main },
                    ]}
                  >
                    {t('games.drink')}
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionText}>{t('games.done')}</Text>
                  <ChevronRightIcon size={16} color={Colors.text.muted} />
                </View>
              </View>
            </BlurView>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ============================================
  // GAMES GRID VIEW - Bump style
  // ============================================
  return (
    <View style={styles.container}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('games.partyTitle')} <Text style={styles.headerTitleAccent}>{t('games.gamesAccent')}</Text>
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Players pill */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPlayersModal(true);
            }}
            style={({ pressed }) => [
              pmStyles.playersPill,
              {
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <UserGroupIcon size={16} color={Colors.primary.main} />
            <Text style={pmStyles.playersPillText}>
              {players.length === 0
                ? t('games.addPlayers')
                : t('games.playerCount', { count: players.length })}
            </Text>
            {players.length > 0 && (
              <View style={pmStyles.playersPillAvatars}>
                {players.slice(0, 4).map((p, i) => (
                  <Image
                    key={p.id}
                    source={p.sticker}
                    style={[
                      pmStyles.playersPillAvatar,
                      { marginLeft: i > 0 ? -6 : 0 },
                    ]}
                    contentFit="contain"
                  />
                ))}
                {players.length > 4 && (
                  <View style={[pmStyles.playersPillMore, { marginLeft: -6 }]}>
                    <Text style={pmStyles.playersPillMoreText}>
                      +{players.length - 4}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <ChevronRightIcon size={14} color={Colors.primary.main} />
          </Pressable>

          {/* Games Grid - 2 columns - Nuevo estilo con stickers */}
          <View style={styles.gamesGrid}>
            {GAMES_DATA.map((game, index) => (
              <StyledGameCard
                key={game.id}
                game={game}
                index={index}
                onPress={() => handleSelectGame(game)}
                disabled={game.isPremium && !isPremium}
                glassReady={glassReady}
              />
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Player Management Modal */}
        <Modal
          visible={showPlayersModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPlayersModal(false)}
        >
          <KeyboardAvoidingView
            style={pmStyles.modalContainer}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* Modal Header */}
            <View style={pmStyles.modalHeader}>
              <Text style={pmStyles.modalTitle}>{t('games.playersModalTitle')}</Text>
              <Pressable
                onPress={() => setShowPlayersModal(false)}
                hitSlop={12}
                style={pmStyles.modalCloseBtn}
              >
                <XMarkIcon size={18} color={Colors.text.primary} />
              </Pressable>
            </View>

            {/* Add player input */}
            <View style={pmStyles.addRow}>
              <TextInput
                ref={playerInputRef}
                style={pmStyles.addInput}
                placeholder={t('games.playerNamePlaceholder')}
                placeholderTextColor={Colors.text.muted}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                onSubmitEditing={handleAddPlayer}
                returnKeyType="done"
                maxLength={20}
              />
              <Pressable
                onPress={handleAddPlayer}
                disabled={!newPlayerName.trim() || players.length >= 12}
                style={({ pressed }) => {
                  const isDisabled = !newPlayerName.trim() || players.length >= 12;
                  return [
                    pmStyles.addBtn,
                    {
                      backgroundColor: isDisabled
                        ? 'rgba(255,255,255,0.08)'
                        : Colors.primary.main,
                      opacity: pressed && !isDisabled ? 0.7 : 1,
                    },
                  ];
                }}
              >
                <PlusIcon size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Player list */}
            {players.length === 0 ? (
              <View style={pmStyles.emptyState}>
                <UserGroupIcon size={40} color={Colors.text.muted} />
                <Text style={pmStyles.emptyText}>
                  {t('games.addPlayersToStart')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={players}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item, index }) => (
                  <Animated.View
                    entering={FadeInDown.delay(index * 40).duration(300)}
                    style={pmStyles.playerRow}
                  >
                    <Image
                      source={item.sticker}
                      style={pmStyles.playerSticker}
                      contentFit="contain"
                    />
                    <Text style={pmStyles.playerName}>{item.name}</Text>
                    <Pressable
                      onPress={() => handleRemovePlayer(item.id)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        pmStyles.removeBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <TrashIcon size={16} color="#FF453A" />
                    </Pressable>
                  </Animated.View>
                )}
              />
            )}

            <Text style={pmStyles.footerHint}>{t('games.playerLimit', { count: players.length, max: 12 })}</Text>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  headerTitleAccent: {
    color: Colors.primary.main,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  // Games Grid - 2 columns
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: CARD_GAP,
  },

  // Grid Card
  gridCardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: CARD_GAP - 2,
  },
  gridCardPressable: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  gridCard: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  gridCardWithBorder: {
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  cardDisabled: {
    opacity: 0.7,
  },
  gridCardImageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridCardImage: {
    width: "100%",
    height: "100%",
  },
  gridCardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridCardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  gridCardName: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: ROUNDED,
    color: "#fff",
    letterSpacing: -0.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  gridCardSubtitle: {
    fontSize: 20,
    fontWeight: "900",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: -2,
  },

  // Badge
  badgeContainer: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    zIndex: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Lock Overlay
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  lockBlur: {
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
  },

  // Premium Banner
  premiumBannerWrapper: {
    marginTop: Spacing.lg,
  },
  premiumBanner: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  premiumContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  premiumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  premiumEmoji: {
    fontSize: 24,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: Typography.size.md,
    fontWeight: "700",
    fontFamily: ROUNDED,
    color: "#fff",
  },
  premiumSubtitle: {
    fontSize: Typography.size.sm,
    color: "rgba(255,255,255,0.7)",
    fontFamily: ROUNDED,
    marginTop: 2,
  },

  // Game Active Styles
  gameContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  exitButton: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  exitButtonBlur: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
  },
  gameHeaderName: {
    fontSize: Typography.size.lg,
    fontWeight: "700",
    fontFamily: ROUNDED,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  cardCounter: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  cardCounterBlur: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
  },
  cardCounterText: {
    fontSize: Typography.size.sm,
    fontWeight: "600",
    fontFamily: ROUNDED,
    color: Colors.text.primary,
  },
  progressBarContainer: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.md,
  },
  instructions: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  instructionCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
  },
  instructionBlur: {
    padding: Spacing.md,
  },
  instructionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  instructionText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    fontWeight: "500",
    fontFamily: ROUNDED,
  },
});

// ============================================
// PLAYER MANAGEMENT STYLES
// ============================================
const pmStyles = StyleSheet.create({
  playersPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  playersPillText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: ROUNDED,
    color: Colors.text.secondary,
  },
  playersPillAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  playersPillAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  playersPillMore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  playersPillMoreText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.text.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: ROUNDED,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  addRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  addInput: {
    flex: 1,
    height: 46,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary.main,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.muted,
    textAlign: "center",
    fontWeight: "500",
    fontFamily: ROUNDED,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  playerSticker: {
    width: 28,
    height: 28,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: ROUNDED,
    color: Colors.text.primary,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,69,58,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  footerHint: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: "center",
    paddingVertical: 12,
    fontWeight: "500",
    fontFamily: ROUNDED,
  },
});
