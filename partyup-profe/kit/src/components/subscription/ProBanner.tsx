/**
 * PARTYUP Pro Banner
 * ========================
 * Red gradient banner shown on non-premium party features.
 * Displays pro.png sticker with "You're missing out" text.
 * Tapping navigates to the paywall.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface ProBannerProps {
  /** Optional custom text */
  text?: string;
}

export function ProBanner({ text }: ProBannerProps) {
  const { t } = useTranslation();
  const displayText = text ?? t('profile.youAreMissingOut');
  const scale = useSharedValue(1);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.97, { duration: 60 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );
    router.push('/paywall-sheet');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable onPress={handlePress} style={styles.pressable}>
        <LinearGradient
          colors={['#FF2D55', '#FF3B30', '#FF6B6B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {/* Background pattern - subtle bell/party icons */}
          <View style={styles.patternOverlay} pointerEvents="none">
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.patternIcon,
                  {
                    left: `${12 + i * 12}%`,
                    top: `${15 + (i % 3) * 25}%`,
                    opacity: 0.12 + (i % 3) * 0.04,
                    transform: [{ rotate: `${-15 + i * 10}deg` }, { scale: 0.6 + (i % 3) * 0.2 }],
                  },
                ]}
              >
                <Ionicons name="notifications" size={18} color="#fff" />
              </View>
            ))}
          </View>

          {/* Pro sticker on the left */}
          <View style={styles.stickerContainer}>
            <Image
              source={require('@/assets/emojis/pro.png')}
              style={styles.proSticker}
              resizeMode="contain"
            />
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={styles.bannerText}>{displayText}</Text>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    marginHorizontal: 0,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  pressable: {
    flex: 1,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
    position: 'relative',
    overflow: 'hidden',
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  patternIcon: {
    position: 'absolute',
  },
  stickerContainer: {
    marginRight: 14,
  },
  proSticker: {
    width: 48,
    height: 48,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
