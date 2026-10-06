/**
 * GameIntro — Apple-minimalist game intro screen
 * ================================================
 * Clean, modern layout with looping video hero,
 * frosted-glass emoji badge (no gradients on icon),
 * flat rules list, and solid-colour CTA.
 */

import { Colors } from "@/src/constants/theme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import {
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ROUNDED: string = Platform.OS === "ios" ? "ui-rounded" : "sans-serif";
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.42;

// ============================================
// TYPES
// ============================================

export interface GameRule {
  emoji: any; // require("@/assets/emojis/...")
  text: string;
}

export interface GameIntroProps {
  /** Game title */
  title: string;
  /** Short description */
  subtitle: string;
  /** Main emoji icon */
  emoji: any;
  /** Accent colour for the CTA button */
  accentColor: string;
  /** Rules to display */
  rules: GameRule[];
  /** CTA label — defaults to "Play" */
  buttonLabel?: string;
  /** Section header above rules — defaults to "How to play" */
  rulesHeaderText?: string;
  /** Called when user taps the CTA */
  onPlay: () => void;
  /** Called when user taps back */
  onBack: () => void;
  /** Optional extra content below rules */
  extraContent?: React.ReactNode;
  /** Optional video source for game preview */
  videoSource?: any;

  // Legacy compat — ignored
  accentRgb?: string;
  accentColorDark?: string;
}

// ============================================
// COMPONENT
// ============================================

export function GameIntro({
  title,
  subtitle,
  emoji,
  accentColor,
  rules,
  buttonLabel = "Play",
  rulesHeaderText = "How to play",
  onPlay,
  onBack,
  extraContent,
  videoSource,
}: GameIntroProps) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(
    videoSource || require("@/assets/boarding/party_video.mp4"),
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );

  return (
    <Animated.View entering={FadeIn.duration(350)} style={styles.container}>
      {/* ── VIDEO HERO ── */}
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.videoPlayer}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Top fade — dark for safe area */}
        <View style={styles.videoTopFade} pointerEvents="none">
          <LinearGradient
            colors={["rgba(10,10,11,0.95)", "rgba(10,10,11,0.6)", "transparent"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Bottom seamless fade into bg */}
        <View style={styles.videoBottomFade} pointerEvents="none">
          <LinearGradient
            colors={["transparent", Colors.background.primary]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Back button — pill style */}
        <Pressable
          onPress={onBack}
          style={[styles.backBtn, { top: insets.top + 8 }]}
          hitSlop={14}
        >
          <Text style={styles.backArrow}>{"‹"}</Text>
        </Pressable>
      </View>

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Emoji — large, rotated, no badge */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(450).springify()}
        >
          <View style={styles.emojiContainer}>
            <Image source={emoji} style={styles.emojiImg} contentFit="contain" />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(250).duration(450)}
          style={styles.title}
        >
          {title}
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(350).duration(450)}
          style={styles.subtitle}
        >
          {subtitle}
        </Animated.Text>

        {/* Rules — compact inline list */}
        <Animated.View
          entering={FadeInDown.delay(450).duration(450)}
          style={styles.rulesList}
        >
          <Text style={styles.rulesHeader}>{rulesHeaderText}</Text>
          {rules.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Image
                source={rule.emoji}
                style={styles.ruleEmoji}
                contentFit="contain"
              />
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Extra content */}
        {extraContent}
      </ScrollView>

      {/* CTA — pinned to bottom for consistent position across games */}
      <Animated.View
        entering={FadeInDown.delay(550).duration(450)}
        style={[styles.ctaContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        <Pressable
          onPress={onPlay}
          style={({ pressed }) => [
            styles.playBtn,
            { backgroundColor: accentColor },
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.playBtnText}>{buttonLabel}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
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

  // ── Video ──
  videoContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoTopFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  videoBottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  // ── Back ──
  backBtn: {
    position: "absolute",
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  backArrow: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "300",
    marginTop: -1,
    marginLeft: -1,
  },

  // ── Emoji (large, rotated, no badge) ──
  emojiContainer: {
    alignSelf: "center",
    marginBottom: 12,
    transform: [{ rotate: "-8deg" }],
  },
  emojiImg: {
    width: 56,
    height: 56,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
    marginTop: -16,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 4,
  },

  // ── Typography ──
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.tertiary,
    marginTop: 6,
    fontFamily: ROUNDED,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },

  // ── Rules (compact flat list) ──
  rulesList: {
    marginTop: 20,
    gap: 10,
  },
  rulesHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.muted,
    fontFamily: ROUNDED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleEmoji: {
    width: 20,
    height: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: "500",
    lineHeight: 19,
  },

  // ── CTA ──
  ctaContainer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: Colors.background.primary,
  },
  playBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  playBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },
});
