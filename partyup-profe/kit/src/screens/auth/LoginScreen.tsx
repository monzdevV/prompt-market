/**
 * PARTYUP Login Screen
 * ========================
 * Apple Sign In (iOS) and Google Sign In authentication
 * Full-screen looping video background with dark gradient overlay
 */

import { openLegalLink } from '@/src/constants/legal';
import { BrandName } from '@/src/components/ui/BrandName';
import { Colors, Spacing, Typography } from '@/src/constants/theme';
import {
  AuthResult,
  setLoginInProgress,
  signInWithApple,
  signInWithGoogle,
} from '@/src/services/authService';
import { prefetchAppData } from '@/src/services/prefetchService';
import { hasProEntitlement } from '@/src/services/subscriptionService';
import { useApp } from '@/src/store';
import { Ionicons } from '@expo/vector-icons';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const videoSource = require('../../../assets/videos/login_video.mov');

export default function LoginScreen() {
  const { t } = useTranslation();
  const { dispatch } = useApp();
  const [activeProvider, setActiveProvider] = useState<'apple' | 'google' | null>(null);
  const videoRef = useRef<Video>(null);

  /**
   * Hydrates the entire app state from an AuthResult, then prefetches
   * ALL data the app needs (party room, calendar, etc.) before clearing
   * the loading screen. The user stays on the spinner until everything
   * is ready so every tab renders instantly.
   */
  const hydrateAppState = useCallback(async (result: AuthResult) => {
    // Force loading screen visible while prefetching all data
    dispatch({ type: 'SET_LOADING', payload: true });

    // Immediately set basic auth state so AuthGuard knows we're logged in
    dispatch({ type: 'SET_USER', payload: result.user });
    dispatch({ type: 'SET_NEEDS_USERNAME', payload: result.needsUsername });

    if (result.customerInfo) {
      const isPro = hasProEntitlement(result.customerInfo);
      dispatch({ type: 'SET_PREMIUM_STATUS', payload: isPro });
    }

    console.log('[Login] Starting prefetch...');
    const prefetched = await prefetchAppData(result.user.id);
    console.log('[Login] Prefetch complete, applying to store...');

    if (prefetched.networkFailed) {
      throw new Error('Unable to load app data. Please check your connection.');
    }

    if (prefetched.user) {
      dispatch({ type: 'SET_USER', payload: prefetched.user });
      dispatch({ type: 'SET_NEEDS_USERNAME', payload: !prefetched.user.username });
    }

    dispatch({ type: 'SET_PREMIUM_STATUS', payload: prefetched.isPremium });

    if (prefetched.party) {
      dispatch({ type: 'SET_CURRENT_PARTY', payload: prefetched.party });
      dispatch({ type: 'SET_PHOTOS', payload: prefetched.partyPhotos });
      dispatch({ type: 'SET_NOTES', payload: prefetched.partyNotes });
      dispatch({ type: 'SET_PHOTO_REACTIONS', payload: prefetched.partyReactions });
    }

    console.log('[Login] All data applied, clearing loading screen');
    dispatch({ type: 'SET_LOADING', payload: false });
  }, [dispatch]);

  const handleAppleSignIn = async () => {
    try {
      setActiveProvider('apple');
      setLoginInProgress(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await signInWithApple();
      await hydrateAppState(result);
    } catch (error: unknown) {
      console.error('[Auth] Apple Sign In error:', error);
      const message = error instanceof Error ? error.message : t('auth.unknownError');
      // Invertase throws error code 1001 when the user cancels the Apple Sign In flow
      const isCanceled = message.includes('1001');
      if (!isCanceled) {
        Alert.alert(t('auth.signInFailed'), message);
      }
    } finally {
      setActiveProvider(null);
      setLoginInProgress(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setActiveProvider('google');
      setLoginInProgress(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await signInWithGoogle();
      await hydrateAppState(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.unknownError');
      Alert.alert(t('auth.signInFailed'), message);
    } finally {
      setActiveProvider(null);
      setLoginInProgress(false);
    }
  };

  const handleTermsPress = () => {
    openLegalLink('terms');
  };

  const handlePrivacyPress = () => {
    openLegalLink('privacy');
  };

  return (
    <View style={styles.container}>
      {/* Background video */}
      <Video
        ref={videoRef}
        source={videoSource}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Center content: logo + text */}
        <View style={styles.content}>
          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            style={styles.titleContainer}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.logo}
                contentFit="cover"
              />
            </View>
            <Text style={styles.title}>{t('auth.welcomeTo')}</Text>
            <BrandName size={52} style={{ fontWeight: '900', letterSpacing: 2, marginTop: -5 }} />
            <Text style={styles.subtitle}>
              {t('auth.subtitle')}
            </Text>
          </Animated.View>
        </View>

        {/* Auth buttons */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(400)}
          style={styles.buttonsWrapper}
        >
          <View style={styles.loadingIndicatorContainer}>
            {activeProvider ? (
              <ActivityIndicator size="small" color={Colors.primary.main} />
            ) : null}
          </View>

          <View style={styles.buttonsContainer}>
            {/* Apple Sign In - iOS only */}
            {Platform.OS === 'ios' && (
              <View pointerEvents={activeProvider === 'google' ? 'none' : 'auto'}>
                <AppleButton
                  buttonType={AppleButton.Type.SIGN_IN}
                  buttonStyle={AppleButton.Style.WHITE}
                  cornerRadius={14}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </View>
            )}

            {/* Google Sign In */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={activeProvider !== null}
              style={({ pressed }) => [
                styles.googleButton,
                pressed && !activeProvider && styles.buttonPressed,
              ]}
            >
              <Ionicons name="logo-google" size={20} color="#000" />
              <Text style={styles.googleButtonText}>{t('auth.signInGoogle')}</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Legal links */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(600)}
          style={styles.legalContainer}
        >
          <Pressable onPress={handleTermsPress} hitSlop={8}>
            <Text style={styles.legalLink}>{t('auth.termsOfService')}</Text>
          </Pressable>
          <Pressable onPress={handlePrivacyPress} hitSlop={8}>
            <Text style={styles.legalLink}>{t('auth.privacyPolicy')}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

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
  titleContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logo: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  buttonsWrapper: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  loadingIndicatorContainer: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonsContainer: {
    gap: Spacing.sm,
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  googleButton: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  googleButtonText: {
    fontSize: Typography.size.base,
    fontWeight: '600',
    color: '#000000',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  legalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  legalLink: {
    fontSize: Typography.size.xs,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 16,
  },
});
