/**
 * PARTYUP Card Component
 * ==========================
 * Componente de tarjeta con variantes y animaciones
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  padding?: keyof typeof Spacing | number;
  borderRadius?: keyof typeof BorderRadius | number;
  style?: ViewStyle;
  animated?: boolean;
  haptic?: boolean;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  padding = 'base',
  borderRadius = 'lg',
  style,
  animated = true,
  haptic = true,
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress && animated) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (onPress && animated) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (onPress) {
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const getPadding = () => {
    if (typeof padding === 'number') return padding;
    return Spacing[padding];
  };

  const getBorderRadius = () => {
    if (typeof borderRadius === 'number') return borderRadius;
    return BorderRadius[borderRadius];
  };

  const cardStyle: ViewStyle = {
    ...styles.base,
    ...variantStyles[variant],
    padding: getPadding(),
    borderRadius: getBorderRadius(),
  };

  // Glass variant with GlassView or BlurView fallback
  if (variant === 'glass') {
    const glassContent = Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
      <GlassView style={[cardStyle, styles.glass, style]}>
        {children}
      </GlassView>
    ) : (
      <BlurView intensity={80} tint="light" style={[cardStyle, styles.glass, style]}>
        {children}
      </BlurView>
    );

    if (onPress) {
      return (
        <AnimatedPressable
          style={animatedStyle}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {glassContent}
        </AnimatedPressable>
      );
    }

    return <Animated.View style={animatedStyle}>{glassContent}</Animated.View>;
  }

  // Otras variantes
  if (onPress) {
    return (
      <AnimatedPressable
        style={[animatedStyle, cardStyle, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[animatedStyle, cardStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  glass: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: Colors.ui.card,
    ...Shadows.card,
  },
  elevated: {
    backgroundColor: Colors.ui.cardElevated,
    ...Shadows.lg,
  },
  outlined: {
    backgroundColor: Colors.ui.card,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  filled: {
    backgroundColor: Colors.ui.backgroundSecondary,
  },
  glass: {
    // Se aplica en el BlurView
  },
};

export default Card;
