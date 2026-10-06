/**
 * Global toast notification pill.
 * Reads `state.ui.toastMessage` from the store and auto-dismisses after a short delay.
 */

import { Spacing, ZIndex } from '@/src/constants/theme';
import { useApp } from '@/src/store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const TOAST_DURATION_MS = 2_000;

export function Toast() {
  const { state, dispatch } = useApp();
  const message = state.ui.toastMessage;

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST' });
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [message, dispatch]);

  if (!message) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: ZIndex.toast,
  },
  pill: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
