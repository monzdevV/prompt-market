/**
 * PARTYUP Custom Hooks
 * ========================
 * Custom hooks for animation and utility
 */

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Keyboard, Platform } from 'react-native';
import {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

// ============================================
// ANIMATIONS
// ============================================

/**
 * Hook for press scale animation
 */
export function usePressAnimation(config?: { scale?: number; duration?: number }) {
  const { scale = 0.95, duration = 100 } = config || {};
  const animatedScale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    animatedScale.value = withTiming(scale, { duration });
  }, [scale, duration]);

  const onPressOut = useCallback(() => {
    animatedScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}

/**
 * Hook for pulse animation
 */
export function usePulseAnimation(config?: { 
  minScale?: number; 
  maxScale?: number; 
  duration?: number;
  autoStart?: boolean;
}) {
  const { 
    minScale = 0.95, 
    maxScale = 1.05, 
    duration = 1000,
    autoStart = true,
  } = config || {};
  
  const scale = useSharedValue(1);
  const isAnimating = useSharedValue(autoStart);

  useEffect(() => {
    if (autoStart) {
      scale.value = withRepeat(
        withSequence(
          withTiming(maxScale, { duration: duration / 2 }),
          withTiming(minScale, { duration: duration / 2 })
        ),
        -1,
        true
      );
    }
  }, [autoStart]);

  const start = useCallback(() => {
    isAnimating.value = true;
    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: duration / 2 }),
        withTiming(minScale, { duration: duration / 2 })
      ),
      -1,
      true
    );
  }, []);

  const stop = useCallback(() => {
    isAnimating.value = false;
    scale.value = withSpring(1);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, start, stop };
}

/**
 * Hook for shake animation (error feedback)
 */
export function useShakeAnimation() {
  const translateX = useSharedValue(0);

  const shake = useCallback(() => {
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { animatedStyle, shake };
}

/**
 * Hook for fade + slide entry animation
 */
export function useFadeSlideAnimation(config?: {
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  delay?: number;
}) {
  const {
    direction = 'up',
    distance = 20,
    duration = 300,
    delay = 0,
  } = config || {};

  const opacity = useSharedValue(0);
  const translateX = useSharedValue(direction === 'left' ? distance : direction === 'right' ? -distance : 0);
  const translateY = useSharedValue(direction === 'up' ? distance : direction === 'down' ? -distance : 0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withTiming(1, { duration });
      translateX.value = withSpring(0, { damping: 15 });
      translateY.value = withSpring(0, { damping: 15 });
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return { animatedStyle };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Hook to detect keyboard visibility
 */
export function useKeyboardVisible() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}

/**
 * Hook to detect if the app is in the foreground.
 * `justBecameActive` is a one-shot flag that is `true` for exactly one
 * render cycle after the app transitions to the active state, then
 * auto-resets to `false`.
 */
export function useAppState() {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [justBecameActive, setJustBecameActive] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState((prev) => {
        if (prev !== 'active' && nextState === 'active') {
          setJustBecameActive(true);
        }
        return nextState;
      });
    });
    return () => subscription.remove();
  }, []);

  // Auto-reset after one render cycle
  useEffect(() => {
    if (justBecameActive) {
      setJustBecameActive(false);
    }
  }, [justBecameActive]);

  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    justBecameActive,
  };
}

/**
 * Hook for debounce
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for countdown timer
 */
export function useCountdown(initialSeconds: number, autoStart: boolean = false) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds]);

  const formatTime = useCallback((secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  }, []);

  return {
    seconds,
    isRunning,
    isFinished: seconds === 0,
    formattedTime: formatTime(seconds),
    start,
    pause,
    reset,
  };
}

/**
 * Hook for challenge countdown derived from the server-authoritative expiresAt timestamp.
 * Returns remaining time, formatted string, and state flags.
 */
export function useChallengeCountdown(expiresAt: string) {
  const computeRemaining = useCallback(() => {
    const deadline = new Date(expiresAt).getTime();
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  }, [expiresAt]);

  const [remainingSeconds, setRemainingSeconds] = useState(computeRemaining);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setRemainingSeconds(computeRemaining());

    intervalRef.current = setInterval(() => {
      const next = computeRemaining();
      setRemainingSeconds(next);
      if (next <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [computeRemaining]);

  const formattedTime = useCallback((secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }, []);

  return {
    remainingSeconds,
    formattedTime: formattedTime(remainingSeconds),
    isExpired: remainingSeconds <= 0,
    isUrgent: remainingSeconds > 0 && remainingSeconds <= 120,
  };
}

/**
 * Hook for haptic feedback helpers
 */
export function useHaptics() {
  const light = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const medium = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const heavy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const success = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const warning = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const error = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const selection = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  return { light, medium, heavy, success, warning, error, selection };
}

/**
 * Returns a tick counter that increments every `intervalMs` while `active` is true.
 * Useful for forcing re-renders on a schedule (e.g. expiring challenge cards).
 */
export function useTick(active: boolean, intervalMs = 1000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return tick;
}

export { useNetworkMonitor } from './useNetworkMonitor';

export default {
  usePressAnimation,
  usePulseAnimation,
  useShakeAnimation,
  useFadeSlideAnimation,
  useKeyboardVisible,
  useAppState,
  useDebounce,
  useCountdown,
  useChallengeCountdown,
  useHaptics,
  useTick,
};
