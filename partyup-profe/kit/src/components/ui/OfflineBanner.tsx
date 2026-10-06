/**
 * PARTYUP Offline Banner
 * =======================
 * Slim banner displayed at the top of the app when the user loses
 * internet connectivity while already inside the app. Slides in/out
 * with animation and auto-hides when connectivity is restored.
 */

import { Colors, Typography, Spacing } from '@/src/constants/theme';
import { useApp } from '@/src/store';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export function OfflineBanner() {
  const { state } = useApp();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (state.isOnline || state.isLoading) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={[styles.container, { paddingTop: insets.top + Spacing.xs }]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
        <Text style={styles.text}>{t('network.offlineBanner')}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingBottom: Spacing.sm,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  text: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: '#FFFFFF',
  },
});
