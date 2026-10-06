/**
 * StickerGif Component
 * ====================
 * Animated GIF with clip mask and modern shadow.
 * Minimalist design with smooth entrance animations.
 * Random layout that refreshes on each visit.
 */

import { Image } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

// ============================================
// TYPES
// ============================================

interface StickerGifProps {
  source: number | { uri: string };
  size?: number;
  scale?: number;
  borderRadius?: number;
  isFull?: boolean;
}

// ============================================
// STICKER GIF COMPONENT
// ============================================

export default function StickerGif({
  source,
  size = 100,
  scale = 1,
  borderRadius = 10,
  isFull = false,
}: StickerGifProps) {
  const scaledSize = size * scale;

  return (
    <View
      style={[
        styles.stickerContainer,
        {
          width: scaledSize,
          height: scaledSize,
          borderRadius: borderRadius,
          overflow: "hidden",
        },
      ]}
    >
      <Image
        source={source}
        style={[
          styles.gifImage,
          {
            width: scaledSize,
            height: scaledSize,
          },
        ]}
        contentFit={isFull ? "cover" : "contain"}
        autoplay
      />
    </View>
  );
}

// ============================================
// RANDOM UTILITIES
// ============================================

const randomBetween = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const POSITION_CONFIGS = {
  two: [
    [
      { offsetX: -80, offsetY: -15, rotation: -12 },
      { offsetX: 75, offsetY: 20, rotation: 15 },
    ],
    [
      { offsetX: -70, offsetY: 15, rotation: 8 },
      { offsetX: 80, offsetY: -20, rotation: -10 },
    ],
    [
      { offsetX: -85, offsetY: 0, rotation: -15 },
      { offsetX: 80, offsetY: 5, rotation: 12 },
    ],
    [
      { offsetX: -65, offsetY: -25, rotation: 5 },
      { offsetX: 70, offsetY: 25, rotation: -8 },
    ],
  ],
  three: [
    [
      { offsetX: -85, offsetY: -20, rotation: -12 },
      { offsetX: 85, offsetY: -10, rotation: 18 },
      { offsetX: 0, offsetY: 30, rotation: -6 },
    ],
    [
      { offsetX: 0, offsetY: -25, rotation: 8 },
      { offsetX: -90, offsetY: 15, rotation: -15 },
      { offsetX: 85, offsetY: 20, rotation: 10 },
    ],
    [
      { offsetX: -80, offsetY: 0, rotation: -10 },
      { offsetX: 80, offsetY: -20, rotation: 12 },
      { offsetX: 5, offsetY: 30, rotation: -5 },
    ],
    [
      { offsetX: 75, offsetY: -25, rotation: 15 },
      { offsetX: -85, offsetY: -10, rotation: -8 },
      { offsetX: 0, offsetY: 28, rotation: 5 },
    ],
    [
      { offsetX: -75, offsetY: -25, rotation: -18 },
      { offsetX: 80, offsetY: 5, rotation: 10 },
      { offsetX: -5, offsetY: 32, rotation: -3 },
    ],
  ],
};

// ============================================
// RANDOM STICKER LAYOUT
// ============================================

interface GifWithMeta {
  source: number | { uri: string };
  isFull: boolean;
}

interface RandomStickerLayoutProps {
  allGifSources: Array<GifWithMeta>;
  refreshKey?: number;
}

export function RandomStickerLayout({
  allGifSources,
  refreshKey = 0,
}: RandomStickerLayoutProps) {
  const randomConfig = useMemo(() => {
    const count = 3;
    const shuffledGifs = shuffleArray(allGifSources);
    const selectedGifs = shuffledGifs.slice(0, count);
    const positionSets = POSITION_CONFIGS.three;
    const selectedPositions =
      positionSets[Math.floor(Math.random() * positionSets.length)];

    const stickers = selectedGifs.map((gif, index) => ({
      source: gif.source,
      isFull: gif.isFull,
      scale: randomBetween(1, 1.3),
      ...selectedPositions[index],
      baseSize: randomBetween(95, 115),
    }));

    // Sort: FULL_ first (lower zIndex = behind), normal after (higher zIndex = on top)
    return stickers.sort((a, b) => {
      if (a.isFull && !b.isFull) return -1;
      if (!a.isFull && b.isFull) return 1;
      return 0;
    });
  }, [refreshKey, allGifSources.length]);

  return (
    <View style={styles.stickerLayoutContainer}>
      {randomConfig.map((sticker, index) => (
        <View
          key={`${refreshKey}-${index}`}
          style={[
            styles.stickerLayoutItem,
            {
              transform: [
                { translateX: sticker.offsetX },
                { translateY: sticker.offsetY },
                { rotate: `${sticker.rotation}deg` },
              ],
              zIndex: index,
            },
          ]}
        >
          <Animated.View
            entering={ZoomIn.springify()
              .damping(12)
              .stiffness(100)
              .delay(index * 120)}
          >
            <StickerGif
              source={sticker.source}
              size={sticker.baseSize}
              scale={sticker.scale}
              borderRadius={sticker.isFull ? 20 : 10}
              isFull={sticker.isFull}
            />
          </Animated.View>
        </View>
      ))}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  stickerContainer: {
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.25)",
    elevation: 12,
  },
  gifImage: {
    backgroundColor: "transparent",
  },
  stickerLayoutContainer: {
    width: 340,
    height: 200,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerLayoutItem: {
    position: "absolute",
  },
});
