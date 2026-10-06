/**
 * PARTYUP Join Party Screen
 * ================================
 * Full-screen code input with animated Skia background.
 * Layout mirrors CreatePartyScreen: content pinned top,
 * join button at the bottom with fire particles when code is complete.
 */

import { ContinuousFireEmitter } from "@/src/components/ui/FireParticles";
import { BorderRadius } from "@/src/constants/theme";
import { joinPartyByCode } from "@/src/services/partyService";
import { useApp } from "@/src/store";
import { Ionicons } from "@expo/vector-icons";
import {
  Blur,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CODE_LENGTH = 6;
const BUTTON_HORIZONTAL_PADDING = 48;

const GLASS_BORDER_COLOR = "rgba(255, 255, 255, 0.15)";

const PARTY_GIFS = [
  require("@/assets/gifs/Dance Party Sticker.gif"),
  require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
  require("@/assets/gifs/Celebrate Happy Birthday Sticker by Originals.gif"),
];

// ============================================
// ANIMATED BACKGROUND
// ============================================
function AnimatedGradientBackground() {
  const anim1 = useSharedValue(0);
  const anim2 = useSharedValue(0);

  useEffect(() => {
    anim1.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    anim2.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <RoundedRect
        x={0}
        y={0}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        r={0}
      >
        <LinearGradient
          start={vec(0, 0)}
          end={vec(SCREEN_WIDTH, SCREEN_HEIGHT)}
          colors={["#000000", "#0a0a0f", "#000000"]}
        />
      </RoundedRect>

      <Group blendMode="screen" opacity={0.15}>
        <Circle
          cx={SCREEN_WIDTH * 0.2}
          cy={SCREEN_HEIGHT * 0.3}
          r={200}
          color="#3B82F6"
        />
        <Blur blur={80} />
      </Group>

      <Group blendMode="screen" opacity={0.12}>
        <Circle
          cx={SCREEN_WIDTH * 0.8}
          cy={SCREEN_HEIGHT * 0.6}
          r={180}
          color="#A855F7"
        />
        <Blur blur={90} />
      </Group>

      <Group blendMode="screen" opacity={0.1}>
        <Circle
          cx={SCREEN_WIDTH * 0.5}
          cy={SCREEN_HEIGHT * 0.85}
          r={150}
          color="#BFFF00"
        />
        <Blur blur={70} />
      </Group>
    </Canvas>
  );
}

// ============================================
// CODE INPUT CELL
// ============================================
function CodeInputCell({
  char,
  isFilled,
  isActive,
}: {
  char: string;
  isFilled: boolean;
  isActive: boolean;
}) {
  const scale = useSharedValue(1);
  const charOpacity = useSharedValue(isFilled ? 1 : 0);
  const charTranslateY = useSharedValue(isFilled ? 0 : 8);
  const borderOpacity = useSharedValue(isFilled ? 0.5 : 0.08);
  const cursorOpacity = useSharedValue(0);
  const hasAnimated = useRef(false);

  // Character fill/unfill animation (skip initial mount)
  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      return;
    }

    if (isFilled) {
      scale.value = withSequence(
        withTiming(0.95, { duration: 50, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 12, stiffness: 350 }),
      );
      charOpacity.value = withTiming(1, {
        duration: 150,
        easing: Easing.out(Easing.quad),
      });
      charTranslateY.value = withSpring(0, { damping: 14, stiffness: 300 });
      cursorOpacity.value = withTiming(0, { duration: 100 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      charOpacity.value = withTiming(0, { duration: 100 });
      charTranslateY.value = 8;
    }
  }, [isFilled, char]);

  // Blinking cursor for the active cell (only when focused)
  useEffect(() => {
    if (isActive && !isFilled) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cursorOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [isActive, isFilled]);

  // Border pulse for active cell (only when focused)
  useEffect(() => {
    if (isActive && !isFilled) {
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(0.35, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.15, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
    } else if (isFilled) {
      borderOpacity.value = withTiming(0.5, { duration: 200 });
    } else {
      borderOpacity.value = withTiming(0.08, { duration: 200 });
    }
  }, [isActive, isFilled]);

  const cellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: isFilled
      ? `rgba(191, 255, 0, ${borderOpacity.value})`
      : `rgba(255, 255, 255, ${borderOpacity.value})`,
    backgroundColor: isFilled
      ? "rgba(191, 255, 0, 0.08)"
      : "rgba(255, 255, 255, 0.04)",
  }));

  const charAnimatedStyle = useAnimatedStyle(() => ({
    opacity: charOpacity.value,
    transform: [{ translateY: charTranslateY.value }],
  }));

  const cursorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <Animated.View style={[styles.codeCell, cellAnimatedStyle]}>
      <View style={styles.codeCellInner}>
        {isActive && !isFilled ? (
          <Animated.View style={[styles.cursor, cursorAnimatedStyle]} />
        ) : (
          <Animated.Text
            style={[
              styles.codeCellChar,
              isFilled && styles.codeCellCharFilled,
              charAnimatedStyle,
            ]}
          >
            {char}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function JoinPartyScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isJoiningRef = useRef(false);

  // Prevent access if user is already in an active party
  useEffect(() => {
    if (state.currentParty) {
      Alert.alert(
        t('joinParty.activePartyTitle'),
        t('joinParty.activePartyMessage'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    }
  }, []);

  const shakeX = useSharedValue(0);

  const isCodeComplete = code.length === CODE_LENGTH;

  const [currentGif] = useState(
    () => PARTY_GIFS[Math.floor(Math.random() * PARTY_GIFS.length)],
  );

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(15, { duration: 50 }),
      withTiming(-15, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-12, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleCodeChange = (text: string) => {
    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (formatted.length <= CODE_LENGTH) {
      setCode(formatted);
      setError(null);
    }
  };

  const handleJoin = async () => {
    if (isJoiningRef.current) return;

    if (code.length !== CODE_LENGTH) {
      setError(t('joinParty.codeLengthError'));
      triggerShake();
      return;
    }

    isJoiningRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const party = await joinPartyByCode(code);

      dispatch({ type: "SET_CURRENT_PARTY", payload: party });
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.dismiss();
      }, 500);
    } catch (err) {
      console.error("[JoinParty] Error:", err);
      const message =
        err instanceof Error ? err.message : t('joinParty.couldNotJoin');
      setError(message);
      triggerShake();
      isJoiningRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedGradientBackground />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              {/* Header */}
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.header}
              >
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                >
                  <BlurView
                    intensity={30}
                    tint="dark"
                    style={styles.backButtonBlur}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color="rgba(255,255,255,0.9)"
                    />
                  </BlurView>
                </Pressable>
              </Animated.View>

              {/* Input section (space-between: top content + bottom button) */}
              <View style={styles.inputSection}>
                {/* Top content */}
                <View>
                  <Animated.View
                    entering={FadeInDown.delay(100).duration(600)}
                    style={styles.titleContainer}
                  >
                    <View style={styles.stepLabelRow}>
                      <Text style={styles.stepLabel}>{t('joinParty.stepLabel')}</Text>
                      <Animated.View style={[styles.gifContainer, floatStyle]}>
                        <Image
                          source={currentGif}
                          style={styles.gifImage}
                          contentFit="contain"
                          autoplay
                        />
                      </Animated.View>
                    </View>
                    <Text style={styles.mainTitle}>{t('joinParty.title')}</Text>
                  </Animated.View>

                  {/* Code cells */}
                  <Animated.View
                    style={[styles.codeContainer, shakeStyle]}
                  >
                    <Pressable
                      style={styles.codeInputsRow}
                      onPress={() => inputRef.current?.focus()}
                    >
                      {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                        <CodeInputCell
                          key={i}
                          char={code[i] || ""}
                          isFilled={!!code[i]}
                          isActive={isFocused && code.length === i}
                        />
                      ))}
                    </Pressable>

                    <TextInput
                      ref={inputRef}
                      style={styles.hiddenInput}
                      value={code}
                      onChangeText={handleCodeChange}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      keyboardType="default"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={CODE_LENGTH}
                      caretHidden={true}
                      selectionColor="transparent"
                    />
                  </Animated.View>

                  {/* Error / Success feedback */}
                  {error && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      exiting={FadeOut.duration(200)}
                      style={styles.errorContainer}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={18}
                        color="#FF6B6B"
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  )}

                  {success && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      style={styles.successContainer}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#22C55E"
                      />
                      <Text style={styles.successText}>{t('joinParty.joiningParty')}</Text>
                    </Animated.View>
                  )}
                </View>

                {/* Bottom button area */}
                <Animated.View
                  entering={FadeInUp.delay(400).duration(500)}
                  style={styles.bottomArea}
                >
                  <View style={styles.fireButtonWrapper}>
                    {isCodeComplete ? (
                      <ContinuousFireEmitter
                        originX={
                          (SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING) / 2
                        }
                        originY={0}
                        width={SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING}
                        height={56}
                      />
                    ) : null}
                    <Pressable
                      onPress={() => {
                        if (isCodeComplete) {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );
                          handleJoin();
                        }
                      }}
                      disabled={!isCodeComplete || isLoading}
                      style={({ pressed }) => [
                        styles.joinButton,
                        isCodeComplete
                          ? styles.joinButtonActive
                          : styles.joinButtonDisabled,
                        pressed && isCodeComplete && styles.joinButtonPressed,
                      ]}
                    >
                      {!isCodeComplete ? (
                        <BlurView
                          intensity={Platform.OS === "ios" ? 40 : 25}
                          tint="dark"
                          style={StyleSheet.absoluteFill}
                        />
                      ) : null}
                      <View style={styles.joinButtonContent}>
                        <Text
                          style={[
                            styles.joinButtonText,
                            !isCodeComplete && styles.joinButtonTextDisabled,
                          ]}
                        >
                          {t('joinParty.joinButton')}
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={20}
                          color={
                            isCodeComplete
                              ? "#0A0A0B"
                              : "rgba(255,255,255,0.3)"
                          }
                        />
                      </View>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "flex-start",
  },
  backButton: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    overflow: "hidden",
  },

  // Input section (mirrors CreatePartyScreen)
  inputSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  titleContainer: {
    marginTop: 16,
    marginBottom: 48,
  },
  stepLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#BFFF00",
    letterSpacing: 1,
  },
  gifContainer: {
    width: 26,
    height: 26,
  },
  gifImage: {
    width: "100%",
    height: "100%",
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },

  // Code input
  codeContainer: {
    width: "100%",
    alignItems: "center",
  },
  codeInputsRow: {
    flexDirection: "row",
    gap: 10,
  },
  codeCell: {
    width: (SCREEN_WIDTH - 48 - 50) / 6,
    aspectRatio: 0.8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  codeCellInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  codeCellChar: {
    fontSize: 28,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.3)",
    fontFamily: Platform.OS === "ios" ? "ui-rounded" : "monospace",
  },
  codeCellCharFilled: {
    color: "#FFFFFF",
  },
  cursor: {
    width: 2,
    height: 24,
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },

  // Error
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },
  errorText: {
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "500",
  },

  // Success
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  successText: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "600",
  },

  // Bottom button area
  bottomArea: {
    paddingBottom: 8,
  },
  fireButtonWrapper: {
    overflow: "visible",
    position: "relative",
  },
  joinButton: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
  },
  joinButtonActive: {
    backgroundColor: "#BFFF00",
    borderColor: "#BFFF00",
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonPressed: {
    opacity: 0.8,
  },
  joinButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0A0A0B",
  },
  joinButtonTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
});
