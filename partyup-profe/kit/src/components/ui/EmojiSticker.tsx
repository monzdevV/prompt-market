/**
 * EmojiSticker Component
 * ======================
 * Renders an emoji with a border that follows the real emoji silhouette
 * using multiple offset layers (text stroke effect)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface EmojiStickerProps {
  emoji: string;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  rotation?: number;
  animate?: boolean;
  shadow?: boolean;
}

/**
 * Generates offsets to create the stroke effect.
 * Uses 16 points around the emoji for a smooth border.
 */
function generateStrokeOffsets(strokeWidth: number): { x: number; y: number }[] {
  const offsets: { x: number; y: number }[] = [];
  const steps = 16; // More steps = smoother border
  
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    offsets.push({
      x: Math.cos(angle) * strokeWidth,
      y: Math.sin(angle) * strokeWidth,
    });
  }
  
  return offsets;
}

export function EmojiSticker({
  emoji,
  size = 48,
  strokeWidth = 3,
  strokeColor = '#FFFFFF',
  rotation = 0,
  animate = false,
  shadow = true,
}: EmojiStickerProps) {
  const floatAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);
  
  // Generate stroke offsets
  const strokeOffsets = useMemo(
    () => generateStrokeOffsets(strokeWidth),
    [strokeWidth]
  );

  // Float animation
  React.useEffect(() => {
    if (animate) {
      floatAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      rotateAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [animate]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!animate) {
      return {
        transform: [{ rotate: `${rotation}deg` }],
      };
    }
    return {
      transform: [
        { translateY: interpolate(floatAnim.value, [0, 1], [0, -6]) },
        { rotate: `${rotation + interpolate(rotateAnim.value, [0, 1], [-4, 4])}deg` },
      ],
    };
  });

  const fontSize = size * 0.85;
  const containerSize = size + strokeWidth * 2 + 4;

  return (
    <Animated.View style={[styles.container, { width: containerSize, height: containerSize }, animatedStyle]}>
      {/* Shadow */}
      {shadow && (
        <View style={[
          styles.shadow,
          {
            width: containerSize - 4,
            height: containerSize - 4,
            borderRadius: containerSize / 2,
            transform: [{ translateY: 4 }],
          }
        ]} />
      )}
      
      {/* Stroke layer - multiple offset emojis */}
      {strokeOffsets.map((offset, index) => (
        <Text
          key={`stroke-${index}`}
          style={[
            styles.strokeLayer,
            {
              fontSize,
              left: strokeWidth + 2 + offset.x,
              top: strokeWidth + 2 + offset.y,
              textShadowColor: strokeColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: Platform.OS === 'ios' ? 1 : 2,
              color: strokeColor,
              opacity: Platform.OS === 'ios' ? 1 : 0.9,
            },
          ]}
        >
          {emoji}
        </Text>
      ))}
      
      {/* Extra stroke layer for thicker border on iOS */}
      {Platform.OS === 'ios' && strokeOffsets.map((offset, index) => (
        <Text
          key={`stroke2-${index}`}
          style={[
            styles.strokeLayer,
            {
              fontSize,
              left: strokeWidth + 2 + offset.x * 0.5,
              top: strokeWidth + 2 + offset.y * 0.5,
              color: strokeColor,
            },
          ]}
        >
          {emoji}
        </Text>
      ))}
      
      {/* Main emoji */}
      <Text
        style={[
          styles.emoji,
          {
            fontSize,
            left: strokeWidth + 2,
            top: strokeWidth + 2,
          },
        ]}
      >
        {emoji}
      </Text>
    </Animated.View>
  );
}

/**
 * Simplified version without animation for better performance
 */
export function EmojiStickerStatic({
  emoji,
  size = 48,
  strokeWidth = 3,
  strokeColor = '#FFFFFF',
  rotation = 0,
  shadow = true,
}: Omit<EmojiStickerProps, 'animate'>) {
  const strokeOffsets = useMemo(
    () => generateStrokeOffsets(strokeWidth),
    [strokeWidth]
  );

  const fontSize = size * 0.85;
  const containerSize = size + strokeWidth * 2 + 4;

  return (
    <View style={[
      styles.container, 
      { 
        width: containerSize, 
        height: containerSize,
        transform: [{ rotate: `${rotation}deg` }],
      }
    ]}>
      {/* Shadow */}
      {shadow && (
        <View style={[
          styles.shadow,
          {
            width: containerSize - 4,
            height: containerSize - 4,
            borderRadius: containerSize / 2,
            transform: [{ translateY: 4 }],
          }
        ]} />
      )}
      
      {/* Stroke layers */}
      {strokeOffsets.map((offset, index) => (
        <Text
          key={`stroke-${index}`}
          style={[
            styles.strokeLayer,
            {
              fontSize,
              left: strokeWidth + 2 + offset.x,
              top: strokeWidth + 2 + offset.y,
              color: strokeColor,
            },
          ]}
        >
          {emoji}
        </Text>
      ))}
      
      {/* Extra stroke layer for iOS */}
      {Platform.OS === 'ios' && strokeOffsets.map((offset, index) => (
        <Text
          key={`stroke2-${index}`}
          style={[
            styles.strokeLayer,
            {
              fontSize,
              left: strokeWidth + 2 + offset.x * 0.5,
              top: strokeWidth + 2 + offset.y * 0.5,
              color: strokeColor,
            },
          ]}
        >
          {emoji}
        </Text>
      ))}
      
      {/* Main emoji */}
      <Text
        style={[
          styles.emoji,
          {
            fontSize,
            left: strokeWidth + 2,
            top: strokeWidth + 2,
          },
        ]}
      >
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    top: 2,
    left: 2,
  },
  strokeLayer: {
    position: 'absolute',
    textAlign: 'center',
  },
  emoji: {
    position: 'absolute',
    textAlign: 'center',
  },
});

export default EmojiSticker;

