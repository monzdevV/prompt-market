/**
 * PARTYUP Connection Error Screen
 * ================================
 * Full-screen overlay shown by AuthGuard when the prefetch fails due to
 * a network error. Blocks the app from opening with incomplete data.
 * Provides a manual retry button and auto-retries when connectivity returns.
 */

import { Colors, Typography, Spacing, BorderRadius, Layout, Shadows } from '@/src/constants/theme';
import { usePressAnimation } from '@/src/hooks';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface ConnectionErrorScreenProps {
  onRetry: () => void;
}

export function ConnectionErrorScreen({ onRetry }: ConnectionErrorScreenProps) {
  const { t } = useTranslation();
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({ scale: 0.96 });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={Colors.text.muted} />
          </View>

          <Text style={styles.title}>{t('network.noConnection')}</Text>
          <Text style={styles.subtitle}>{t('network.noConnectionMessage')}</Text>

          <Animated.View style={[styles.buttonWrapper, animatedStyle]}>
            <Pressable
              onPress={onRetry}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={styles.retryButton}
            >
              <Ionicons name="refresh-outline" size={20} color={Colors.text.inverse} />
              <Text style={styles.retryText}>{t('network.retry')}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
  },
  buttonWrapper: {
    width: '100%',
    paddingHorizontal: Spacing['2xl'],
  },
  retryButton: {
    height: Layout.buttonHeight.lg,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.glowSoft,
  },
  retryText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.inverse,
  },
});
