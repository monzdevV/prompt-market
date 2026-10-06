/**
 * PARTYUP Input Component
 * ===========================
 * Text input field with variants and validation
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '@/src/constants/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

export type InputVariant = 'default' | 'filled' | 'outlined';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  variant?: InputVariant;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  disabled?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  helper,
  variant = 'default',
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  disabled = false,
  secureTextEntry,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const focusAnim = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: 200 });
    props.onFocus?.(null as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: 200 });
    props.onBlur?.(null as any);
  };

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      [
        error ? Colors.accent.red : Colors.ui.border,
        error ? Colors.accent.red : Colors.primary.main,
      ]
    );

    return { borderColor };
  });

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.inputContainer,
      ...variantStyles[variant],
    };

    if (disabled) {
      return { ...baseStyle, backgroundColor: Colors.gray[100] };
    }

    return baseStyle;
  };

  const actualSecureEntry = secureTextEntry && !isPasswordVisible;
  const showPasswordToggle = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
        </Text>
      )}

      <AnimatedView style={[getContainerStyle(), animatedBorderStyle]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? Colors.primary.main : Colors.gray[400]}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          ref={ref}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholderTextColor={Colors.gray[400]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          secureTextEntry={actualSecureEntry}
          {...props}
        />

        {showPasswordToggle ? (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIconContainer}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.gray[400]}
            />
          </Pressable>
        ) : rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIconContainer}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={isFocused ? Colors.primary.main : Colors.gray[400]}
            />
          </Pressable>
        ) : null}
      </AnimatedView>

      {(error || helper) && (
        <Text style={[styles.helper, error && styles.helperError]}>
          {error || helper}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  labelError: {
    color: Colors.accent.red,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.base,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    height: '100%',
  },
  inputWithLeftIcon: {
    marginLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    marginRight: Spacing.sm,
  },
  leftIcon: {
    marginRight: Spacing.xs,
  },
  rightIconContainer: {
    padding: Spacing.xs,
  },
  helper: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  helperError: {
    color: Colors.accent.red,
  },
});

const variantStyles: Record<InputVariant, ViewStyle> = {
  default: {
    backgroundColor: Colors.ui.background,
    borderColor: Colors.ui.border,
  },
  filled: {
    backgroundColor: Colors.ui.backgroundSecondary,
    borderColor: 'transparent',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: Colors.ui.border,
  },
};

export default Input;
