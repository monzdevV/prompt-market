/**
 * PARTYUP - Challenge Reveal Screen
 * Slide card reveal pattern (same as ImpostorGame) for party challenges.
 * User swipes card up to reveal the challenge question, then responds.
 */

import { Colors, Spacing } from "@/src/constants/theme";
import {
  submitCheckResponse,
  submitImageResponse,
} from "@/src/services/challengeService";
import { useApp } from "@/src/store";
import { ChallengeType } from "@/src/types";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ChevronLeftIcon } from "react-native-heroicons/solid";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ROUNDED: string = Platform.OS === "ios" ? "System" : "sans-serif";

const CARD_HEIGHT = SCREEN_HEIGHT * 0.55;
const REVEAL_THRESHOLD = -100;

// ============================================
// CHALLENGE TYPE CONFIG
// ============================================

const CHALLENGE_GRADIENTS: Record<ChallengeType, [string, string]> = {
  image: ["#F97316", "#EA580C"],
  note: ["#8B5CF6", "#6D28D9"],
  check: ["#10B981", "#059669"],
};

const CHALLENGE_STICKERS: Record<ChallengeType, number> = {
  image: require("@/assets/emojis/fire.png"),
  note: require("@/assets/emojis/speech_balloon.png"),
  check: require("@/assets/emojis/partying_face.png"),
};

// ============================================
// SLIDE CARD (follows finger, identical pattern to ImpostorGame)
// ============================================

interface SlideCardProps {
  challengeType: ChallengeType;
  questionText: string;
  onRevealed: () => void;
  isRevealed: boolean;
}

function SlideCard({ challengeType, questionText, onRevealed, isRevealed }: SlideCardProps) {
  const { t } = useTranslation();
  const translateY = useSharedValue(0);
  const revealed = useSharedValue(false);

  const triggerReveal = useCallback(() => {
    onRevealed();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onRevealed]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < REVEAL_THRESHOLD && !revealed.value) {
        revealed.value = true;
        runOnJS(triggerReveal)();
      }
      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const hintOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, -50], [1, 0], "clamp"),
  }));

  return (
    <GestureHandlerRootView style={styles.slideCardContainer}>
      {/* Hidden question below the card */}
      <View style={styles.questionContainer}>
        <View style={styles.questionBadge}>
          <Text style={styles.questionLabel}>
            {t("challenges.challengeTitle")}
          </Text>
        </View>
        <Text style={styles.questionText}>{questionText}</Text>
      </View>

      {/* Sliding card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.slideCard, cardStyle]}>
          <LinearGradient
            colors={CHALLENGE_GRADIENTS[challengeType]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <Image
              source={CHALLENGE_STICKERS[challengeType]}
              style={styles.cardSticker}
              contentFit="contain"
            />
            <Text style={styles.cardTitle}>
              {t("challenges.challengeTitle")}
            </Text>

            <Animated.View style={[styles.cardHint, hintOpacity]}>
              <Text style={styles.cardHintArrow}>↑</Text>
              <Text style={styles.cardHintText}>
                {t("challenges.slideToReveal")}
              </Text>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

// ============================================
// ACTION BUTTON (same press scale as ImpostorGame NextButton)
// ============================================

interface ActionButtonProps {
  label: string;
  gradientColors: [string, string];
  onPress: () => void;
  loading?: boolean;
}

function ActionButton({ label, gradientColors, onPress, loading }: ActionButtonProps) {
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
      disabled={loading}
    >
      <Animated.View style={animStyle}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionButton}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>{label}</Text>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// POOP BACKGROUND BUTTON (tiled poop stickers)
// ============================================

const POOP_STICKER = require("@/assets/emojis/poop.png");
const POOP_GRID_COLS = 8;
const POOP_GRID_ROWS = 3;

interface PoopButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

function PoopButton({ label, onPress, loading }: PoopButtonProps) {
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

  const poopRotations = [-20, 15, -30, 25, -10, 35, -25, 20, 30, -15, 10, -35, 22, -28, 18, -12, 32, -22, 14, -18, 26, -8, 38, -32];

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={loading}
    >
      <Animated.View style={animStyle}>
        <View style={styles.poopButton}>
          {/* Tiled poop background */}
          <View style={styles.poopTileGrid} pointerEvents="none">
            {Array.from({ length: POOP_GRID_COLS * POOP_GRID_ROWS }).map((_, i) => {
              const col = i % POOP_GRID_COLS;
              const row = Math.floor(i / POOP_GRID_COLS);
              const rotation = poopRotations[i % poopRotations.length];
              return (
                <Image
                  key={i}
                  source={POOP_STICKER}
                  style={[
                    styles.poopTile,
                    {
                      left: `${(col / POOP_GRID_COLS) * 100}%`,
                      top: `${(row / POOP_GRID_ROWS) * 100}%`,
                      width: `${100 / POOP_GRID_COLS}%`,
                      height: `${100 / POOP_GRID_ROWS}%`,
                      transform: [{ rotate: `${rotation}deg` }],
                    },
                  ]}
                  contentFit="contain"
                />
              );
            })}
          </View>
          {/* Dark overlay for readability */}
          <View style={styles.poopOverlay} pointerEvents="none" />
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>{label}</Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChallengeRevealScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const insets = useSafeAreaInsets();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();

  const [isRevealed, setIsRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const challenge = state.partyChallenges.find((c) => c.id === challengeId);
  const partyId = state.currentParty?.id;

  const goBack = useCallback(() => router.back(), []);

  /** Returns true if the challenge has expired (blocks submission). */
  const isChallengeExpired = useCallback((): boolean => {
    if (!challenge) return true;
    if (challenge.isExpired || new Date(challenge.expiresAt).getTime() <= Date.now()) {
      Alert.alert(t("challenges.expiredTitle"), t("challenges.expiredMessage"), [
        { text: t("common.ok"), onPress: goBack },
      ]);
      return true;
    }
    return false;
  }, [challenge, goBack, t]);

  const handleRevealed = useCallback(() => {
    setIsRevealed(true);
  }, []);

  // Handle successful submission
  const handleSuccess = useCallback(
    (response: import("@/src/types").ChallengeResponse) => {
      dispatch({ type: "ADD_CHALLENGE_RESPONSE", payload: response });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    [dispatch],
  );

  // Submit image response via camera
  const handleCamera = useCallback(async () => {
    if (!challenge || !partyId || isChallengeExpired()) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(t("challenges.submissionFailed"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setSubmitting(true);
      setError(null);
      const response = await submitImageResponse(
        challenge.id,
        partyId,
        result.assets[0].uri,
      );
      handleSuccess(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("challenges.submissionFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [challenge, partyId, handleSuccess, isChallengeExpired, t]);

  // Submit image response via gallery
  const handleGallery = useCallback(async () => {
    if (!challenge || !partyId || isChallengeExpired()) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t("challenges.submissionFailed"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setSubmitting(true);
      setError(null);
      const response = await submitImageResponse(
        challenge.id,
        partyId,
        result.assets[0].uri,
      );
      handleSuccess(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("challenges.submissionFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [challenge, partyId, handleSuccess, isChallengeExpired, t]);

  // Navigate to note editor for note challenge response
  const handleWriteNote = useCallback(() => {
    if (!challenge || !partyId || isChallengeExpired()) return;
    router.push({
      pathname: '/note-editor',
      params: { partyId, challengeId: challenge.id },
    } as any);
  }, [challenge, partyId, isChallengeExpired]);

  // Submit check response (done or not done)
  const handleCheckSubmit = useCallback(async (completed: boolean) => {
    if (!challenge || isChallengeExpired()) return;
    try {
      setSubmitting(true);
      setError(null);
      const response = await submitCheckResponse(challenge.id, completed);
      handleSuccess(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("challenges.submissionFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [challenge, handleSuccess, isChallengeExpired, t]);

  // Error state: challenge not found
  if (!challenge) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorCenter}>
          <Text style={styles.errorText}>
            {t("challenges.challengeNotFound")}
          </Text>
          <Pressable onPress={goBack} style={styles.errorBackButton}>
            <Text style={styles.errorBackText}>
              {t("common.back")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Render action area based on challenge type
  const renderActions = () => {
    switch (challenge.type) {
      case "image":
        return (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.imageActions}>
            <ActionButton
              label={t("challenges.takeAPhoto")}
              gradientColors={CHALLENGE_GRADIENTS.image}
              onPress={handleCamera}
              loading={submitting}
            />
            <ActionButton
              label={t("challenges.chooseFromGallery")}
              gradientColors={["#F59E0B", "#D97706"]}
              onPress={handleGallery}
              loading={submitting}
            />
          </Animated.View>
        );

      case "note":
        return (
          <Animated.View entering={FadeInDown.duration(300)}>
            <ActionButton
              label={t("challenges.writeNote")}
              gradientColors={CHALLENGE_GRADIENTS.note}
              onPress={handleWriteNote}
              loading={false}
            />
          </Animated.View>
        );

      case "check":
        return (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.checkActions}>
            <View style={styles.checkButtonRow}>
              <ActionButton
                label={t("challenges.markAsDone")}
                gradientColors={CHALLENGE_GRADIENTS.check}
                onPress={() => handleCheckSubmit(true)}
                loading={submitting}
              />
            </View>
            <View style={styles.checkButtonRow}>
              <PoopButton
                label={t("challenges.markAsNotDone")}
                onPress={() => handleCheckSubmit(false)}
                loading={submitting}
              />
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Back button */}
      <Pressable
        onPress={goBack}
        style={[styles.backButtonAbsolute, { top: insets.top + 10 }]}
      >
        <ChevronLeftIcon size={24} color={Colors.text.secondary} />
      </Pressable>

      {/* Slide card with reveal */}
      <SlideCard
        challengeType={challenge.type}
        questionText={challenge.question}
        onRevealed={handleRevealed}
        isRevealed={isRevealed}
      />

      {/* Action area (only visible after card reveal) */}
      {isRevealed && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.actionAreaContainer}
        >
          {error && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <Text style={styles.errorMessage}>{error}</Text>
            </Animated.View>
          )}
          {renderActions()}
        </Animated.View>
      )}
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

  // Back button (glassmorphic blur style)
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

  // Slide card container
  slideCardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },

  // Hidden question below the card
  questionContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: CARD_HEIGHT * 0.3,
    paddingHorizontal: 40,
  },
  questionBadge: {
    backgroundColor: "rgba(120,120,128,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  questionLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },

  // Sliding card
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
  cardSticker: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  cardHint: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
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

  // Action area positioned at bottom
  actionAreaContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },

  // Action button
  actionButton: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },

  // Image type actions
  imageActions: {
    gap: Spacing.md,
  },

  // Check type actions
  checkActions: {
    gap: Spacing.md,
  },
  checkButtonRow: {},

  // Poop button
  poopButton: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3F3F46",
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  poopTileGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  poopTile: {
    position: "absolute",
    opacity: 0.35,
    padding: 3,
  },
  poopOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  // Error state
  errorCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    textAlign: "center",
    marginBottom: 20,
  },
  errorBackButton: {
    backgroundColor: "rgba(120,120,128,0.24)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  errorBackText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    fontFamily: ROUNDED,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.text.error,
    fontFamily: ROUNDED,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
});
