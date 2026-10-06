/**
 * FloatingFooter
 * ==============
 * iOS-style floating bottom accessory that mimics Apple's native system UI.
 * Optimized for Expo Router SDK 55+ Tabs.BottomAccessory slot.
 * 
 * Usage (with Tabs.BottomAccessory):
 * ----------------------------------
 * <Tabs>
 *   <Tabs.Screen ... />
 *   <Tabs.BottomAccessory>
 *     <FloatingFooter
 *       visible={true}
 *       primaryLabel="Designing…"
 *       secondaryLabel="Assistant"
 *     />
 *   </Tabs.BottomAccessory>
 * </Tabs>
 * 
 * Native iOS Features:
 * - SF Symbols via expo-symbols SymbolView
 * - systemChromeMaterialDark blur
 * - Native haptic feedback
 * - SF Pro typography
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Spacing } from '@/src/constants/theme';

// ============================================
// TYPES
// ============================================

export interface FloatingFooterProps {
  /** Controls visibility with animation */
  visible?: boolean;
  /** Primary label text (e.g., "Designing…") */
  primaryLabel?: string;
  /** Secondary label text (e.g., "Assistant") */
  secondaryLabel?: string;
  /** Left button icon element (defaults to SF Symbol mic on iOS) */
  leftIcon?: React.ReactNode;
  /** Right button icon element (defaults to SF Symbol xmark on iOS) */
  rightIcon?: React.ReactNode;
  /** Left SF Symbol name (iOS only, e.g., "mic", "waveform") */
  leftSymbol?: string;
  /** Right SF Symbol name (iOS only, e.g., "xmark", "stop.fill") */
  rightSymbol?: string;
  /** Left button press handler */
  onLeftPress?: () => void;
  /** Right button press handler */
  onRightPress?: () => void;
  /** Center area press handler */
  onCenterPress?: () => void;
  /** Custom style for outer container */
  style?: ViewStyle;
}

// ============================================
// CONSTANTS - iOS System UI Specifications
// ============================================

const FOOTER_HEIGHT = 56;
const BUTTON_SIZE = 44;
const BUTTON_INNER_SIZE = 40;
const HORIZONTAL_PADDING = 8;
const BORDER_RADIUS = FOOTER_HEIGHT / 2; // Full capsule

// iOS system colors
const IOS_BLUR_TINT = 'systemChromeMaterialDark';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';
const BUTTON_BG = 'rgba(255, 255, 255, 0.12)';
const BUTTON_BG_PRESSED = 'rgba(255, 255, 255, 0.22)';

// Spring config for native feel
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

// ============================================
// ANIMATED PRESSABLE BUTTON
// ============================================

interface CircularButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
}

function CircularButton({ onPress, children, style }: CircularButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressed.value, [0, 1], [1, 0.7]),
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.92]) }],
  }));

  const handlePressIn = () => {
    pressed.value = withTiming(1, { duration: 60 });
    // Native haptic on press
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={() => {
        pressed.value = withSpring(0, SPRING_CONFIG);
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.buttonHitArea}
    >
      <Animated.View style={[styles.circularButton, animatedStyle, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// CENTER CONTENT PILL
// ============================================

interface CenterContentProps {
  primaryLabel?: string;
  secondaryLabel?: string;
  onPress?: () => void;
}

function CenterContent({ primaryLabel, secondaryLabel, onPress }: CenterContentProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressed.value, [0, 1], [1, 0.8]),
  }));

  const handlePressIn = () => {
    pressed.value = withTiming(1, { duration: 60 });
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={() => {
        pressed.value = withSpring(0, SPRING_CONFIG);
      }}
      style={styles.centerPressable}
      hitSlop={{ top: 6, bottom: 6 }}
    >
      <Animated.View style={[styles.centerContent, animatedStyle]}>
        {primaryLabel && (
          <Text style={styles.primaryLabel} numberOfLines={1}>
            {primaryLabel}
          </Text>
        )}
        {secondaryLabel && (
          <Text style={styles.secondaryLabel} numberOfLines={1}>
            {secondaryLabel}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FloatingFooter({
  visible = true,
  primaryLabel = 'Diseñando…',
  secondaryLabel = 'Asistente',
  leftIcon,
  rightIcon,
  leftSymbol = 'mic',
  rightSymbol = 'xmark',
  onLeftPress,
  onRightPress,
  onCenterPress,
  style,
}: FloatingFooterProps) {
  const progress = useSharedValue(visible ? 1 : 0);
  const [shouldRender, setShouldRender] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      progress.value = withSpring(1, SPRING_CONFIG);
    } else {
      progress.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
    }
  }, [visible]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1]) },
    ],
  }));

  if (!shouldRender) {
    return null;
  }

  // Render left icon: custom > SF Symbol > fallback
  const renderLeftIcon = () => {
    if (leftIcon) return leftIcon;
    if (Platform.OS === 'ios') {
      return (
        <SymbolView
          name={leftSymbol as any}
          size={20}
          tintColor="#FFFFFF"
          weight="medium"
        />
      );
    }
    return <DefaultMicIcon />;
  };

  // Render right icon: custom > SF Symbol > fallback
  const renderRightIcon = () => {
    if (rightIcon) return rightIcon;
    if (Platform.OS === 'ios') {
      return (
        <SymbolView
          name={rightSymbol as any}
          size={18}
          tintColor="#FFFFFF"
          weight="semibold"
        />
      );
    }
    return <DefaultCloseIcon />;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        animatedContainerStyle,
        style,
      ]}
      pointerEvents="box-none"
    >
      {/* Shadow layer */}
      <View style={styles.shadowLayer} />
      
      {/* Main pill container */}
      <View style={styles.pillContainer}>
        {/* Liquid Glass effect for iOS 26+ with BlurView fallback */}
        {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
          <GlassView style={styles.blurBackground} />
        ) : Platform.OS === 'ios' ? (
          <BlurView
            intensity={80}
            tint="systemChromeMaterialDark"
            style={styles.blurBackground}
          />
        ) : (
          <View style={styles.androidBackground} />
        )}

        {/* Border overlay */}
        <View style={styles.borderOverlay} />

        {/* Inner content */}
        <View style={styles.innerContent}>
          {/* Left button */}
          <CircularButton onPress={onLeftPress}>
            {renderLeftIcon()}
          </CircularButton>

          {/* Center expandable area */}
          <CenterContent
            primaryLabel={primaryLabel}
            secondaryLabel={secondaryLabel}
            onPress={onCenterPress}
          />

          {/* Right button */}
          <CircularButton onPress={onRightPress}>
            {renderRightIcon()}
          </CircularButton>
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================
// DEFAULT ICONS (SF Symbol-like)
// ============================================

function DefaultMicIcon() {
  return (
    <View style={styles.iconPlaceholder}>
      <View style={styles.micIcon}>
        <View style={styles.micHead} />
        <View style={styles.micBase} />
      </View>
    </View>
  );
}

function DefaultCloseIcon() {
  return (
    <View style={styles.iconPlaceholder}>
      <View style={styles.closeIcon}>
        <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
        <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    // Posicionamiento sobre el tab bar nativo de iPhone
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 88 + 12 : 65 + 12, // Tab bar height + margin
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    zIndex: 100,
  },

  shadowLayer: {
    position: 'absolute',
    top: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: 0,
    borderRadius: BORDER_RADIUS,
    // iOS native shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  pillContainer: {
    width: '100%',
    height: FOOTER_HEIGHT,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
  },

  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  androidBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(38, 38, 41, 0.85)',
  },

  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BORDER_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
  },

  innerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 8,
  },

  buttonHitArea: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },

  circularButton: {
    width: BUTTON_INNER_SIZE,
    height: BUTTON_INNER_SIZE,
    borderRadius: BUTTON_INNER_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerPressable: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },

  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },

  primaryLabel: {
    // iOS SF Pro Text - 15pt semibold
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.24,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto-Medium',
      },
    }),
  } as TextStyle,

  secondaryLabel: {
    // iOS SF Pro Text - 12pt regular
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0,
    marginTop: 1,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  } as TextStyle,

  // Default icon styles
  iconPlaceholder: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  micIcon: {
    alignItems: 'center',
  },

  micHead: {
    width: 10,
    height: 14,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },

  micBase: {
    width: 2,
    height: 6,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },

  closeIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeLine: {
    position: 'absolute',
    width: 16,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});

export default FloatingFooter;
