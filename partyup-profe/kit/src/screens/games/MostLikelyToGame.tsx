/**
 * PREVIASPLUS - Quién Es Más Probable
 * Cartas vibrantes con degradados, animaciones smooth, cartas especiales
 */

import { CategorySelector } from "@/src/components/games/CategorySelector";
import { GameIntro } from "@/src/components/games/GameIntro";
import { PlayerSetup } from "@/src/components/games/PlayerSetup";

import { Colors } from "@/src/constants/theme";
import { useGameStore } from "@/src/store/gameStore";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MeshGradientView } from "expo-mesh-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
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
const ACCENT = "#F97316";
const ACCENT_DARK = "#EA580C";

// ============================================
// COLORES VIBRANTES PARA CARTAS
// ============================================
const CARD_GRADIENT_SETS: [string, string][] = [
  ["#F97316", "#EA580C"], // Orange
  ["#3B82F6", "#2563EB"], // Blue
  ["#EC4899", "#DB2777"], // Pink
  ["#8B5CF6", "#7C3AED"], // Purple
  ["#10B981", "#059669"], // Emerald
  ["#EF4444", "#DC2626"], // Red
  ["#06B6D4", "#0891B2"], // Cyan
  ["#F59E0B", "#D97706"], // Amber
  ["#A855F7", "#9333EA"], // Violet
  ["#14B8A6", "#0D9488"], // Teal
];

const SPECIAL_CARD_INTERVAL = 5;

const CARD_EMOJIS = [
  require("@/assets/emojis/raising_hand.png"),
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
// PREGUNTAS POR CATEGORÍA
// ============================================

const QUESTIONS_CHILL = [
  "Who is most likely to fall asleep at the party?",
  "Who is most likely to end up crying from laughter?",
  "Who is most likely to be late everywhere?",
  "Who is most likely to become friends with a stranger?",
  "Who is most likely to trip in public?",
  "Who is most likely to run out of battery?",
  "Who is most likely to share their food with everyone?",
  "Who is most likely to cry while watching a movie?",
  "Who is most likely to become an influencer?",
  "Who is most likely to survive a zombie apocalypse?",
];

const QUESTIONS_PARTY = [
  "Who is most likely to end up dancing on the table?",
  "Who is most likely to lose their phone tonight?",
  "Who is most likely to buy shots for everyone?",
  "Who is most likely to say something embarrassing?",
  "Who is most likely to text their ex?",
  "Who is most likely to be the life of the party?",
  "Who is most likely to throw up first?",
  "Who is most likely to end up singing karaoke?",
  "Who is most likely to regret something tomorrow?",
  "Who is most likely to spend all their money in one night?",
];

const QUESTIONS_HOT = [
  "Who is most likely to kiss someone tonight?",
  "Who is most likely to have a one-night stand?",
  "Who is most likely to stalk their crush?",
  "Who is most likely to do something they won't remember?",
  "Who is most likely to end up in someone's bed?",
  "Who is most likely to do a striptease?",
  "Who is most likely to confess their love to someone?",
  "Who is most likely to be the hottest in the group?",
  "Who is most likely to hook up with two people the same night?",
  "Who is most likely to accidentally send a nude?",
  "Who is most likely to have a threesome?",
  "Who is most likely to lie about who they were with last night?",
  "Who is most likely to fall in love with someone in the group?",
  "Who is most likely to be the best kisser?",
  "Who is most likely to make the first move?",
];

const QUESTIONS_BY_CATEGORY: Record<string, string[]> = {
  chill: QUESTIONS_CHILL,
  party: QUESTIONS_PARTY,
  hot: QUESTIONS_HOT,
};

type GamePhase = "intro" | "setup" | "category" | "playing" | "finished";

// ============================================
// MESH GRADIENT ANIMATION (special cards)
// ============================================
const MESH_COLS = 3;
const MESH_ROWS = 3;

function useSpecialCardMesh() {
  const meshColors = useMemo(
    () => [
      "#FF6B6B",
      "#A855F7",
      "#F97316",
      "#A855F7",
      "#EC4899",
      "#FF6B6B",
      "#F97316",
      "#FF6B6B",
      "#A855F7",
    ],
    [],
  );

  const meshPoints = useMemo(
    () =>
      [
        [0.0, 0.0],
        [0.5, 0.0],
        [1.0, 0.0],
        [0.0, 0.5],
        [0.5, 0.5],
        [1.0, 0.5],
        [0.0, 1.0],
        [0.5, 1.0],
        [1.0, 1.0],
      ] as [number, number][],
    [],
  );

  return { meshColors, meshPoints };
}

// ============================================
// CARTA SWIPEABLE CON COLORES VIBRANTES
// ============================================

interface SwipeCardProps {
  question: string;
  onSwipe: () => void;
  isTop: boolean;
  cardIndex: number;
  cardKey: number;
}

function SwipeCard({
  question,
  onSwipe,
  isTop,
  cardIndex,
  cardKey,
}: SwipeCardProps) {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const enterScale = useSharedValue(isTop ? 1 : 0.92);
  const enterOpacity = useSharedValue(isTop ? 1 : 0.7);
  const enterTranslateY = useSharedValue(isTop ? 0 : 20);

  const isSpecial = cardIndex > 0 && cardIndex % SPECIAL_CARD_INTERVAL === 0;
  const gradientColors =
    CARD_GRADIENT_SETS[cardIndex % CARD_GRADIENT_SETS.length];
  const cardEmoji = useMemo(
    () => CARD_EMOJIS[cardIndex % CARD_EMOJIS.length],
    [cardIndex],
  );
  const specialGif = useMemo(
    () =>
      isSpecial
        ? SPECIAL_GIFS[
            Math.floor(cardIndex / SPECIAL_CARD_INTERVAL) % SPECIAL_GIFS.length
          ]
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
      // Smooth Apple-style entrance: card rises from behind
      enterScale.value = 0.92;
      enterOpacity.value = 0.7;
      enterTranslateY.value = 16;
      enterScale.value = withSpring(1, {
        damping: 18,
        stiffness: 280,
        mass: 0.5,
      });
      enterOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
      enterTranslateY.value = withSpring(0, {
        damping: 18,
        stiffness: 280,
        mass: 0.5,
      });
    } else {
      // Back card sits behind, ready to come forward
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
        -1,
        true,
      );
      floatRotate.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      bgCycle.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
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
          duration: 150,
          easing: Easing.out(Easing.cubic),
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
      [
        "rgba(168,85,247,0.25)",
        "rgba(236,72,153,0.35)",
        "rgba(168,85,247,0.25)",
      ],
    );
    return { backgroundColor: bg };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.card, cardStyle, !isTop && styles.cardBack]}
      >
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
              <Animated.View
                style={[StyleSheet.absoluteFill, animatedBgStyle]}
              />
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
          <Image
            source={cardEmoji}
            style={styles.cardSticker}
            contentFit="contain"
          />
        )}

        {/* GIF centered where sticker was */}
        {isSpecial && specialGif && (
          <Animated.View style={[styles.specialGifWrap, stickerFloatStyle]}>
            <Image
              source={specialGif}
              style={styles.specialGif}
              contentFit="contain"
            />
          </Animated.View>
        )}

        <Text style={[styles.cardText, isSpecial && styles.cardTextSpecial]}>
          {question}
        </Text>
        {isTop && <Text style={styles.swipeHint}>{t('mostLikelyTo.swipeToContinue')}</Text>}
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function MostLikelyToGame() {
  const { state, dispatch, showPremiumUpsell } = useGameStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [selectedCategory, setSelectedCategory] = useState<string>("chill");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<string[]>([]);

  const players = state.players;
  const isPremium = state.isPremium;

  const buildDeck = useCallback((catId: string) => {
    const questions = QUESTIONS_BY_CATEGORY[catId] || QUESTIONS_CHILL;
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
    setQuestionIndex(0);
  }, []);

  const nextQuestion = useCallback(() => {
    if (questionIndex + 1 >= shuffledQuestions.length) {
      setPhase("finished");
    } else {
      setQuestionIndex((prev) => prev + 1);
    }
  }, [questionIndex, shuffledQuestions.length]);

  const restartGame = useCallback(() => {
    buildDeck(selectedCategory);
    setPhase("playing");
  }, [selectedCategory, buildDeck]);

  const goBack = useCallback(() => router.back(), []);

  const CATEGORY_OPTIONS = [
    { id: "chill", label: t('categories.chill'), emoji: "😎", colors: ["#3B82F6", "#6366F1"] as [string, string], isPremium: false },
    { id: "party", label: t('categories.party'), emoji: "🎉", colors: ["#F97316", "#EF4444"] as [string, string], isPremium: false },
    { id: "hot", label: t('categories.hot'), emoji: "🔥", colors: ["#EF4444", "#EC4899"] as [string, string], isPremium: true },
  ];

  // INTRO
  const renderIntro = () => (
    <GameIntro
      title={t('mostLikelyTo.introTitle')}
      subtitle={t('mostLikelyTo.introSubtitle')}
      emoji={require("@/assets/emojis/raising_hand.png")}
      videoSource={require("@/assets/games_preview/who_is_most_likely.mp4")}
      accentRgb="rgba(249,115,22,"
      accentColor={ACCENT}
      accentColorDark="#C2410C"
      rules={[
        { emoji: require("@/assets/emojis/speech_balloon.png"), text: t('mostLikelyTo.rule1') },
        { emoji: require("@/assets/emojis/raising_hand.png"), text: t('mostLikelyTo.rule2') },
        { emoji: require("@/assets/emojis/beer.png"), text: t('mostLikelyTo.rule3') },
      ]}
      buttonLabel={t('common.play')}
      onPlay={() => {
        players.length >= 3 ? setPhase("category") : setPhase("setup");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onBack={goBack}
    />
  );

  // SETUP
  const renderSetup = () => (
    <PlayerSetup
      minPlayers={3}
      maxPlayers={20}
      gameName={t('mostLikelyTo.introTitle')}
      gameColor="#F97316"
      onBack={goBack}
      onContinue={() => setPhase("category")}
    />
  );

  // CATEGORY
  const renderCategory = () => (
    <CategorySelector
      title={t('common.pickCategory')}
      categories={CATEGORY_OPTIONS}
      isPremium={isPremium}
      onSelect={(catId) => {
        setSelectedCategory(catId);
        buildDeck(catId);
        setPhase("playing");
      }}
      onBack={goBack}
      onPremiumUpsell={showPremiumUpsell}
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
            <Text style={styles.headerTitle}>{t('mostLikelyTo.headerTitle')}</Text>
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
            <Pressable onPress={nextQuestion} style={styles.nextButton}>
              <LinearGradient
                colors={[ACCENT, ACCENT_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  paddingVertical: 14,
                  paddingHorizontal: 28,
                  borderRadius: 16,
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
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
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.phaseContainer}
    >
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
        <Text style={styles.finishedTitle}>{t('mostLikelyTo.gameOver')}</Text>
        <Text style={styles.finishedSubtitle}>{t('mostLikelyTo.noMoreQuestions')}</Text>
        <View style={styles.finishedButtons}>
          <Pressable onPress={restartGame} style={styles.restartButton}>
            <LinearGradient
              colors={[ACCENT, ACCENT_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
              }}
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
      {phase === "category" && renderCategory()}
      {phase === "playing" && renderPlaying()}
      {phase === "finished" && renderFinished()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  phaseContainer: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  playingContent: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: Colors.background.primary,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(120,120,128,0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },

  // Intro — La Oca style
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

  // Cards — Vibrantes
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
  cardBack: {
    zIndex: 0,
  },
  cardSticker: { width: 64, height: 64, marginBottom: 16, opacity: 0.95 },
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
    marginBottom: 16,
  },
  specialGif: {
    width: 64,
    height: 64,
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
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    gap: 8,
    overflow: "hidden",
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

export default MostLikelyToGame;
