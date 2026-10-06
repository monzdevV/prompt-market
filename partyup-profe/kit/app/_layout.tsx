/**
 * PARTYUP Root Layout
 * ===================
 * Root navigation with auth protection and providers
 */

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PRESERVED_STORAGE_KEYS } from '@/src/i18n';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Image as ExpoImage } from 'expo-image';
import { ConnectionErrorScreen } from '@/src/components/ui/ConnectionErrorScreen';
import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { Colors } from '@/src/constants/theme';
import { useAppState, useNetworkMonitor } from '@/src/hooks';
import { getCurrentUser, isLoginInProgress, onAuthStateChange } from '@/src/services/authService';
import {
  configureNotifications,
  registerForPushNotifications,
} from '@/src/services/notificationService';
import { prefetchAppData, PrefetchResult } from '@/src/services/prefetchService';
import {
  addCustomerInfoListener,
  configureSubscriptions,
  hasProEntitlement,
  loginUser,
  logoutUser,
} from '@/src/services/subscriptionService';
import { AppProvider, useApp } from '@/src/store';
import { GameProvider, useGameStore } from '@/src/store/gameStore';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

const PreviasDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary.main,
    background: "#0A0A0A",
    card: "#1A1A1A",
    text: "#FFFFFF",
    border: "#2A2A2A",
    notification: Colors.accent.red,
  },
};

// ============================================
// AUTH GUARD
// ============================================

const AUTH_TIMEOUT_MS = 15_000;

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useApp();
  const { dispatch: gameDispatch } = useGameStore();
  const segments = useSegments();
  const router = useRouter();
  const [connectionFailed, setConnectionFailed] = useState(false);

  useNetworkMonitor();

  // Listen to auth state changes.
  // When user signs in: force loading. When user is null (logout): nuclear cleanup.
  useEffect(() => {
    const { unsubscribe } = onAuthStateChange((user) => {
      dispatch({ type: 'SET_USER', payload: user });
      if (user) {
        dispatch({ type: 'SET_LOADING', payload: true });
      } else {
        dispatch({ type: 'SET_PREMIUM_STATUS', payload: false });
        gameDispatch({ type: 'RESET' });
        // Push tokens are removed in signOut() *before* the session ends
        // (here the user is already null and RLS would reject the delete).
        logoutUser().catch(() => {});
        ExpoImage.clearMemoryCache();
        ExpoImage.clearDiskCache();
        // Clear session/user caches but keep device preferences (language…).
        AsyncStorage.getAllKeys()
          .then(keys => AsyncStorage.multiRemove(keys.filter(k => !PRESERVED_STORAGE_KEYS.includes(k))))
          .catch(() => {});
        setConnectionFailed(false);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => { unsubscribe(); };
  }, [dispatch, gameDispatch]);

  // Apply prefetch result to the global store
  const applyPrefetchResult = useCallback((prefetched: PrefetchResult) => {
    if (prefetched.user) {
      dispatch({ type: 'SET_USER', payload: prefetched.user });
      dispatch({ type: 'SET_NEEDS_USERNAME', payload: !prefetched.user.username });
    } else {
      dispatch({ type: 'SET_NEEDS_USERNAME', payload: !state.user?.username });
    }

    dispatch({ type: 'SET_PREMIUM_STATUS', payload: prefetched.isPremium });

    if (prefetched.party) {
      dispatch({ type: 'SET_CURRENT_PARTY', payload: prefetched.party });
      dispatch({ type: 'SET_PHOTOS', payload: prefetched.partyPhotos });
      dispatch({ type: 'SET_NOTES', payload: prefetched.partyNotes });
      dispatch({ type: 'SET_PHOTO_REACTIONS', payload: prefetched.partyReactions });
    }
  }, [dispatch, state.user?.username]);

  // Prefetch all data after session restoration (cold start with existing session).
  // If the prefetch fails due to network, set connectionFailed instead of opening the app.
  useEffect(() => {
    if (!state.isAuthenticated || !state.isLoading || !state.user) return;
    if (isLoginInProgress()) return;

    let cancelled = false;
    let didFailNetwork = false;

    (async () => {
      try {
        const prefetched = await prefetchAppData(state.user!.id);
        if (cancelled) return;

        if (prefetched.networkFailed) {
          didFailNetwork = true;
          setConnectionFailed(true);
          return;
        }

        applyPrefetchResult(prefetched);
      } finally {
        if (!cancelled && !didFailNetwork) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [state.isAuthenticated, state.isLoading, state.user, dispatch, applyPrefetchResult]);

  // Safety timeout: prevent getting stuck on loading when there IS connectivity
  // but a request hangs. Skipped when connectionFailed is active.
  useEffect(() => {
    if (!state.isLoading || connectionFailed) return;

    const timeout = setTimeout(() => {
      dispatch({ type: 'SET_LOADING', payload: false });
    }, AUTH_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [state.isLoading, connectionFailed, dispatch]);

  // Auto-retry prefetch when connectivity is restored after a connection failure
  useEffect(() => {
    if (!state.isOnline || !connectionFailed || !state.user) return;

    let cancelled = false;
    setConnectionFailed(false);
    dispatch({ type: 'SET_LOADING', payload: true });

    (async () => {
      try {
        const prefetched = await prefetchAppData(state.user!.id);
        if (cancelled) return;

        if (prefetched.networkFailed) {
          setConnectionFailed(true);
          return;
        }

        applyPrefetchResult(prefetched);
      } finally {
        if (!cancelled) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [state.isOnline, connectionFailed]);

  // Manual retry callback for the ConnectionErrorScreen button
  const retryPrefetch = useCallback(async () => {
    if (!state.user) return;

    setConnectionFailed(false);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const prefetched = await prefetchAppData(state.user.id);

      if (prefetched.networkFailed) {
        setConnectionFailed(true);
        return;
      }

      applyPrefetchResult(prefetched);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.user, dispatch, applyPrefetchResult]);

  // Register push token after authentication
  useEffect(() => {
    if (!state.isAuthenticated || !state.user || state.isLoading) return;

    registerForPushNotifications().catch((err) => {
      console.warn('[AuthGuard] Failed to register push token:', err);
    });
  }, [state.isAuthenticated, state.user, state.isLoading]);

  // Re-sync user profile and premium status when the app returns from background
  const { justBecameActive } = useAppState();
  const userIdRef = useRef(state.user?.id);
  userIdRef.current = state.user?.id;
  const dbPremiumRef = useRef(state.user?.isPremium ?? false);
  dbPremiumRef.current = state.user?.isPremium ?? false;

  useEffect(() => {
    if (!justBecameActive || !state.isAuthenticated || !userIdRef.current || state.isLoading) return;

    const userId = userIdRef.current;
    Promise.all([
      getCurrentUser().catch(() => null),
      loginUser(userId).catch(() => null),
    ]).then(([fullUser, customerInfo]) => {
      if (fullUser) {
        dispatch({ type: 'SET_USER', payload: fullUser });
        dispatch({ type: 'SET_NEEDS_USERNAME', payload: !fullUser.username });
      }
      const rcPro = customerInfo ? hasProEntitlement(customerInfo) : false;
      const dbPro = fullUser?.isPremium ?? false;
      dispatch({ type: 'SET_PREMIUM_STATUS', payload: rcPro || dbPro });
    });
  }, [justBecameActive, state.isAuthenticated, state.isLoading, dispatch]);

  // Listen to real-time RevenueCat customer info updates
  useEffect(() => {
    if (!state.isAuthenticated || !state.user) return;

    const unsubscribe = addCustomerInfoListener((customerInfo) => {
      const rcPro = hasProEntitlement(customerInfo);
      dispatch({ type: 'SET_PREMIUM_STATUS', payload: rcPro || dbPremiumRef.current });
    });

    return unsubscribe;
  }, [state.isAuthenticated, state.user, dispatch]);

  // Navigation redirect tracking
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    if (state.isLoading || connectionFailed) return;

    // When offline, stay on the splash-like loading screen instead of
    // redirecting to username-setup (profile data may be incomplete).
    if (!state.isOnline && state.isAuthenticated && state.needsUsername) return;

    const currentSegment = segments[0] as string;
    const inAuthGroup = currentSegment === 'auth';
    const inOnboarding = currentSegment === 'onboarding';
    const inUsernameSetup = currentSegment === 'username-setup';

    if (!state.isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/onboarding' as any);
    } else if (state.isAuthenticated && (inAuthGroup || inOnboarding)) {
      if (state.needsUsername) {
        router.replace({ pathname: '/username-setup', params: { mode: 'onboarding' } });
      } else {
        router.replace('/(tabs)/party');
      }
    } else if (state.isAuthenticated && state.needsUsername && !inUsernameSetup) {
      router.replace({ pathname: '/username-setup', params: { mode: 'onboarding' } });
    } else {
      setNavigationReady(true);
    }
  }, [state.isAuthenticated, state.isLoading, state.isOnline, state.needsUsername, connectionFailed, segments, router]);

  useEffect(() => {
    if (!state.isLoading && !connectionFailed && navigationReady) {
      SplashScreen.hideAsync();
    }
  }, [state.isLoading, connectionFailed, navigationReady]);

  if (connectionFailed) {
    return <ConnectionErrorScreen onRetry={retryPrefetch} />;
  }

  if (state.isLoading || !navigationReady) {
    return (
      <View style={loadingStyles.container}>
        <Image
          source={require('@/assets/images/icon-splash.png')}
          style={loadingStyles.logo}
          contentFit="contain"
        />
      </View>
    );
  }

  return <React.Fragment key={state.user?.id ?? 'logged-out'}>{children}</React.Fragment>;
}

// ============================================
// ROOT LAYOUT
// ============================================

function RootLayoutContent() {
  return (
    <AuthGuard>
      <ThemeProvider value={PreviasDarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#0A0A0B' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen
            name="username-setup"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="avatar-setup"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="party"
            options={{
              headerShown: false,
              presentation: 'containedModal',
            }}
          />
          <Stack.Screen
            name="photo-sheet"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.75],
              sheetGrabberVisible: true,
              sheetCornerRadius: 38,
              sheetExpandsWhenScrolledToEdge: false,
              contentStyle: { backgroundColor: '#1C1C1E' },
            }}
          />
          <Stack.Screen
            name="note-sheet"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.65],
              sheetGrabberVisible: true,
              sheetCornerRadius: 38,
              sheetExpandsWhenScrolledToEdge: false,
              contentStyle: { backgroundColor: '#1C1C1E' },
            }}
          />
          <Stack.Screen
            name="note-editor"
            options={{
              headerShown: true,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              headerStyle: { backgroundColor: '#0A0A0B' },
              headerTintColor: '#fff',
              headerShadowVisible: false,
              headerTitle: '',
            }}
          />
          <Stack.Screen
            name="paywall-sheet"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.78],
              sheetGrabberVisible: true,
              sheetCornerRadius: 38,
              sheetExpandsWhenScrolledToEdge: false,
              contentStyle: { backgroundColor: '#0A0A0B' },
            }}
          />
          <Stack.Screen
            name="username-sheet"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.45],
              sheetGrabberVisible: true,
              sheetCornerRadius: 38,
              sheetExpandsWhenScrolledToEdge: false,
              contentStyle: { backgroundColor: '#0A0A0B' },
            }}
          />
          <Stack.Screen
            name="avatar-sheet"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.55],
              sheetGrabberVisible: true,
              sheetCornerRadius: 38,
              sheetExpandsWhenScrolledToEdge: false,
              contentStyle: { backgroundColor: '#0A0A0B' },
            }}
          />
          <Stack.Screen
            name="club-detail-sheet"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.78],
              sheetGrabberVisible: true,
              sheetCornerRadius: 38,
              sheetExpandsWhenScrolledToEdge: false,
              contentStyle: { backgroundColor: '#0A0A0B' },
            }}
          />
          <Stack.Screen
            name="challenge-results-sheet"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              contentStyle: { backgroundColor: '#0A0A0B' },
            }}
          />
          <Stack.Screen
            name="games"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }}
          />
        </Stack>
        <OfflineBanner />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthGuard>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 80,
    height: 80,
  },
});

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#0A0A0B');
    configureSubscriptions();
    configureNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A0A0B' }}>
      <SafeAreaProvider>
        <AppProvider>
          <GameProvider>
            <RootLayoutContent />
          </GameProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
