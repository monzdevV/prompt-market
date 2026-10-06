/**
 * PREVIASPLUS - Verdad o Reto Game Screen
 * ========================================
 * Swipeable gradient cards like MostLikelyTo/NeverHaveIEver
 * Categories, vibrant cards, smooth animations
 */

import { CategorySelector } from "@/src/components/games/CategorySelector";
import { GameIntro } from "@/src/components/games/GameIntro";
import { PlayerSetup } from "@/src/components/games/PlayerSetup";
import { Colors } from "@/src/constants/theme";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/src/store/gameStore";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MeshGradientView } from "expo-mesh-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import { ArrowRightIcon, ChevronLeftIcon } from "react-native-heroicons/solid";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const ROUNDED: string = Platform.OS === "ios" ? "System" : "sans-serif";
const ACCENT = "#3B82F6";
const ACCENT_DARK = "#1D4ED8";
const SPECIAL_CARD_INTERVAL = 5;

// ============================================
// GRADIENT SETS FOR CARDS
// ============================================

const TRUTH_GRADIENT_SETS: [string, string][] = [
  ["#8B5CF6", "#7C3AED"],
  ["#6366F1", "#4F46E5"],
  ["#A855F7", "#9333EA"],
  ["#06B6D4", "#0891B2"],
  ["#3B82F6", "#2563EB"],
  ["#EC4899", "#DB2777"],
  ["#14B8A6", "#0D9488"],
  ["#7C3AED", "#6D28D9"],
];

const DARE_GRADIENT_SETS: [string, string][] = [
  ["#EF4444", "#DC2626"],
  ["#F97316", "#EA580C"],
  ["#EC4899", "#DB2777"],
  ["#10B981", "#059669"],
  ["#F59E0B", "#D97706"],
  ["#E11D48", "#BE123C"],
  ["#06B6D4", "#0891B2"],
  ["#DC2626", "#B91C1C"],
];

const TRUTH_EMOJIS = [
  require("@/assets/emojis/speech_balloon.png"),
  require("@/assets/emojis/question.png"),
  require("@/assets/emojis/mirror_ball.png"),
  require("@/assets/emojis/crown.png"),
  require("@/assets/emojis/partying_face.png"),
  require("@/assets/emojis/clinking_glasses.png"),
];

const DARE_EMOJIS = [
  require("@/assets/emojis/fire.png"),
  require("@/assets/emojis/tada.png"),
  require("@/assets/emojis/game_dice.png"),
  require("@/assets/emojis/beer.png"),
  require("@/assets/emojis/partying_face.png"),
  require("@/assets/emojis/champagne.png"),
];

const SPECIAL_GIFS = [
  require("@/assets/gifs/Dance Party Sticker.gif"),
  require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
  require("@/assets/gifs/Cat Beer Sticker.gif"),
  require("@/assets/gifs/beer STICKER.gif"),
  require("@/assets/gifs/Beer Drinking Sticker.gif"),
];

// ============================================
// CATEGORIES (Chill / Party / Hot)
// ============================================

type Category = "chill" | "party" | "hot";

const TRUTHS: Record<Category, string[]> = {
  chill: [
    "What is your biggest fear?",
    "What was your most embarrassing moment?",
    "Have you ever lied to a close friend?",
    "What is your best-kept secret?",
    "What's the craziest thing you've ever done?",
    "What is your biggest insecurity?",
    "Have you ever stolen something?",
    "What is your biggest regret?",
    "Have you ever faked being sick to skip work/class?",
    "What is your worst habit?",
    "What's the dumbest thing you've done for love?",
    "Have you ever fallen in public in an epic way?",
    "What's your guilty pleasure song that you sing alone?",
    "What's your most ridiculous nickname?",
    "What's your most embarrassing Google search?",
  ],
  party: [
    "What is your most secret fantasy?",
    "Have you kissed anyone in this room?",
    "What was your worst date?",
    "Have you ever texted your ex while drunk?",
    "What is your ideal type?",
    "Have you stalked your crush on social media?",
    "How many people have you kissed this year?",
    "Have you lied about your body count?",
    "Have you ever been caught doing something you shouldn't?",
    "Who is the most attractive person in this room?",
    "Have you lip-synced thinking no one was watching?",
    "Have you talked to yourself out loud and been caught?",
    "Have you sent a super long text and got no reply?",
    "What's your worst photo that you still keep?",
    "What's the most random thing saved on your phone?",
  ],
  hot: [
    "What has been your hottest experience?",
    "Have you ever had a dirty dream about someone here?",
    "What's the weirdest place you've done it?",
    "Have you sent spicy pics?",
    "What is your favorite position?",
    "Have you had a one-night stand?",
    "Have you ever cheated?",
    "What's the naughtiest thing you've ever done?",
    "Have you used dating apps for hookups?",
    "What is your weakness?",
  ],
};

const DARES: Record<Category, string[]> = {
  chill: [
    "Imitate someone in the group until they guess who it is",
    "Tell a bad joke",
    "Do 10 squats",
    "Give a cheesy compliment to someone in the group",
    "Sing the chorus of your favorite song",
    "Dance for 30 seconds without music",
    "Do your best animal impression",
    "Say something nice about everyone in the group",
    "Tell your worst experience without laughing",
    "Call a friend and tell them you love them",
    "Speak with a French accent for the rest of the round",
    "Act like a robot for 2 minutes",
    "Make your best \"selfie fail\" face",
    "Sing a song like it's opera",
    "Walk like a penguin to your seat",
  ],
  party: [
    "Kiss someone in the group on the cheek",
    "Give someone a shoulder massage",
    "Whisper something in someone's ear",
    "Hug someone for 20 seconds",
    "Let someone read your last messages",
    "Stare at someone for 1 minute",
    "Let someone post something on your Instagram",
    "Sit on someone's lap",
    "Let someone take a photo of you to post",
    "Send a flirty text to your crush",
    "Imitate a crying baby",
    "Do the choreography of a trending song",
    "Make your worst face and let them take a photo",
    "Tell a terrible joke with a straight face",
    "Act like you're in a dramatic soap opera",
  ],
  hot: [
    "Take off a piece of clothing",
    "Give a 10-second kiss to someone you choose",
    "Let someone give you a hickey",
    "Dance sexy for the group",
    "Tell your hottest experience in detail",
    "Lick someone's neck",
    "Do a striptease with just your shirt",
    "Give someone a movie-style kiss",
    "Bite someone's ear",
    "Let someone kiss your neck for 10 seconds",
  ],
};

const CATEGORY_CONFIG: Record<
  Category,
  {
    emoji: string;
    label: string;
    colors: [string, string];
  }
> = {
  chill: {
    emoji: "😎",
    label: "Chill",
    colors: ["#3B82F6", "#6366F1"],
  },
  party: {
    emoji: "🎉",
    label: "Party",
    colors: ["#F97316", "#EF4444"],
  },
  hot: {
    emoji: "🔥",
    label: "Hot",
    colors: ["#EF4444", "#EC4899"],
  },
};

const CATEGORY_OPTIONS = [
  { id: "chill" as const, label: "Chill", emoji: "😎", colors: ["#3B82F6", "#6366F1"] as [string, string], isPremium: false },
  { id: "party" as const, label: "Party", emoji: "🎉", colors: ["#F97316", "#EF4444"] as [string, string], isPremium: false },
  { id: "hot" as const, label: "Hot", emoji: "🔥", colors: ["#EF4444", "#EC4899"] as [string, string], isPremium: true },
];

const CATEGORY_LABEL_KEY: Record<Category, string> = {
  chill: "truthOrDare.categoryChill",
  party: "truthOrDare.categoryParty",
  hot: "truthOrDare.categoryHot",
};

// ============================================
// MESH GRADIENT (special cards)
// ============================================

const MESH_COLS = 3;
const MESH_ROWS = 3;

function useSpecialCardMesh() {
  const meshColors = useMemo(
    () => [
      "#6366F1", "#A855F7", "#EC4899",
      "#A855F7", "#EF4444", "#F97316",
      "#EC4899", "#F97316", "#A855F7",
    ],
    [],
  );
  const meshPoints = useMemo(
    () =>
      [
        [0.0, 0.0], [0.5, 0.0], [1.0, 0.0],
        [0.0, 0.5], [0.5, 0.5], [1.0, 0.5],
        [0.0, 1.0], [0.5, 1.0], [1.0, 1.0],
      ] as [number, number][],
    [],
  );
  return { meshColors, meshPoints };
}

// ============================================
// SWIPEABLE CHALLENGE CARD
// ============================================

interface SwipeCardProps {
  content: string;
  type: "truth" | "dare";
  onSwipe: () => void;
  isTop: boolean;
  cardIndex: number;
  cardKey: number;
  playerName?: string;
  playerSticker?: any;
}

function SwipeCard({
  content,
  type,
  onSwipe,
  isTop,
  cardIndex,
  cardKey,
  playerName,
  playerSticker,
}: SwipeCardProps) {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const enterScale = useSharedValue(isTop ? 1 : 0.92);
  const enterOpacity = useSharedValue(isTop ? 1 : 0.7);
  const enterTranslateY = useSharedValue(isTop ? 0 : 20);

  const isSpecial = cardIndex > 0 && cardIndex % SPECIAL_CARD_INTERVAL === 0;
  const gradientSets = type === "truth" ? TRUTH_GRADIENT_SETS : DARE_GRADIENT_SETS;
  const gradientColors = gradientSets[cardIndex % gradientSets.length];
  const emojiSets = type === "truth" ? TRUTH_EMOJIS : DARE_EMOJIS;
  const cardEmoji = useMemo(
    () => emojiSets[cardIndex % emojiSets.length],
    [cardIndex, emojiSets],
  );
  const specialGif = useMemo(
    () =>
      isSpecial
        ? SPECIAL_GIFS[Math.floor(cardIndex / SPECIAL_CARD_INTERVAL) % SPECIAL_GIFS.length]
        : null,
    [cardIndex, isSpecial],
  );
  const { meshColors, meshPoints } = useSpecialCardMesh();

  const floatY = useSharedValue(0);
  const floatRotate = useSharedValue(0);
  const bgCycle = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
    if (isTop) {
      enterScale.value = 0.92;
      enterOpacity.value = 0.7;
      enterTranslateY.value = 16;
      enterScale.value = withSpring(1, { damping: 18, stiffness: 280, mass: 0.5 });
      enterOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
      enterTranslateY.value = withSpring(0, { damping: 18, stiffness: 280, mass: 0.5 });
    } else {
      enterScale.value = 0.92;
      enterOpacity.value = 0.5;
      enterTranslateY.value = 20;
    }
  }, [cardKey]);

  useEffect(() => {
    if (isSpecial && isTop) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      floatY.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          withTiming(4, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      );
      floatRotate.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      );
      bgCycle.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1, true,
      );
    }
  }, [isSpecial, isTop]);

  const handleSwipe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSwipe();
  }, [onSwipe]);

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
      rotate.value = (e.translationX / SCREEN_WIDTH) * 12;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(dir * SCREEN_WIDTH * 1.5, {
          duration: 150, easing: Easing.out(Easing.cubic),
        });
        rotate.value = withTiming(dir * 25, { duration: 150 }, () => {
          runOnJS(handleSwipe)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        rotate.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    if (!isTop) {
      return {
        transform: [
          { scale: enterScale.value },
          { translateY: enterTranslateY.value },
        ],
        opacity: enterOpacity.value,
      };
    }
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
        { scale: enterScale.value },
      ],
      opacity: enterOpacity.value,
    };
  });

  const stickerFloatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { rotate: `${floatRotate.value}deg` },
    ],
  }));

  const animatedBgStyle = useAnimatedStyle(() => {
    if (!isSpecial) return {};
    const bg = interpolateColor(
      bgCycle.value,
      [0, 0.5, 1],
      ["rgba(99,102,241,0.25)", "rgba(236,72,153,0.35)", "rgba(99,102,241,0.25)"],
    );
    return { backgroundColor: bg };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle, !isTop && styles.cardBack]}>
        {isSpecial ? (
          <>
            {Platform.OS === "ios" ? (
              <MeshGradientView
                style={StyleSheet.absoluteFill}
                columns={MESH_COLS}
                rows={MESH_ROWS}
                colors={meshColors}
                points={meshPoints}
                smoothsColors={true}
                ignoresSafeArea={false}
              />
            ) : (
              <Animated.View style={[StyleSheet.absoluteFill, animatedBgStyle]} />
            )}
          </>
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Emoji sticker (hidden on special cards) */}
        {!isSpecial && (
          <Image source={cardEmoji} style={styles.cardSticker} contentFit="contain" />
        )}

        {/* GIF centered where sticker was */}
        {isSpecial && specialGif && (
          <Animated.View style={[styles.specialGifWrap, stickerFloatStyle]}>
            <Image source={specialGif} style={styles.specialGif} contentFit="contain" />
          </Animated.View>
        )}

        {/* Type label */}
        <Text style={styles.cardTypeLabel}>
          {type === "truth" ? t('truthOrDare.truth') : t('truthOrDare.dare')}
        </Text>

        <Text style={[styles.cardText, isSpecial && styles.cardTextSpecial]}>
          {content}
        </Text>

        {/* Player badge */}
        {playerName && playerSticker && (
          <View style={styles.cardPlayerBadge}>
            <Image source={playerSticker} style={styles.cardPlayerSticker} contentFit="contain" />
            <Text style={styles.cardPlayerName}>{playerName}</Text>
          </View>
        )}

        {isTop && <Text style={styles.swipeHint}>{t('common.swipeToContinue')}</Text>}
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

type GamePhase = "intro" | "setup" | "category" | "playing";

export function TruthOrDareGame() {
  const { t } = useTranslation();
  const { state, dispatch, showPremiumUpsell } = useGameStore();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [selectedCategory, setSelectedCategory] = useState<Category>("chill");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [shuffledTruths, setShuffledTruths] = useState<string[]>([]);
  const [shuffledDares, setShuffledDares] = useState<string[]>([]);
  const [truthIdx, setTruthIdx] = useState(0);
  const [dareIdx, setDareIdx] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<{ content: string; type: "truth" | "dare" } | null>(null);
  const [playerChoice, setPlayerChoice] = useState<"truth" | "dare" | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const isAnimatingNext = useRef(false);

  const players = state.players;
  const isPremium = state.isPremium;
  const currentPlayer = players[currentPlayerIndex];

  // Build separate shuffled pools when category is selected
  const buildDeck = useCallback(
    (category: Category) => {
      const truths = [...TRUTHS[category]].sort(() => Math.random() - 0.5);
      const dares = [...DARES[category]].sort(() => Math.random() - 0.5);
      setShuffledTruths(truths);
      setShuffledDares(dares);
      setTruthIdx(0);
      setDareIdx(0);
      setChallengeIndex(0);
      setCurrentPlayerIndex(0);
      setPlayerChoice(null);
      setCurrentChallenge(null);
      setTotalPlayed(0);
    },
    [],
  );

  // Player picks truth or dare
  const handleChoice = useCallback((choice: "truth" | "dare") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlayerChoice(choice);
    if (choice === "truth") {
      setCurrentChallenge({ content: shuffledTruths[truthIdx % shuffledTruths.length], type: "truth" });
      setTruthIdx((p) => p + 1);
    } else {
      setCurrentChallenge({ content: shuffledDares[dareIdx % shuffledDares.length], type: "dare" });
      setDareIdx((p) => p + 1);
    }
    setChallengeIndex((p) => p + 1);
  }, [shuffledTruths, shuffledDares, truthIdx, dareIdx]);

  // Advance to next player, back to choice screen
  const nextChallenge = useCallback(() => {
    setPlayerChoice(null);
    setCurrentChallenge(null);
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    setTotalPlayed((p) => p + 1);
    isAnimatingNext.current = false;
  }, [players.length]);

  const handleNextButton = useCallback(() => {
    if (isAnimatingNext.current) return;
    isAnimatingNext.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextChallenge();
  }, [nextChallenge]);

  const goBack = useCallback(() => router.back(), []);

  // INTRO
  const renderIntro = () => (
    <GameIntro
      title={t('truthOrDare.introTitle')}
      subtitle={t('truthOrDare.introSubtitle')}
      buttonLabel={t('common.play')}
      emoji={require("@/assets/emojis/truth_or_lie.png")}
      videoSource={require("@/assets/games_preview/truth_or_dare.mp4")}
      accentRgb="rgba(59,130,246,"
      accentColor={ACCENT}
      accentColorDark="#1D4ED8"
      rules={[
        { emoji: require("@/assets/emojis/truth_or_lie.png"), text: t('truthOrDare.rule1') },
        { emoji: require("@/assets/emojis/beer.png"), text: t('truthOrDare.rule2') },
        { emoji: require("@/assets/emojis/fire.png"), text: t('truthOrDare.rule3') },
      ]}
      onPlay={() => {
        players.length >= 2 ? setPhase("category") : setPhase("setup");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onBack={goBack}
    />
  );

  // SETUP
  const renderSetup = () => (
    <PlayerSetup
      minPlayers={2}
      maxPlayers={15}
      gameName={t('truthOrDare.introTitle')}
      gameColor="#3B82F6"
      onBack={goBack}
      onContinue={() => setPhase("category")}
    />
  );

  // CATEGORY SELECTION
  const translatedCategoryOptions = CATEGORY_OPTIONS.map((cat) => ({
    ...cat,
    label: t(CATEGORY_LABEL_KEY[cat.id]),
  }));

  const renderCategory = () => (
    <CategorySelector
      title={t('truthOrDare.pickCategory')}
      categories={translatedCategoryOptions}
      isPremium={isPremium}
      onSelect={(catId) => {
        setSelectedCategory(catId as Category);
        buildDeck(catId as Category);
        setPhase("playing");
      }}
      onBack={goBack}
      onPremiumUpsell={showPremiumUpsell}
    />
  );

  // PLAYING - Choice + Swipeable cards
  const renderPlaying = () => {
    const config = CATEGORY_CONFIG[selectedCategory];

    // Choice screen - player picks Truth or Dare
    if (!playerChoice || !currentChallenge) {
      return (
        <Animated.View entering={FadeIn.duration(250)} style={styles.phaseContainer}>
          <View
            style={[
              styles.playingContent,
              { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={styles.header}>
              <Pressable onPress={() => setPhase("category")} style={styles.backButton}>
                <ChevronLeftIcon size={24} color={Colors.text.primary} />
              </Pressable>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {config.emoji} {t(CATEGORY_LABEL_KEY[selectedCategory])}
                </Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.choiceContainer}>
              {/* Player indicator */}
              {currentPlayer && (
                <Animated.View entering={FadeInDown.delay(50).duration(350).springify()} style={styles.choicePlayerBadge}>
                  {currentPlayer.sticker && (
                    <Image source={currentPlayer.sticker} style={styles.choicePlayerSticker} contentFit="contain" />
                  )}
                  <Text style={styles.choicePlayerName}>{t('truthOrDare.playerTurn', { name: currentPlayer.name })}</Text>
                </Animated.View>
              )}

              <Animated.Text entering={FadeInDown.delay(100).duration(400).springify()} style={styles.choiceTitle}>
                {t('truthOrDare.truthOrDare')}
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(150).duration(400).springify()} style={styles.choiceSubtitle}>
                {t('truthOrDare.pickYourChallenge')}
              </Animated.Text>

              <View style={styles.choiceButtons}>
                {/* TRUTH button */}
                <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={{ flex: 1 }}>
                  <Pressable
                    onPress={() => handleChoice("truth")}
                    style={({ pressed }) => [
                      styles.choiceButton,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={["#8B5CF6", "#6D28D9"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.choiceGradient}
                    >
                      <View style={styles.choiceStickerWrap}>
                        <Image source={require("@/assets/emojis/speech_balloon.png")} style={styles.choiceEmoji} contentFit="contain" />
                      </View>
                      <Text style={styles.choiceButtonLabel}>{t('truthOrDare.truth')}</Text>
                      <Text style={styles.choiceButtonHint}>{t('truthOrDare.revealSecret')}</Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>

                {/* DARE button */}
                <Animated.View entering={FadeInDown.delay(280).duration(400).springify()} style={{ flex: 1 }}>
                  <Pressable
                    onPress={() => handleChoice("dare")}
                    style={({ pressed }) => [
                      styles.choiceButton,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={["#EF4444", "#B91C1C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.choiceGradient}
                    >
                      <View style={[styles.choiceStickerWrap, styles.choiceStickerRotateRight]}>
                        <Image source={require("@/assets/emojis/fire.png")} style={styles.choiceEmoji} contentFit="contain" />
                      </View>
                      <Text style={styles.choiceButtonLabel}>{t('truthOrDare.dare')}</Text>
                      <Text style={styles.choiceButtonHint}>{t('truthOrDare.acceptChallenge')}</Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
            </View>

            {totalPlayed > 0 && (
              <Text style={styles.counter}>
                {t('truthOrDare.played', { count: totalPlayed })}
              </Text>
            )}
          </View>
        </Animated.View>
      );
    }

    // Card view - after choice is made
    return (
      <GestureHandlerRootView style={styles.phaseContainer}>
        <View
          style={[
            styles.playingContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={() => { setPlayerChoice(null); setCurrentChallenge(null); }} style={styles.backButton}>
              <ChevronLeftIcon size={24} color={Colors.text.primary} />
            </Pressable>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {config.emoji} {t(CATEGORY_LABEL_KEY[selectedCategory])}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.cardsContainer}>
            <SwipeCard
              key={`top-${challengeIndex}`}
              content={currentChallenge.content}
              type={currentChallenge.type}
              onSwipe={nextChallenge}
              isTop={true}
              cardIndex={challengeIndex}
              cardKey={challengeIndex}
              playerName={currentPlayer?.name}
              playerSticker={currentPlayer?.sticker}
            />
          </View>

          <View style={styles.bottomArea}>
            <Text style={styles.counter}>
              {t('truthOrDare.played', { count: totalPlayed + 1 })}
            </Text>
            <Pressable onPress={handleNextButton}>
              <Animated.View>
                <LinearGradient
                  colors={[ACCENT, ACCENT_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>{t('common.next')}</Text>
                  <ArrowRightIcon size={18} color="#fff" />
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  };

  return (
    <View style={styles.container}>
      {phase === "intro" && renderIntro()}
      {phase === "setup" && renderSetup()}
      {phase === "category" && renderCategory()}
      {phase === "playing" && renderPlaying()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  phaseContainer: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  playingContent: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(120,120,128,0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },
  categoryBadge: {
    backgroundColor: "rgba(120,120,128,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  categoryBadgeText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text.primary,
    fontFamily: ROUNDED,
  },

  // Intro
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(120,120,128,0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "300",
    marginTop: -2,
    marginLeft: -1,
  },
  introCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  introEmojiWrap: { marginBottom: 16 },
  introEmojiCircle: {
    width: 110,
    height: 110,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
    }),
  },
  introEmoji: { width: 64, height: 64 },
  introTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  introSub: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: 28,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  rulesCard: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  rulesInner: {
    padding: 22,
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(120,120,128,0.18)",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  ruleRowWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  ruleSticker: { width: 22, height: 22 },
  ruleRow: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  mainBtn: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  mainBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },

  // (Category grid now handled by CategorySelector component)

  // Swipeable cards
  cardsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 48,
    minHeight: 340,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 56,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
    }),
  },
  cardBack: { zIndex: 0 },
  cardSticker: { width: 64, height: 64, marginBottom: 12, opacity: 0.95 },
  cardTypeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
    fontFamily: ROUNDED,
  },
  cardText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 35,
    letterSpacing: -0.3,
    fontFamily: ROUNDED,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    paddingBottom: 8,
  },
  cardTextSpecial: {
    paddingBottom: 12,
    textShadowColor: "rgba(0,0,0,0.12)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardPlayerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  cardPlayerSticker: { width: 20, height: 20 },
  cardPlayerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    fontFamily: ROUNDED,
  },
  swipeHint: {
    position: "absolute",
    bottom: 24,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  specialBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  specialBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: 0.5,
  },
  specialGifWrap: {
    marginBottom: 12,
  },
  specialGif: {
    width: 64,
    height: 64,
    opacity: 0.95,
  },

  // Choice screen
  choiceContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  choicePlayerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(120,120,128,0.16)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  choicePlayerSticker: { width: 22, height: 22 },
  choicePlayerName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text.primary,
    fontFamily: ROUNDED,
  },
  choiceTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  choiceSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: "500",
    marginBottom: 32,
    textAlign: "center",
  },
  choiceButtons: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
    paddingHorizontal: 8,
  },
  choiceButton: {
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  choiceGradient: {
    aspectRatio: 0.85,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 6,
  },
  choiceStickerWrap: {
    marginBottom: 8,
    transform: [{ rotate: "-8deg" }],
  },
  choiceStickerRotateRight: {
    transform: [{ rotate: "10deg" }],
  },
  choiceEmoji: { width: 56, height: 56 },
  choiceButtonLabel: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  choiceButtonHint: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    fontFamily: ROUNDED,
  },

  // Bottom area
  bottomArea: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 8,
  },
  counter: {
    fontSize: 14,
    color: "rgba(255,255,255,0.35)",
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    gap: 8,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },
});

export default TruthOrDareGame;
