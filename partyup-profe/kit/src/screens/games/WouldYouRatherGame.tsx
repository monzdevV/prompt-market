/**
 * PREVIASPLUS - ¿Qué Prefieres? (Would You Rather) Game Screen
 * =============================================================
 * Swipeable gradient cards with two-option choices
 * Same SwipeCard pattern as MostLikelyTo/NeverHaveIEver
 */

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
const ACCENT = "#EF4444";
const ACCENT_DARK = "#B91C1C";
const SPECIAL_CARD_INTERVAL = 5;

// ============================================
// GRADIENT SETS
// ============================================

const CARD_GRADIENT_SETS: [string, string][] = [
  ["#EF4444", "#DC2626"],
  ["#F97316", "#EA580C"],
  ["#EC4899", "#DB2777"],
  ["#8B5CF6", "#7C3AED"],
  ["#3B82F6", "#2563EB"],
  ["#10B981", "#059669"],
  ["#06B6D4", "#0891B2"],
  ["#F59E0B", "#D97706"],
  ["#A855F7", "#9333EA"],
  ["#14B8A6", "#0D9488"],
];

const CARD_EMOJIS = [
  require("@/assets/emojis/question.png"),
  require("@/assets/emojis/partying_face.png"),
  require("@/assets/emojis/fire.png"),
  require("@/assets/emojis/speech_balloon.png"),
  require("@/assets/emojis/mirror_ball.png"),
  require("@/assets/emojis/crown.png"),
  require("@/assets/emojis/game_dice.png"),
  require("@/assets/emojis/tada.png"),
];

const SPECIAL_GIFS = [
  require("@/assets/gifs/Dance Party Sticker.gif"),
  require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
  require("@/assets/gifs/Cat Beer Sticker.gif"),
  require("@/assets/gifs/beer STICKER.gif"),
  require("@/assets/gifs/Beer Drinking Sticker.gif"),
];

// ============================================
// QUESTIONS - WOULD YOU RATHER
// ============================================

interface WYRQuestion {
  optionA: string;
  optionB: string;
}

const QUESTIONS_FREE: WYRQuestion[] = [
  { optionA: "Be able to fly", optionB: "Be invisible" },
  { optionA: "Live without music", optionB: "Live without movies" },
  { optionA: "Know what people think", optionB: "Be able to control time" },
  { optionA: "Have free food forever", optionB: "Have free Wi-Fi forever" },
  { optionA: "Live at the beach", optionB: "Live in the mountains" },
  { optionA: "Be famous", optionB: "Be a secret millionaire" },
  { optionA: "Go back to the past", optionB: "See the future" },
  { optionA: "Never be able to lie", optionB: "Never know if others are lying" },
  { optionA: "Have a private jet", optionB: "Have a mansion" },
  { optionA: "Speak all languages", optionB: "Play all instruments" },
  { optionA: "Be the funniest person", optionB: "Be the smartest person" },
  { optionA: "Live 200 years", optionB: "Relive 3 times" },
  { optionA: "Only eat pizza", optionB: "Only eat sushi" },
  { optionA: "Always be the DJ", optionB: "Always be the bartender" },
  { optionA: "Never sleep and never get tired", optionB: "Sleep half as much" },
  { optionA: "Lose all your photos", optionB: "Lose all your contacts" },
  { optionA: "Teleport anywhere", optionB: "Be able to stop time" },
  { optionA: "Never-ending party", optionB: "Never-ending vacation" },
  { optionA: "Always be lucky", optionB: "Be extremely attractive" },
  { optionA: "Be the best at a sport", optionB: "Be the best chef" },
];

const QUESTIONS_PREMIUM: WYRQuestion[] = [
  { optionA: "Kiss your crush in front of everyone", optionB: "Have your crush kiss you in private" },
  { optionA: "Hook up with a celebrity", optionB: "Hook up with your ex again" },
  { optionA: "Have someone see your DMs", optionB: "Have someone see your browser history" },
  { optionA: "Make out with someone here", optionB: "Have someone here take you on a date" },
  { optionA: "Wake up with no memory of last night", optionB: "Wake up and remember EVERYTHING" },
  { optionA: "Hook up with two people the same night", optionB: "Not hook up for a month" },
  { optionA: "Send a love message to the group chat", optionB: "Post your ugliest photo" },
  { optionA: "Do a striptease here", optionB: "Tell your most embarrassing secret" },
  { optionA: "A blind date with someone in the group", optionB: "A date with a complete stranger" },
  { optionA: "Have your ex see your latest story", optionB: "Have your ex see your photo gallery" },
  { optionA: "Confess your biggest fantasy", optionB: "Listen to someone in the group's fantasy" },
  { optionA: "Dance reggaeton close with someone", optionB: "Kiss whoever they tell you" },
  { optionA: "Have them read your last WhatsApp", optionB: "Have them read your phone notes" },
  { optionA: "Remove one piece of clothing each round", optionB: "Take a shot each round" },
  { optionA: "One-night stand with your bestie", optionB: "Serious relationship with a random" },
];

// ============================================
// MESH GRADIENT (special cards)
// ============================================

const MESH_COLS = 3;
const MESH_ROWS = 3;

function useSpecialCardMesh() {
  const meshColors = useMemo(
    () => [
      "#EF4444", "#F97316", "#EC4899",
      "#F97316", "#DC2626", "#EF4444",
      "#EC4899", "#EF4444", "#F97316",
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
// SWIPEABLE WYR CARD
// ============================================

interface SwipeCardProps {
  question: WYRQuestion;
  onSwipe: () => void;
  isTop: boolean;
  cardIndex: number;
  cardKey: number;
}

function SwipeCard({ question, onSwipe, isTop, cardIndex, cardKey }: SwipeCardProps) {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const enterScale = useSharedValue(isTop ? 1 : 0.92);
  const enterOpacity = useSharedValue(isTop ? 1 : 0.7);
  const enterTranslateY = useSharedValue(isTop ? 0 : 20);

  const isSpecial = cardIndex > 0 && cardIndex % SPECIAL_CARD_INTERVAL === 0;
  const gradientColors = CARD_GRADIENT_SETS[cardIndex % CARD_GRADIENT_SETS.length];
  const cardEmoji = useMemo(() => CARD_EMOJIS[cardIndex % CARD_EMOJIS.length], [cardIndex]);
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
      ["rgba(239,68,68,0.25)", "rgba(236,72,153,0.35)", "rgba(239,68,68,0.25)"],
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

        <Text style={styles.wyrLabel}>{t('wouldYouRather.headerTitle')}</Text>

        <Text style={[styles.cardText, isSpecial && styles.cardTextSpecial]}>
          {question.optionA}
        </Text>

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>{t('wouldYouRather.or')}</Text>
          <View style={styles.orLine} />
        </View>

        <Text style={[styles.cardText, isSpecial && styles.cardTextSpecial]}>
          {question.optionB}
        </Text>

        {isTop && <Text style={styles.swipeHint}>{t('common.swipeToContinue')}</Text>}
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

type GamePhase = "intro" | "setup" | "playing" | "finished";

export function WouldYouRatherGame() {
  const { t } = useTranslation();
  const { state } = useGameStore();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<WYRQuestion[]>([]);
  const isAnimatingNext = useRef(false);

  const players = state.players;
  const isPremium = state.isPremium;

  useEffect(() => {
    const allQuestions: WYRQuestion[] = isPremium
      ? [...QUESTIONS_FREE, ...QUESTIONS_PREMIUM]
      : [...QUESTIONS_FREE];
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
  }, [isPremium]);

  const nextQuestion = useCallback(() => {
    if (questionIndex + 1 >= shuffledQuestions.length) {
      setPhase("finished");
    } else {
      setQuestionIndex((prev) => prev + 1);
    }
    isAnimatingNext.current = false;
  }, [questionIndex, shuffledQuestions.length]);

  const handleNextButton = useCallback(() => {
    if (isAnimatingNext.current) return;
    isAnimatingNext.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextQuestion();
  }, [nextQuestion]);

  const restartGame = useCallback(() => {
    const allQuestions: WYRQuestion[] = isPremium
      ? [...QUESTIONS_FREE, ...QUESTIONS_PREMIUM]
      : [...QUESTIONS_FREE];
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
    setQuestionIndex(0);
    setPhase("playing");
  }, [isPremium]);

  const goBack = useCallback(() => router.back(), []);

  // INTRO
  const renderIntro = () => (
    <GameIntro
      title={t('wouldYouRather.introTitle')}
      subtitle={t('wouldYouRather.introSubtitle')}
      buttonLabel={t('common.play')}
      emoji={require("@/assets/emojis/question.png")}
      videoSource={require("@/assets/games_preview/would_you_rather.mp4")}
      accentRgb="rgba(239,68,68,"
      accentColor={ACCENT}
      accentColorDark="#B91C1C"
      rules={[
        { emoji: require("@/assets/emojis/question.png"), text: t('wouldYouRather.rule1') },
        { emoji: require("@/assets/emojis/raising_hand.png"), text: t('wouldYouRather.rule2') },
        { emoji: require("@/assets/emojis/beer.png"), text: t('wouldYouRather.rule3') },
      ]}
      onPlay={() => {
        players.length >= 2 ? setPhase("playing") : setPhase("setup");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onBack={goBack}
    />
  );

  // SETUP
  const renderSetup = () => (
    <PlayerSetup
      minPlayers={2}
      maxPlayers={20}
      gameName={t('wouldYouRather.introTitle')}
      gameColor="#EF4444"
      onBack={goBack}
      onContinue={() => setPhase("playing")}
    />
  );

  // PLAYING
  const renderPlaying = () => {
    const currentQ = shuffledQuestions[questionIndex];
    const nextQ = shuffledQuestions[questionIndex + 1];

    return (
      <GestureHandlerRootView style={styles.phaseContainer}>
        <View
          style={[
            styles.playingContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={goBack} style={styles.backButton}>
              <ChevronLeftIcon size={24} color={Colors.text.primary} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('wouldYouRather.headerTitle')}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.cardsContainer}>
            {nextQ && (
              <SwipeCard
                key={`back-${questionIndex + 1}`}
                question={nextQ}
                onSwipe={() => {}}
                isTop={false}
                cardIndex={questionIndex + 1}
                cardKey={questionIndex + 1}
              />
            )}
            {currentQ && (
              <SwipeCard
                key={`top-${questionIndex}`}
                question={currentQ}
                onSwipe={nextQuestion}
                isTop={true}
                cardIndex={questionIndex}
                cardKey={questionIndex}
              />
            )}
          </View>

          <View style={styles.bottomArea}>
            <Text style={styles.counter}>
              {questionIndex + 1} / {shuffledQuestions.length}
            </Text>
            <Pressable onPress={handleNextButton}>
              <LinearGradient
                colors={[ACCENT, ACCENT_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>{t('common.next')}</Text>
                <ArrowRightIcon size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  };

  // FINISHED
  const renderFinished = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.phaseContainer}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={styles.finishedEmoji}>🎉</Text>
        <Text style={styles.finishedTitle}>{t('wouldYouRather.gameOver')}</Text>
        <Text style={styles.finishedSubtitle}>{t('wouldYouRather.noMoreQuestions')}</Text>
        <View style={styles.finishedButtons}>
          <Pressable onPress={restartGame} style={styles.restartButton}>
            <LinearGradient
              colors={[ACCENT, ACCENT_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
            >
              <Text style={styles.restartText}>{t('common.playAgain')}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={goBack}>
            <Text style={styles.exitText}>{t('common.exit')}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {phase === "intro" && renderIntro()}
      {phase === "setup" && renderSetup()}
      {phase === "playing" && renderPlaying()}
      {phase === "finished" && renderFinished()}
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

  // Cards
  cardsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 48,
    minHeight: 380,
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
  cardSticker: { width: 52, height: 52, marginBottom: 10, opacity: 0.95 },
  wyrLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 18,
    fontFamily: ROUNDED,
  },
  cardText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: -0.3,
    fontFamily: ROUNDED,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardTextSpecial: {
    paddingBottom: 12,
    textShadowColor: "rgba(0,0,0,0.12)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 16,
    width: "80%",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  orText: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
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
    marginBottom: 10,
  },
  specialGif: {
    width: 52,
    height: 52,
    opacity: 0.95,
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

  // Finished
  finishedEmoji: { fontSize: 64 },
  finishedTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    marginTop: 16,
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  finishedSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 8,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  finishedButtons: { marginTop: 48, gap: 16, width: "100%" },
  restartButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  restartText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },
  exitText: {
    fontSize: 15,
    color: Colors.text.muted,
    textAlign: "center",
    paddingVertical: 12,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
});

export default WouldYouRatherGame;
