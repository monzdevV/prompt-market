/**
 * PARTYUP GameCard Component - Apple Liquid Glass Design
 * ===========================================================
 * Completely redesigned game cards with:
 * - GameInfoCard: GIF background with gradient mask (opacity fading left), minimal text
 * - SwipeableGameCard: 3D tilt effect with emoji stickers background, liquid glass
 */

import {
    BorderRadius,
    Colors,
    Spacing,
    Typography,
} from "@/src/constants/theme";
import { GameCard as GameCardType, GameType } from "@/src/types";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Accelerometer } from "expo-sensors";
import React, { useCallback, useEffect, useState } from "react";
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
    ChevronRightIcon,
    LockClosedIcon,
    SparklesIcon,
} from "react-native-heroicons/solid";
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const ROTATION_ANGLE = 15;
const ROUNDED: string = Platform.OS === 'ios' ? 'System' : 'sans-serif';

// ============================================
// GIFs para cada tipo de juego - Fondos
// ============================================

const GAME_GIFS: Record<GameType, any[]> = {
  "never-have-i-ever": [
    require("@/assets/gifs/drunk happy hour Sticker.gif"),
    require("@/assets/gifs/Drunk Dog Sticker by Romeo Mama Bandana Store.gif"),
    require("@/assets/gifs/Cat Drinking Sticker.gif"),
  ],
  "truth-or-dare": [
    require("@/assets/gifs/Dance Party Sticker.gif"),
    require("@/assets/gifs/Dance Party Sticker by Fuzzy Wobble.gif"),
    require("@/assets/gifs/Dancing Bear Party Sticker by Korkeasaari Zoo.gif"),
  ],
  "random-questions": [
    require("@/assets/gifs/Cat Beer Sticker.gif"),
    require("@/assets/gifs/Happy Devon Rex Sticker.gif"),
    require("@/assets/gifs/Cat Dancing Sticker by WEPLAY Music GmbH.gif"),
  ],
  "spin-bottle": [
    require("@/assets/gifs/Disco Ball Nightly Sticker by nightlyofficial.gif"),
    require("@/assets/gifs/Dance Dancing Sticker.gif"),
    require("@/assets/gifs/Music Note Love Sticker.gif"),
  ],
  categories: [
    require("@/assets/gifs/Beer Sticker by imoji.gif"),
    require("@/assets/gifs/beer STICKER.gif"),
    require("@/assets/gifs/International Beer Day Sticker.gif"),
  ],
  kings: [
    require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
    require("@/assets/gifs/Celebrate Happy Birthday Sticker by Originals.gif"),
    require("@/assets/gifs/Celebrate New Orleans Sticker by GIPHY Studios 2021.gif"),
  ],
  custom: [
    require("@/assets/gifs/Russian Dancing Sticker by UBERcut.gif"),
    require("@/assets/gifs/Big Dog Dancing Sticker.gif"),
  ],
};

// ============================================
// EMOJI STICKERS for SwipeableGameCard background
// ============================================

const EMOJI_STICKERS = [
  require("@/assets/emojis/beer.png"),
  require("@/assets/emojis/beers.png"),
  require("@/assets/emojis/clinking_glasses.png"),
  require("@/assets/emojis/tropical_drink.png"),
  require("@/assets/emojis/tada.png"),
  require("@/assets/emojis/partying_face.png"),
  require("@/assets/emojis/fire.png"),
  require("@/assets/emojis/cocktail.png"),
];

const INTENSITY_ICONS: Record<1 | 2 | 3, any> = {
  1: require("@/assets/emojis/beer.png"),
  2: require("@/assets/emojis/beers.png"),
  3: require("@/assets/emojis/fire.png"),
};

// ============================================
// LIQUID GLASS CONSTANTS
// ============================================

const GLASS_BORDER_COLOR = "rgba(255, 255, 255, 0.12)";
const GLASS_BG_COLOR = "rgba(255, 255, 255, 0.06)";

// ============================================
// Helper to get random GIF
// ============================================

const getGameGif = (gameType: GameType): any => {
  const gifs = GAME_GIFS[gameType] || GAME_GIFS["custom"];
  return gifs[Math.floor(Math.random() * gifs.length)];
};

// ============================================
// PATTERN OVERLAY - Puntos semitransparentes (estilo “fantasma”)
// ============================================

function DotPattern({ color }: { color: string }) {
  const dots = React.useMemo(() => {
    const rows = 4;
    const cols = 8;
    const list: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({ x: 8 + c * 14, y: 10 + r * 18 });
      }
    }
    return list;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d, i) => (
        <View
          key={i}
          style={[
            styles.patternDot,
            {
              left: d.x,
              top: d.y,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ============================================
// GAME INFO CARD - Banner style (left graphic + color + pattern + text)
// ============================================

interface GameInfoCardProps {
  game: {
    id: string;
    type: GameType;
    name: string;
    description: string;
    icon: string;
    color: string;
    minPlayers: number;
    maxPlayers: number;
    isPremium: boolean;
  };
  onPress: () => void;
  disabled?: boolean;
}

export function GameInfoCard({
  game,
  onPress,
  disabled = false,
}: GameInfoCardProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(false);
  const [gif] = useState(() => getGameGif(game.type));

  const handlePressIn = () => {
    pressed.value = true;
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    pressed.value = false;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Darker color for the pattern (same hue, more opaque)
  const patternColor = React.useMemo(() => {
    const hex = game.color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.35)`;
  }, [game.color]);

  return (
    <Animated.View style={[styles.gameInfoCardWrapper, animatedStyle]}>
      <Pressable
        onPress={() => !disabled && onPress()}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.gameInfoCardPressable}
      >
        <View
          style={[
            styles.gameInfoCardBanner,
            { backgroundColor: game.color },
            disabled && styles.cardDisabled,
          ]}
        >
          {/* Sección izquierda: gráfico (GIF) con esquina redondeada */}
          <View style={styles.gameInfoCardLeft}>
            <Image
              source={gif}
              style={styles.gameInfoCardGif}
              contentFit="cover"
              autoplay
            />
            <LinearGradient
              colors={["transparent", game.color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gameInfoCardGifGradient}
            />
          </View>

          {/* Sección derecha: fondo de color + patrón + texto + chevron */}
          <View style={styles.gameInfoCardRight}>
            <DotPattern color={patternColor} />
            <View style={styles.gameInfoContent}>
              <View style={styles.gameNameContainer}>
                <Text style={styles.gameInfoCardTitle} numberOfLines={1}>
                  {game.name}
                </Text>
                {game.isPremium && (
                  <View style={styles.premiumBadge}>
                    <SparklesIcon size={10} color={Colors.accent.yellow} />
                  </View>
                )}
              </View>
              <View style={styles.gameAction}>
                {disabled ? (
                  <LockClosedIcon size={18} color="rgba(255,255,255,0.6)" />
                ) : (
                  <ChevronRightIcon size={22} color="#FFFFFF" />
                )}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// EMOJI STICKERS BACKGROUND - For SwipeableGameCard
// ============================================

function EmojiStickersBackground() {
  // Generate random positions for emojis
  const [emojis] = useState(() => {
    const positions = [];
    for (let i = 0; i < 12; i++) {
      positions.push({
        source:
          EMOJI_STICKERS[Math.floor(Math.random() * EMOJI_STICKERS.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 24 + Math.random() * 20,
        rotation: -20 + Math.random() * 40,
        opacity: 0.15 + Math.random() * 0.2,
      });
    }
    return positions;
  });

  return (
    <View style={styles.emojiBackground}>
      {emojis.map((emoji, index) => (
        <Image
          key={index}
          source={emoji.source}
          style={[
            styles.backgroundEmoji,
            {
              left: `${emoji.x}%`,
              top: `${emoji.y}%`,
              width: emoji.size,
              height: emoji.size,
              opacity: emoji.opacity,
              transform: [{ rotate: `${emoji.rotation}deg` }],
            },
          ]}
          contentFit="contain"
        />
      ))}
    </View>
  );
}

// ============================================
// SWIPEABLE GAME CARD - For playing games
// With gyroscope 3D tilt effect and GIF background
// ============================================

interface SwipeableGameCardProps {
  card: GameCardType;
  gameType: GameType;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp?: () => void;
  isActive: boolean;
  index: number;
}

export function SwipeableGameCard({
  card,
  gameType,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  isActive,
  index,
}: SwipeableGameCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.95);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // Gyroscope-based 3D Tilt values
  const gyroRotateX = useSharedValue(0);
  const gyroRotateY = useSharedValue(0);

  // Gesture-based tilt (when swiping)
  const gestureRotateX = useSharedValue(0);
  const gestureRotateY = useSharedValue(0);

  const [gif] = useState(() => getGameGif(gameType));

  // Subscribe to accelerometer for gyroscope-like tilt effect
  useEffect(() => {
    if (!isActive) return;

    Accelerometer.setUpdateInterval(50);
    const subscription = Accelerometer.addListener(
      (data: { x: number; y: number; z: number }) => {
        const { x, y } = data;
        // Subtle tilt based on phone orientation
        gyroRotateY.value = withSpring(x * 8, { damping: 20, stiffness: 150 });
        gyroRotateX.value = withSpring(-y * 5, { damping: 20, stiffness: 150 });
      },
    );

    return () => subscription.remove();
  }, [isActive]);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.95 - index * 0.02, {
      damping: 20,
      stiffness: 200,
    });
  }, [isActive, index]);

  const triggerHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Ignore haptic errors
    }
  }, []);

  const handleSwipeLeftJS = useCallback(() => {
    onSwipeLeft();
  }, [onSwipeLeft]);

  const handleSwipeRightJS = useCallback(() => {
    onSwipeRight();
  }, [onSwipeRight]);

  const handleSwipeUpJS = useCallback(() => {
    onSwipeUp?.();
  }, [onSwipeUp]);

  const resetPosition = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    gestureRotateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    gestureRotateY.value = withSpring(0, { damping: 20, stiffness: 300 });
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(isActive)
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY * 0.5;

      // 3D tilt effect based on gesture position
      gestureRotateY.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [8, 0, -8],
        Extrapolation.CLAMP,
      );
      gestureRotateX.value = interpolate(
        event.translationY,
        [-200, 0, 200],
        [-5, 0, 5],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      const { translationX, velocityX } = event;

      if (
        Math.abs(translationX) > SWIPE_THRESHOLD ||
        Math.abs(velocityX) > 500
      ) {
        const direction = translationX > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * SCREEN_WIDTH * 1.5,
          { duration: 350, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) {
              runOnJS(direction > 0 ? handleSwipeRightJS : handleSwipeLeftJS)();
            }
          },
        );
        runOnJS(triggerHaptic)();
        return;
      }

      if (event.translationY < -80 && onSwipeUp) {
        translateY.value = withTiming(
          -SCREEN_HEIGHT * 0.6,
          { duration: 350, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) {
              runOnJS(handleSwipeUpJS)();
            }
          },
        );
        runOnJS(triggerHaptic)();
        return;
      }

      runOnJS(resetPosition)();
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolation.CLAMP,
    );

    // Combine gyroscope and gesture rotation
    const totalRotateX = gyroRotateX.value + gestureRotateX.value;
    const totalRotateY = gyroRotateY.value + gestureRotateY.value;

    return {
      transform: [
        { perspective: 1000 },
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation}deg` },
        { rotateX: `${totalRotateX}deg` },
        { rotateY: `${totalRotateY}deg` },
        { scale: scale.value },
      ],
    };
  });

  const leftIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 0.8, 0],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.8],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const upIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-80, 0],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const getIntensityInfo = () => {
    switch (card.intensity) {
      case 1:
        return { text: "Easy", color: "#22C55E", icon: INTENSITY_ICONS[1] };
      case 2:
        return { text: "Medium", color: "#F59E0B", icon: INTENSITY_ICONS[2] };
      case 3:
        return { text: "Spicy", color: "#EF4444", icon: INTENSITY_ICONS[3] };
      default:
        return { text: "", color: "#71717A", icon: INTENSITY_ICONS[1] };
    }
  };

  const intensity = getIntensityInfo();

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.swipeCard, cardStyle, { zIndex: 1000 - index }]}
      >
        {/* Modern GIF Background with glass overlay */}
        <View style={styles.cardBackground}>
          {/* Full GIF background */}
          <Image
            source={gif}
            style={styles.cardGifBackground}
            contentFit="cover"
            autoplay
          />

          {/* Dark gradient overlay for readability */}
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Subtle glass overlay */}
          <BlurView
            intensity={Platform.OS === "ios" ? 20 : 10}
            tint="dark"
            style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
          />

          {/* Glass shine effect at top */}
          <View style={styles.glassShine} />
        </View>

        {/* Swipe Indicators */}
        <Animated.View
          style={[styles.indicator, styles.leftIndicator, leftIndicatorStyle]}
        >
          <View style={[styles.indicatorBubble, styles.indicatorSkip]}>
            <Text style={styles.indicatorText}>SKIP</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.indicator, styles.rightIndicator, rightIndicatorStyle]}
        >
          <View style={[styles.indicatorBubble, styles.indicatorDone]}>
            <Text style={styles.indicatorText}>DONE</Text>
          </View>
        </Animated.View>

        {onSwipeUp && (
          <Animated.View
            style={[styles.indicator, styles.upIndicator, upIndicatorStyle]}
          >
            <View style={[styles.indicatorBubble, styles.indicatorDrink]}>
              <Image
                source={require("@/assets/emojis/beers.png")}
                style={styles.indicatorEmoji}
              />
              <Text style={styles.indicatorText}>DRINK</Text>
            </View>
          </Animated.View>
        )}

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.intensityBadge,
                { backgroundColor: `${intensity.color}20` },
              ]}
            >
              <Image source={intensity.icon} style={styles.intensityIcon} />
              <Text style={[styles.intensityText, { color: intensity.color }]}>
                {intensity.text}
              </Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.contentBox}>
            <Text style={styles.cardText}>{card.content}</Text>
          </View>

          {/* Floating GIF */}
          <View style={styles.floatingGif}>
            <Image
              source={gif}
              style={styles.floatingGifImage}
              contentFit="contain"
              autoplay
            />
          </View>

          {/* Drink penalty */}
          {card.drinkPenalty && card.drinkPenalty > 0 && (
            <View style={styles.penaltyContainer}>
              <Image
                source={require("@/assets/emojis/beer.png")}
                style={styles.penaltyIcon}
              />
              <Text style={styles.penaltyText}>
                {card.drinkPenalty} drink{card.drinkPenalty > 1 ? "s" : ""} if
                not
              </Text>
            </View>
          )}
        </View>

        {/* Footer hints */}
        <View style={styles.cardFooter}>
          <View style={styles.swipeHint}>
            <ChevronRightIcon
              size={14}
              color="rgba(255,255,255,0.3)"
              style={{ transform: [{ rotate: "180deg" }] }}
            />
            <Text style={styles.swipeHintText}>Skip</Text>
          </View>
          {onSwipeUp && (
            <View style={styles.swipeHint}>
              <ChevronRightIcon
                size={14}
                color="rgba(255,255,255,0.3)"
                style={{ transform: [{ rotate: "-90deg" }] }}
              />
              <Text style={styles.swipeHintText}>Drink</Text>
            </View>
          )}
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>Done</Text>
            <ChevronRightIcon size={14} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // ============================================
  // GameInfoCard Styles - Banner (left graphic + color + pattern)
  // ============================================
  gameInfoCardWrapper: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius["2xl"],
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  gameInfoCardPressable: {
    borderRadius: 22,
    overflow: "hidden",
  },
  gameInfoCardBanner: {
    height: 80,
    borderRadius: 22,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  cardDisabled: {
    opacity: 0.6,
  },
  gameInfoCardLeft: {
    width: 100,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderBottomLeftRadius: BorderRadius["2xl"],
    overflow: "hidden",
  },
  gameInfoCardGif: {
    width: "100%",
    height: "100%",
  },
  gameInfoCardGifGradient: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
  },
  gameInfoCardRight: {
    flex: 1,
    justifyContent: "center",
    paddingRight: Spacing.md,
    paddingLeft: Spacing.sm,
  },
  patternDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.9,
  },
  gameInfoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  gameNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  gameInfoCardTitle: {
    fontSize: Typography.size.lg,
    fontWeight: "700",
    fontFamily: ROUNDED,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  premiumBadge: {
    backgroundColor: "rgba(250, 204, 21, 0.25)",
    padding: 3,
    borderRadius: BorderRadius.sm,
  },
  gameAction: {
    paddingLeft: Spacing.xs,
  },

  // ============================================
  // SwipeableGameCard Styles - 3D tilt + emoji bg
  // ============================================
  swipeCard: {
    position: "absolute",
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.55,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    ...Platform.select({
      ios: {
        borderCurve: 'continuous' as any,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 28,
      },
      android: { elevation: 14 },
    }),
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0a0f",
  },
  cardGifBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  emojiBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundEmoji: {
    position: "absolute",
  },
  glassShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "30%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // Indicators
  indicator: {
    position: "absolute",
    zIndex: 10,
  },
  leftIndicator: {
    top: 60,
    right: 20,
  },
  rightIndicator: {
    top: 60,
    left: 20,
  },
  upIndicator: {
    bottom: 120,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  indicatorBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  indicatorSkip: {
    backgroundColor: "rgba(239, 68, 68, 0.9)",
  },
  indicatorDone: {
    backgroundColor: "rgba(34, 197, 94, 0.9)",
  },
  indicatorDrink: {
    backgroundColor: "rgba(250, 204, 21, 0.9)",
  },
  indicatorText: {
    color: "#fff",
    fontSize: Typography.size.xs,
    fontWeight: "700",
    fontFamily: ROUNDED,
    letterSpacing: 1,
  },
  indicatorEmoji: {
    width: 18,
    height: 18,
  },

  // Card Content
  cardContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
    zIndex: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: Spacing.lg,
  },
  intensityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  intensityIcon: {
    width: 16,
    height: 16,
  },
  intensityText: {
    fontSize: Typography.size.xs,
    fontWeight: "600",
    fontFamily: ROUNDED,
  },
  contentBox: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 22,
    padding: Spacing.xl,
    marginVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  cardText: {
    color: Colors.text.primary,
    fontSize: Typography.size["2xl"],
    fontWeight: "700",
    fontFamily: ROUNDED,
    textAlign: "center",
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  floatingGif: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 70,
    height: 70,
    opacity: 0.7,
  },
  floatingGifImage: {
    width: "100%",
    height: "100%",
  },
  penaltyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  penaltyIcon: {
    width: 20,
    height: 20,
  },
  penaltyText: {
    color: Colors.text.secondary,
    fontSize: Typography.size.md,
    fontWeight: "500",
    fontFamily: ROUNDED,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    zIndex: 5,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swipeHintText: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: Typography.size.xs,
    fontWeight: "500",
    fontFamily: ROUNDED,
  },
});

export default SwipeableGameCard;
