/**
 * CategorySelector — Shared category picker for all games
 * ========================================================
 * Grid layout: Hot full-width at top (eye-catching), Chill + Party row below.
 * Includes a premium unlock banner styled consistently.
 */

import { Colors } from "@/src/constants/theme";
import {
  Canvas,
  LinearGradient as SkiaGrad,
  Rect,
  vec,
  Blur,
  Group,
  Circle,
  RadialGradient,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronLeftIcon, FireIcon, LockClosedIcon } from "react-native-heroicons/solid";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContinuousFireEmitter } from "@/src/components/ui/FireParticles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ROUNDED: string = Platform.OS === "ios" ? "System" : "sans-serif";
const CATEGORY_ITEM_SIZE = (SCREEN_WIDTH - 48 - 14) / 2;

export interface CategoryOption {
  id: string;
  label: string;
  emoji: string;
  colors: [string, string];
  isPremium: boolean;
}

export interface CategorySelectorProps {
  title?: string;
  categories: CategoryOption[];
  isPremium: boolean;
  onSelect: (categoryId: string) => void;
  onBack: () => void;
  onPremiumUpsell: (message: string) => void;
}

// ── Animated Hot banner (locked state) — deep red Skia gradient + animated fire icons ──
const HOT_W = SCREEN_WIDTH - 48;
const HOT_H = CATEGORY_ITEM_SIZE;

function AnimatedHotContent({ cat }: { cat: CategoryOption }) {
  const { t } = useTranslation();
  /* ── Shimmer pulse animations (moving glow over Skia base) ── */
  const shimmer1 = useSharedValue(0);
  const shimmer2 = useSharedValue(0);

  React.useEffect(() => {
    shimmer1.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    shimmer2.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, []);

  const shimmer1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer1.value, [0, 1], [-HOT_W * 0.4, HOT_W * 0.4]) },
    ],
    opacity: interpolate(shimmer1.value, [0, 0.5, 1], [0.15, 0.45, 0.15]),
  }));

  const shimmer2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer2.value, [0, 1], [HOT_W * 0.3, -HOT_W * 0.3]) },
    ],
    opacity: interpolate(shimmer2.value, [0, 0.5, 1], [0.1, 0.35, 0.1]),
  }));

  return (
    <View style={styles.premiumBannerGradient}>
      {/* Skia vibrant gradient base — rich red/crimson */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={HOT_W} height={HOT_H}>
          <SkiaGrad
            start={vec(0, 0)}
            end={vec(HOT_W, HOT_H)}
            colors={[
              "#7A1A1A",
              "#9B2222",
              "#BF3030",
              "#D94040",
              "#E84E4E",
              "#D94040",
              "#BF3030",
              "#9B2222",
              "#7A1A1A",
            ]}
            positions={[0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1]}
          />
        </Rect>
        {/* Vivid blurred glow spots */}
        <Group>
          <Blur blur={50} />
          <Circle cx={HOT_W * 0.3} cy={HOT_H * 0.4} r={80}>
            <RadialGradient
              c={vec(HOT_W * 0.3, HOT_H * 0.4)}
              r={80}
              colors={["rgba(255,100,60,0.25)", "transparent"]}
            />
          </Circle>
          <Circle cx={HOT_W * 0.75} cy={HOT_H * 0.6} r={70}>
            <RadialGradient
              c={vec(HOT_W * 0.75, HOT_H * 0.6)}
              r={70}
              colors={["rgba(255,120,70,0.2)", "transparent"]}
            />
          </Circle>
        </Group>
      </Canvas>

      {/* Animated shimmer overlays — vibrant */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: HOT_W * 0.6,
            height: HOT_H,
            borderRadius: 40,
          },
          shimmer1Style,
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["transparent", "rgba(255,80,30,0.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: HOT_W * 0.5,
            height: HOT_H,
            borderRadius: 40,
          },
          shimmer2Style,
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["transparent", "rgba(255,120,50,0.25)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Fire icon decorations - subtle and static */}
      <View style={[styles.fireIconDecor, { top: 6, right: 52 }]}>
        <FireIcon size={16} color="rgba(255,255,255,0.25)" />
      </View>
      <View style={[styles.fireIconDecor, { bottom: 8, left: 8 }]}>
        <FireIcon size={14} color="rgba(255,255,255,0.2)" />
      </View>
      <View style={[styles.fireIconDecor, { top: 8, right: 12 }]}>
        <FireIcon size={12} color="rgba(255,255,255,0.18)" />
      </View>
      <View style={[styles.fireIconDecor, { bottom: 12, right: 90 }]}>
        <FireIcon size={12} color="rgba(255,255,255,0.25)" />
      </View>
      <View style={[styles.fireIconDecor, { top: 16, left: 60 }]}>
        <FireIcon size={10} color="rgba(255,255,255,0.18)" />
      </View>

      {/* Content */}
      <Image
        source={require("@/assets/emojis/pro.png")}
        style={styles.proSticker}
        contentFit="contain"
      />
      <View style={styles.premiumTextWrap}>
        <Text style={styles.premiumBannerTitle}>
          {cat.emoji} {cat.label}
        </Text>
        <Text style={styles.premiumBannerSub}>{t('games.unlockWithPremium')}</Text>
      </View>
      <View style={styles.proBadge}>
        <LockClosedIcon size={12} color="#fff" />
        <Text style={styles.proBadgeText}>{t('games.pro')}</Text>
      </View>
    </View>
  );
}

export function CategorySelector({
  title,
  categories,
  isPremium,
  onSelect,
  onBack,
  onPremiumUpsell,
}: CategorySelectorProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const resolvedTitle = title ?? t('games.pickCategory');

  // Split categories: free ones on top row, premium ones on bottom
  const freeCategories = categories.filter((c) => !c.isPremium);
  const premiumCategories = categories.filter((c) => c.isPremium);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeftIcon size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>{resolvedTitle}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Categories grid */}
        <View style={styles.categoriesArea}>
          {/* Premium categories — full width at TOP for attention */}
          {premiumCategories.map((cat, index) => {
            const isLocked = !isPremium;
            return (
              <Animated.View
                key={cat.id}
                entering={FadeInDown.delay(index * 80)
                  .duration(400)
                  .springify()}
                style={styles.premiumWrapper}
              >
                <Pressable
                  onPress={() => {
                    if (isLocked) {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      );
                      onPremiumUpsell(t('games.unlockWithPremium'));
                      return;
                    }
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium
                    );
                    onSelect(cat.id);
                  }}
                  style={({ pressed }) => [
                    styles.premiumCategoryButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {isLocked ? (
                    <AnimatedHotContent cat={cat} />
                  ) : (
                    <LinearGradient
                      colors={cat.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.premiumUnlockedGradient}
                    >
                      <Text style={styles.premiumUnlockedEmoji}>
                        {cat.emoji}
                      </Text>
                      <Text style={styles.premiumUnlockedLabel}>
                        {cat.label}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
                {/* Fire particles floating up — spawn from upper half of banner */}
                {isLocked && (
                  <ContinuousFireEmitter
                    originX={HOT_W / 2}
                    originY={HOT_H * 0.2}
                    width={HOT_W * 0.85}
                    height={HOT_H * 0.4}
                  />
                )}
              </Animated.View>
            );
          })}

          {/* Free categories — 2 per row */}
          <View style={styles.freeRow}>
            {freeCategories.map((cat, index) => (
              <Animated.View
                key={cat.id}
                entering={FadeInDown.delay(
                  (premiumCategories.length + index) * 80,
                )
                  .duration(400)
                  .springify()}
                style={styles.freeCategoryWrapper}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSelect(cat.id);
                  }}
                  style={({ pressed }) => [
                    styles.categoryButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <LinearGradient
                    colors={cat.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryGradient}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
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
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    letterSpacing: -0.3,
  },

  categoriesArea: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
  },
  freeRow: {
    flexDirection: "row",
    gap: 14,
  },
  freeCategoryWrapper: {
    flex: 1,
  },

  categoryButton: {
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
  categoryGradient: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: { fontSize: 52, marginBottom: 10 },
  categoryLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // Premium full-width banner (same height as grid items)
  premiumWrapper: {
    overflow: "visible",
    zIndex: 10,
  },
  premiumCategoryButton: {
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#CC2222",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
    }),
  },
  premiumBannerGradient: {
    height: CATEGORY_ITEM_SIZE,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    gap: 16,
    overflow: "hidden",
  },
  fireIconDecor: {
    position: "absolute",
    zIndex: 0,
  },
  proSticker: {
    width: 52,
    height: 52,
  },
  premiumTextWrap: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },
  premiumBannerSub: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
    fontFamily: ROUNDED,
    marginTop: 3,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: 0.5,
  },

  // Unlocked premium
  premiumUnlockedGradient: {
    height: CATEGORY_ITEM_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
    borderRadius: 24,
  },
  premiumUnlockedEmoji: { fontSize: 52 },
  premiumUnlockedLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});

export default CategorySelector;
