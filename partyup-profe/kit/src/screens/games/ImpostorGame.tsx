/**
 * PREVIASPLUS - The Impostor
 * Vibrant cards, colorful reveals, eye-catching categories
 */

import { CategorySelector } from "@/src/components/games/CategorySelector";
import { GameIntro } from "@/src/components/games/GameIntro";
import { PlayerSetup } from "@/src/components/games/PlayerSetup";

import {
    Colors
} from "@/src/constants/theme";
import { useGameStore } from "@/src/store/gameStore";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import {
    ArrowPathIcon,
    ChevronLeftIcon
} from "react-native-heroicons/solid";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeInUp,
    ZoomIn,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const ROUNDED: string = Platform.OS === "ios" ? "System" : "sans-serif";
const ACCENT = "#EF4444";
const ACCENT_DARK = "#991B1B";

const CARD_HEIGHT = SCREEN_HEIGHT * 0.55;
const REVEAL_THRESHOLD = -100;

// ============================================
// PLAYER CARD COLORS
// ============================================
const PLAYER_CARD_COLORS: [string, string][] = [
  ["#EF4444", "#B91C1C"], // Red
  ["#3B82F6", "#2563EB"], // Blue
  ["#8B5CF6", "#7C3AED"], // Purple
  ["#EC4899", "#DB2777"], // Pink
  ["#F97316", "#EA580C"], // Orange
  ["#10B981", "#059669"], // Emerald
  ["#06B6D4", "#0891B2"], // Cyan
  ["#F59E0B", "#D97706"], // Amber
  ["#A855F7", "#9333EA"], // Violet
  ["#14B8A6", "#0D9488"], // Teal
  ["#6366F1", "#4F46E5"], // Indigo
  ["#E11D48", "#BE123C"], // Rose
];

// ============================================
// CATEGORIES
// ============================================

const IMPOSTOR_CATEGORIES = {
  General: {
    words: [
      "Pizza",
      "Sushi",
      "Burger",
      "Tacos",
      "Pasta",
      "Ice Cream",
      "Dog",
      "Cat",
      "Lion",
      "Beach",
      "Mountain",
      "Soccer",
      "Tennis",
      "Guitar",
      "Piano",
      "Car",
      "Airplane",
      "DJ",
      "Karaoke",
      "Beer Pong",
      "Shots",
      "Dance Floor",
      "Piñata",
      "Confetti",
      "Balloon",
      "Music",
      "Cocktail",
      "Toast",
      "Snacks",
      "Photo Booth",
      "Playlist",
      "Limbo",
    ],
    isPremium: false,
  },
  "Plus 🔥": {
    words: [
      "Tequila",
      "Vodka",
      "Club",
      "DJ",
      "Reggaeton",
      "Hangover",
      "Afterparty",
      "Party",
      "Kiss",
      "Crush",
      "Ex",
      "Tinder",
      "Dancing",
      "Drinking Game",
      "Cocktail",
      "Shot",
    ],
    isPremium: true,
  },
};

type GamePhase =
  | "intro"
  | "setup"
  | "category"
  | "reveal-loop"
  | "discussion"
  | "reveal-impostor";

// ============================================
// SLIDING CARD (follows finger)
// ============================================

interface SlideCardProps {
  playerName: string;
  playerSticker: any;
  word: string | null;
  onRevealed: () => void;
  cardKey: number;
}

function SlideCard({
  playerName,
  playerSticker,
  word,
  onRevealed,
  cardKey,
}: SlideCardProps) {
  const { t } = useTranslation();
  const translateY = useSharedValue(0);
  const revealed = useSharedValue(false);
  const [showButton, setShowButton] = useState(false);

  // Reset when player changes
  useEffect(() => {
    translateY.value = withTiming(0, { duration: 0 });
    revealed.value = false;
    setShowButton(false);
  }, [cardKey]);

  const showNextButton = useCallback(() => {
    setShowButton(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Allow free upward sliding (follow finger)
      translateY.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < REVEAL_THRESHOLD && !revealed.value) {
        // First threshold reach — show next button
        revealed.value = true;
        runOnJS(showNextButton)();
      }
      // Always ease back smoothly to initial position (subtle, no bounce)
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const hintOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, -50], [1, 0], "clamp"),
  }));

  const isImpostor = word === null;

  return (
    <GestureHandlerRootView style={styles.slideCardContainer}>
      {/* Hidden word below */}
      <View style={styles.wordContainer}>
        {isImpostor ? (
          <>
            <Text style={styles.impostorIcon}>🎭</Text>
            <Text style={styles.impostorText}>{t('impostor.youAreImpostor')}</Text>
            <Text style={styles.impostorSubtext}>
              {t('impostor.tryNotToBeDiscovered')}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.wordBadge}>
              <Text style={styles.wordLabel}>{t('impostor.yourWordIs')}</Text>
            </View>
            <Text style={styles.wordText}>{word}</Text>
          </>
        )}
      </View>

      {/* Sliding card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.slideCard, cardStyle]}>
          <LinearGradient
            colors={PLAYER_CARD_COLORS[cardKey % PLAYER_CARD_COLORS.length]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <Image
              source={playerSticker}
              style={styles.cardSticker}
              contentFit="contain"
            />
            <Text style={styles.cardPlayerName}>{playerName}</Text>

            <Animated.View style={[styles.cardHint, hintOpacity]}>
              <Text style={styles.cardHintArrow}>↑</Text>
              <Text style={styles.cardHintText}>{t('impostor.slideToSeeRole')}</Text>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>

      {/* Next button */}
      {showButton && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.nextContainer}
        >
          <NextButton onPress={onRevealed} />
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

// ============================================
// NEXT BUTTON — APPLE STYLE
// ============================================

interface NextButtonProps {
  onPress: () => void;
}

function NextButton({ onPress }: NextButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[animStyle]}>
        <LinearGradient
          colors={[ACCENT, ACCENT_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nextButton}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ImpostorGame() {
  const { t } = useTranslation();
  const { state, dispatch, showPremiumUpsell } = useGameStore();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [secretWord, setSecretWord] = useState("");
  const [impostorId, setImpostorId] = useState("");
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [usedWords, setUsedWords] = useState<string[]>([]);

  const players = state.players;
  const isPremium = state.isPremium;

  const getAvailableWords = useCallback(
    (category: string) => {
      const data =
        IMPOSTOR_CATEGORIES[category as keyof typeof IMPOSTOR_CATEGORIES];
      return data ? data.words.filter((w) => !usedWords.includes(w)) : [];
    },
    [usedWords],
  );

  const startNewRound = useCallback(
    (category: string) => {
      const words = getAvailableWords(category);
      if (words.length === 0) {
        showPremiumUpsell("No more words!");
        return;
      }
      const word = words[Math.floor(Math.random() * words.length)];
      const impostor = players[Math.floor(Math.random() * players.length)];
      setSecretWord(word);
      setImpostorId(impostor.id);
      setUsedWords((prev) => [...prev, word]);
      setCurrentRevealIndex(0);
      setPhase("reveal-loop");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [players, getAvailableWords, showPremiumUpsell],
  );

  const nextReveal = useCallback(() => {
    if (currentRevealIndex + 1 >= players.length) {
      setPhase("discussion");
    } else {
      setCurrentRevealIndex((prev) => prev + 1);
    }
  }, [currentRevealIndex, players.length]);

  const goBack = useCallback(() => router.back(), []);

  // INTRO
  const renderIntro = () => (
    <GameIntro
      title={t('impostor.introTitle')}
      subtitle={t('impostor.introSubtitle')}
      emoji={require("@/assets/emojis/impostor.png")}
      videoSource={require("@/assets/games_preview/impostor.mp4")}
      accentRgb="rgba(239,68,68,"
      accentColor={ACCENT}
      accentColorDark="#B91C1C"
      rules={[
        { emoji: require("@/assets/emojis/impostor.png"), text: t('impostor.rule1') },
        { emoji: require("@/assets/emojis/speech_balloon.png"), text: t('impostor.rule2') },
        { emoji: require("@/assets/emojis/question.png"), text: t('impostor.rule3') },
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
      maxPlayers={12}
      gameName={t('impostor.introTitle')}
      gameColor="#EF4444"
      onBack={goBack}
      onContinue={() => setPhase("category")}
    />
  );

  // CATEGORY — grid layout with premium banner
  const CATEGORY_OPTIONS = [
    { id: "General", label: t('impostor.general'), emoji: "🎲", colors: ["#3B82F6", "#6366F1"] as [string, string], isPremium: false },
    { id: "Plus 🔥", label: t('impostor.plusFire'), emoji: "🔥", colors: ["#EF4444", "#EC4899"] as [string, string], isPremium: true },
  ];

  const renderCategory = () => (
    <CategorySelector
      title={t('impostor.category')}
      categories={CATEGORY_OPTIONS}
      isPremium={isPremium}
      onSelect={(catId) => startNewRound(catId)}
      onBack={goBack}
      onPremiumUpsell={showPremiumUpsell}
    />
  );

  // REVEAL LOOP
  const renderRevealLoop = () => {
    const currentPlayer = players[currentRevealIndex];
    const isImpostor = currentPlayer.id === impostorId;
    return (
      <View
        style={[
          styles.phaseContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Pressable
          onPress={goBack}
          style={[styles.backButtonAbsolute, { top: insets.top + 10 }]}
        >
          <ChevronLeftIcon size={24} color={Colors.text.secondary} />
        </Pressable>
        <SlideCard
          playerName={currentPlayer.name}
          playerSticker={currentPlayer.sticker}
          word={isImpostor ? null : secretWord}
          onRevealed={nextReveal}
          cardKey={currentRevealIndex}
        />
      </View>
    );
  };

  // DISCUSSION
  const renderDiscussion = () => (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.phaseContainer}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.discussionCenter}>
          <Text style={styles.discussionEmoji}>💬</Text>
          <Text style={styles.discussionTitle}>{t('impostor.letsPlay')}</Text>
          <Text style={styles.discussionSubtitle}>
            {t('impostor.byTurnsSayRelatedWord')}
          </Text>
        </View>
        <View style={styles.discussionButtons}>
          <Pressable
            onPress={() => setPhase("reveal-impostor")}
            style={styles.revealButton}
          >
            <LinearGradient
              colors={[ACCENT, "#B91C1C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 17,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text style={styles.revealButtonText}>{t('impostor.revealImpostor')}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  // REVEAL IMPOSTOR — with smooth staggered animations
  const renderRevealImpostor = () => {
    const impostor = players.find((p) => p.id === impostorId);
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
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
          <Animated.Text
            entering={FadeInUp.delay(100).duration(500).springify()}
            style={styles.revealTitle}
          >
            {t('impostor.impostorWas')}
          </Animated.Text>
          {impostor && (
            <Animated.View
              entering={ZoomIn.delay(400).duration(500).springify()}
              style={styles.impostorRevealCard}
            >
              <Image
                source={impostor.sticker}
                style={styles.impostorSticker}
                contentFit="contain"
              />
              <Animated.Text
                entering={FadeInDown.delay(700).duration(400).springify()}
                style={styles.impostorName}
              >
                {impostor.name}
              </Animated.Text>
            </Animated.View>
          )}
          <Animated.Text
            entering={FadeInDown.delay(900).duration(400)}
            style={styles.wordRevealText}
          >
            {t('impostor.theWord')} {secretWord}
          </Animated.Text>
          <Animated.View
            entering={FadeInDown.delay(1100).duration(400).springify()}
            style={styles.endButtons}
          >
            <Pressable
              onPress={() => setPhase("category")}
              style={styles.playAgainButton}
            >
              <LinearGradient
                colors={[ACCENT, "#B91C1C"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  paddingVertical: 17,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                }}
              >
                <ArrowPathIcon size={20} color="#fff" />
                <Text style={styles.playAgainText}>{t('impostor.anotherRound')}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={goBack}>
              <Text style={styles.exitText}>Exit</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {phase === "intro" && renderIntro()}
      {phase === "setup" && renderSetup()}
      {phase === "category" && renderCategory()}
      {phase === "reveal-loop" && renderRevealLoop()}
      {phase === "discussion" && renderDiscussion()}
      {phase === "reveal-impostor" && renderRevealImpostor()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  phaseContainer: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(120,120,128,0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonAbsolute: {
    position: "absolute",
    left: 20,
    zIndex: 10,
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
    marginBottom: 32,
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

  // Category — Vibrante
  categoryList: { flex: 1, justifyContent: "center", gap: 16 },
  categoryButton: {
    borderRadius: 24,
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
  categoryLocked: { opacity: 0.6 },
  categoryGradient: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 24,
  },
  categoryEmoji: { fontSize: 36 },
  categoryName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    flex: 1,
    fontFamily: ROUNDED,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lockBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },

  // Slide Card — Vibrante
  slideCardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
  wordContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: CARD_HEIGHT * 0.30,
    paddingHorizontal: 40,
  },
  wordBadge: {
    backgroundColor: "rgba(120,120,128,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  wordLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: "600",
  },
  wordText: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  impostorIcon: { fontSize: 56 },
  impostorText: {
    fontSize: 28,
    fontWeight: "800",
    color: ACCENT,
    marginTop: 16,
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },
  impostorSubtext: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 8,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },

  slideCard: {
    width: SCREEN_WIDTH - 48,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
      },
      android: { elevation: 18 },
    }),
  },
  cardGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cardSticker: { width: 100, height: 100, marginBottom: 20 },
  cardPlayerName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  cardHint: { position: "absolute", bottom: 40, alignItems: "center" },
  cardHintArrow: {
    fontSize: 28,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
  },
  cardHintText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    fontFamily: ROUNDED,
    fontWeight: "500",
  },

  nextContainer: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    paddingHorizontal: 24,
  },
  nextButton: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },

  // Discussion
  discussionCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  discussionEmoji: { fontSize: 64 },
  discussionTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    marginTop: 16,
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  discussionSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: "center",
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  discussionButtons: { gap: 12 },
  revealButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  revealButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },

  // Reveal
  revealTitle: {
    fontSize: 20,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  impostorRevealCard: { alignItems: "center", marginTop: 24 },
  impostorSticker: { width: 100, height: 100 },
  impostorName: {
    fontSize: 28,
    fontWeight: "800",
    color: ACCENT,
    marginTop: 16,
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },
  wordRevealText: {
    fontSize: 15,
    color: Colors.text.muted,
    marginTop: 24,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  endButtons: { marginTop: 48, gap: 16, width: "100%" },
  playAgainButton: {
    flexDirection: "row",
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  playAgainText: {
    fontSize: 17,
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

export default ImpostorGame;
