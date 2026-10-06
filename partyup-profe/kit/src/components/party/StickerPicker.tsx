/**
 * StickerPicker
 * =============
 * Horizontal scrollable grid of reaction stickers.
 * Supports both emoji PNGs and animated GIFs.
 * Reusable across fullscreen viewer and long-press menu.
 */

import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/constants/theme';
import { REACTION_STICKERS } from '@/src/types';

// ============================================
// TYPES
// ============================================

interface StickerPickerProps {
  /** Currently selected sticker ID (highlight), or null if none. */
  selectedStickerId: string | null;
  /** Called when the user taps a sticker. */
  onSelect: (stickerId: string) => void;
  /** Called when the user taps the already-selected sticker (remove). */
  onRemove?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const STICKER_CELL_SIZE = 56;
const STICKER_IMAGE_SIZE = 40;

// ============================================
// COMPONENT
// ============================================

export function StickerPicker({ selectedStickerId, onSelect, onRemove }: StickerPickerProps) {
  const handlePress = (stickerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stickerId === selectedStickerId && onRemove) {
      onRemove();
    } else {
      onSelect(stickerId);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {REACTION_STICKERS.map((sticker) => {
        const isSelected = sticker.id === selectedStickerId;
        return (
          <Pressable
            key={sticker.id}
            onPress={() => handlePress(sticker.id)}
            style={({ pressed }) => [
              styles.cell,
              isSelected && styles.cellSelected,
              pressed && styles.cellPressed,
            ]}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={sticker.source}
                style={styles.stickerImage}
                contentFit="contain"
                autoplay
              />
            </View>
            <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
              {sticker.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  cell: {
    width: STICKER_CELL_SIZE,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.muted,
  },
  cellPressed: {
    opacity: 0.7,
  },
  imageWrapper: {
    width: STICKER_IMAGE_SIZE,
    height: STICKER_IMAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerImage: {
    width: STICKER_IMAGE_SIZE,
    height: STICKER_IMAGE_SIZE,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  labelSelected: {
    color: Colors.primary.main,
  },
});
