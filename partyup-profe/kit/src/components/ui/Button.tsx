/**
 * PARTYUP Button Component
 * ============================
 * Primary button with variants and animations
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout } from '@/src/constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
  gradient?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
  gradient = false,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...sizes[size],
      ...(fullWidth && styles.fullWidth),
    };

    if (disabled) {
      return { ...baseStyle, ...styles.disabled };
    }

    return { ...baseStyle, ...variants[variant] };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...styles.text,
      ...textSizes[size],
    };

    if (disabled) {
      return { ...baseTextStyle, color: Colors.gray[400] };
    }

    return { ...baseTextStyle, ...textVariants[variant] };
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.primary.main}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </>
  );

  if (gradient && variant === 'primary' && !disabled) {
    return (
      <AnimatedTouchable
        style={[animatedStyle, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled || loading}
      >
        <LinearGradient
          colors={Colors.primary.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[getButtonStyle(), styles.gradient]}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      style={[animatedStyle, getButtonStyle(), style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled || loading}
    >
      {renderContent()}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    backgroundColor: Colors.gray[100],
  },
  text: {
    fontWeight: Typography.weight.semibold,
  },
  gradient: {
    ...Shadows.button,
  },
});

const variants: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: Colors.primary.main,
    ...Shadows.button,
  },
  secondary: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary.main,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.accent.red,
  },
};

const textVariants: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: '#fff',
  },
  secondary: {
    color: Colors.text.primary,
  },
  outline: {
    color: Colors.primary.main,
  },
  ghost: {
    color: Colors.primary.main,
  },
  danger: {
    color: '#fff',
  },
};

const sizes: Record<ButtonSize, ViewStyle> = {
  sm: {
    height: Layout.buttonHeight.sm,
    paddingHorizontal: Spacing.base,
  },
  md: {
    height: Layout.buttonHeight.md,
    paddingHorizontal: Spacing.lg,
  },
  lg: {
    height: Layout.buttonHeight.lg,
    paddingHorizontal: Spacing.xl,
  },
};

const textSizes: Record<ButtonSize, TextStyle> = {
  sm: {
    fontSize: Typography.size.sm,
  },
  md: {
    fontSize: Typography.size.md,
  },
  lg: {
    fontSize: Typography.size.base,
  },
};

export default Button;
