/**
 * PARTYUP Badge Component
 * ===========================
 * Badge with variant styles and pulse animations
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '@/src/constants/theme';

export type BadgeVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info'
  | 'outline';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  text?: string;
  count?: number;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  text,
  count,
  variant = 'primary',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  style,
  textStyle,
}: BadgeProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (pulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Dot mode
  if (dot) {
    const dotSize = dotSizes[size];
    return (
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: variantColors[variant].background,
          },
          pulse && animatedStyle,
          style,
        ]}
      />
    );
  }

  // Count mode - capped at 99+
  const displayText = count !== undefined 
    ? count > 99 ? '99+' : count.toString()
    : text;

  // Numeric only, circular badge
  const isNumericOnly = count !== undefined && !text;
  
  return (
    <Animated.View
      style={[
        styles.badge,
        sizeStyles[size],
        variantStyles[variant],
        isNumericOnly && styles.circular,
        pulse && animatedStyle,
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      {displayText && (
        <Text
          style={[
            styles.text,
            textSizeStyles[size],
            { color: variantColors[variant].text },
            textStyle,
          ]}
        >
          {displayText}
        </Text>
      )}
    </Animated.View>
  );
}

// Positions a badge at the corner of another component
interface BadgeWrapperProps {
  children: React.ReactNode;
  badge: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  offset?: { x?: number; y?: number };
}

export function BadgeWrapper({
  children,
  badge,
  position = 'top-right',
  offset = {},
}: BadgeWrapperProps) {
  const { x = 0, y = 0 } = offset;
  
  const positionStyle: ViewStyle = {
    position: 'absolute',
    ...positionStyles[position],
    transform: [
      { translateX: x },
      { translateY: y },
    ],
  };

  return (
    <View style={styles.wrapper}>
      {children}
      <View style={positionStyle}>{badge}</View>
    </View>
  );
}

const positionStyles: Record<string, ViewStyle> = {
  'top-right': { top: -4, right: -4 },
  'top-left': { top: -4, left: -4 },
  'bottom-right': { bottom: -4, right: -4 },
  'bottom-left': { bottom: -4, left: -4 },
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circular: {
    aspectRatio: 1,
  },
  text: {
    fontWeight: Typography.weight.semibold,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  dot: {},
});

const sizeStyles: Record<BadgeSize, ViewStyle> = {
  sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    minWidth: 18,
    height: 18,
  },
  md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minWidth: 22,
    height: 22,
  },
  lg: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minWidth: 28,
    height: 28,
  },
};

const textSizeStyles: Record<BadgeSize, TextStyle> = {
  sm: { fontSize: 10 },
  md: { fontSize: 12 },
  lg: { fontSize: 14 },
};

const dotSizes: Record<BadgeSize, number> = {
  sm: 6,
  md: 8,
  lg: 10,
};

const variantColors: Record<BadgeVariant, { background: string; text: string }> = {
  primary: { background: Colors.primary.main, text: '#fff' },
  secondary: { background: Colors.surface.secondary, text: Colors.text.primary },
  success: { background: Colors.accent.green, text: '#fff' },
  warning: { background: Colors.accent.yellow, text: Colors.background.primary },
  danger: { background: Colors.accent.red, text: '#fff' },
  info: { background: Colors.accent.cyan, text: Colors.background.primary },
  outline: { background: 'transparent', text: Colors.primary.main },
};

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  primary: { backgroundColor: variantColors.primary.background },
  secondary: { backgroundColor: variantColors.secondary.background },
  success: { backgroundColor: variantColors.success.background },
  warning: { backgroundColor: variantColors.warning.background },
  danger: { backgroundColor: variantColors.danger.background },
  info: { backgroundColor: variantColors.info.background },
  outline: { 
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary.main,
  },
};

export default Badge;
