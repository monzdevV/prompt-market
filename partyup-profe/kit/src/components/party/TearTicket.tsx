/**
 * TearTicket -- Geometric perforation ticket, L->R horizontal swipe
 * ================================================================
 * Top half lifts & rotates during drag. After full tear: flies off from
 * current position, fades + shrinks smoothly once off-screen.
 * Confetti uses the app's ConfettiParticles radial burst system.
 *
 * Props:
 *  - expiresAt:  ISO timestamp; renders a live countdown on active tickets
 *  - isRedeemed: renders the ticket in "torn" state with faded top half
 *  - offerType:  accent color mapped to offer type (2x1, 3x2, custom)
 *  - disabled:   disables the swipe gesture (expired / already redeemed)
 *  - onTear:     callback fired once the tear animation completes
 */

import { BorderRadius, Colors, Shadows, Spacing } from '@/src/constants/theme';
import { OfferType } from '@/src/types';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import {
  ConfettiOverlay,
  useConfettiParticles,
} from '@/src/components/party/ConfettiParticles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const TOP_HEIGHT = 130;
const STUB_HEIGHT = 72;

const PERF_RADIUS = 4;
const PERF_DIAMETER = PERF_RADIUS * 2;
const PERF_STEP = 16;
const PERF_COUNT = Math.floor((CARD_WIDTH - 40) / PERF_STEP) + 1;
const PERF_START_X = (CARD_WIDTH - (PERF_COUNT - 1) * PERF_STEP) / 2;
const NOTCH_RADIUS = 10;
const BG = Colors.background.primary;

const ACCENT_BY_TYPE: Record<OfferType, string> = {
  '2x1': Colors.accent.orange,
  '3x2': Colors.accent.purple,
  custom: Colors.accent.green,
};

const TEAR_THRESHOLD = 0.8;

function useCountdown(expiresAt?: string): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('0:00');
        return;
      }
      const hours = Math.floor(diff / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      const secs = Math.floor((diff % 60_000) / 1_000);

      if (hours > 0) {
        setRemaining(
          `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
        );
      } else {
        setRemaining(`${mins}:${String(secs).padStart(2, '0')}`);
      }
    };

    update();
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

interface TearTicketProps {
  title?: string;
  subtitle?: string;
  code?: string;
  accentColor?: string;
  offerType?: OfferType;
  expiresAt?: string;
  isRedeemed?: boolean;
  disabled?: boolean;
  redeemedLabel?: string;
  swipeHintLabel?: string;
  onTear?: () => void;
}

function PerfCircle({
  index,
  edge,
  tearX,
}: {
  index: number;
  edge: 'bottom' | 'top';
  tearX: SharedValue<number>;
}) {
  const circleX = PERF_START_X + index * PERF_STEP;
  const breakPoint = circleX / CARD_WIDTH;

  const animStyle = useAnimatedStyle(() => {
    const progress = tearX.value / CARD_WIDTH;
    const opacity = interpolate(
      progress,
      [Math.max(0, breakPoint - 0.02), breakPoint + 0.05],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      progress,
      [Math.max(0, breakPoint - 0.01), breakPoint + 0.04],
      [1, 1.6],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.perfCircle,
        {
          left: circleX - PERF_RADIUS,
          ...(edge === 'bottom'
            ? { bottom: -PERF_RADIUS }
            : { top: -PERF_RADIUS }),
        },
        animStyle,
      ]}
    />
  );
}

export function TearTicket({
  title = 'VIP PASS',
  subtitle = 'Admit One - PartyUp',
  code = '#PARTY-2026',
  accentColor,
  offerType,
  expiresAt,
  isRedeemed = false,
  disabled = false,
  redeemedLabel = 'USED',
  swipeHintLabel = 'swipe to tear',
  onTear,
}: TearTicketProps) {
  const resolvedAccent = accentColor ?? (offerType ? ACCENT_BY_TYPE[offerType] : Colors.primary.main);
  const countdown = useCountdown(!isRedeemed ? expiresAt : undefined);
  const [isTornState, setIsTornState] = useState(isRedeemed);

  const { particles, spawnConfetti } = useConfettiParticles();

  const tearX = useSharedValue(isRedeemed ? CARD_WIDTH : 0);
  const isTorn = useSharedValue(isRedeemed);

  const topFlyY = useSharedValue(0);
  const topFlyX = useSharedValue(0);
  const topFlyRotate = useSharedValue(0);
  const topFlyOpacity = useSharedValue(isRedeemed ? 0.35 : 1);
  const topFlyScale = useSharedValue(1);

  const gestureStartX = useSharedValue(0);
  const gestureStartTearX = useSharedValue(0);
  const lastHapticBucket = useSharedValue(-1);

  const setTornState = useCallback(() => {
    setIsTornState(true);
  }, []);

  const fireConfetti = useCallback(() => {
    spawnConfetti(CARD_WIDTH / 2, TOP_HEIGHT / 2, 18);
  }, [spawnConfetti]);

  const onTearComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onTear?.();
  }, [onTear]);

  const hapticTick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const swipeGesture = Gesture.Pan()
    .enabled(!disabled && !isRedeemed)
    .activeOffsetX(8)
    .failOffsetX(-6)
    .failOffsetY([-14, 14])
    .onBegin((e) => {
      gestureStartX.value = e.x;
      gestureStartTearX.value = tearX.value;
    })
    .onUpdate((e) => {
      if (isTorn.value) return;
      const delta = e.x - gestureStartX.value;
      tearX.value = Math.max(
        0,
        Math.min(CARD_WIDTH, gestureStartTearX.value + delta),
      );

      const bucket = Math.floor(tearX.value / 22);
      if (bucket > lastHapticBucket.value) {
        lastHapticBucket.value = bucket;
        runOnJS(hapticTick)();
      }
    })
    .onEnd(() => {
      if (isTorn.value) return;

      if (tearX.value / CARD_WIDTH >= TEAR_THRESHOLD) {
        isTorn.value = true;

        tearX.value = withTiming(
          CARD_WIDTH,
          { duration: 120, easing: Easing.out(Easing.cubic) },
          () => {
            topFlyRotate.value = withTiming(8, {
              duration: 450,
              easing: Easing.out(Easing.cubic),
            });
            topFlyX.value = withTiming(CARD_WIDTH * 0.15, {
              duration: 450,
              easing: Easing.out(Easing.cubic),
            });
            topFlyY.value = withTiming(-(TOP_HEIGHT + 350), {
              duration: 420,
              easing: Easing.bezierFn(0.4, 0.0, 0.2, 1),
            });
            topFlyOpacity.value = withDelay(
              250,
              withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.cubic),
              }),
            );
            topFlyScale.value = withDelay(
              200,
              withTiming(0.7, {
                duration: 350,
                easing: Easing.out(Easing.cubic),
              }),
            );
          },
        );

        runOnJS(setTornState)();
        runOnJS(fireConfetti)();
        runOnJS(onTearComplete)();
      } else {
        tearX.value = withTiming(0, {
          duration: 280,
          easing: Easing.out(Easing.cubic),
        });
        lastHapticBucket.value = -1;
      }
    });

  const topStyle = useAnimatedStyle(() => {
    const progress = tearX.value / CARD_WIDTH;
    const dragY = interpolate(
      progress,
      [0, 0.5, 1],
      [0, -10, -22],
      Extrapolation.CLAMP,
    );
    const dragRotate = interpolate(
      progress,
      [0, 0.5, 1],
      [0, 1.5, 3],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateY: dragY + topFlyY.value },
        { translateX: topFlyX.value },
        { rotate: `${dragRotate + topFlyRotate.value}deg` },
        { scale: topFlyScale.value },
      ],
      opacity: topFlyOpacity.value,
    };
  });

  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      tearX.value / CARD_WIDTH,
      [0, 0.12],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const ticketContent = (
    <Animated.View style={styles.wrapper}>
      {/* Top half */}
      <Animated.View style={[styles.topOuter, topStyle]}>
        <View style={styles.topCard}>
          <View style={styles.topContent}>
            <Text style={[styles.ticketLabel, { color: resolvedAccent }]}>
              TICKET
            </Text>
            <View style={styles.titleRow}>
              <Text style={styles.ticketTitle} numberOfLines={1}>
                {title}
              </Text>
              {countdown != null && (
                <Text style={[styles.countdownText, { color: resolvedAccent }]}>
                  {countdown}
                </Text>
              )}
            </View>
            <Text style={styles.ticketSubtitle}>{subtitle}</Text>
          </View>
          {!isRedeemed && Array.from({ length: PERF_COUNT }, (_, i) => (
            <PerfCircle key={i} index={i} edge="bottom" tearX={tearX} />
          ))}
          <View style={[styles.notch, styles.notchBL]} />
          <View style={[styles.notch, styles.notchBR]} />
        </View>
      </Animated.View>

      {/* Bottom stub */}
      <View style={styles.stubOuter}>
        <View style={styles.stubCard}>
          {!isRedeemed && Array.from({ length: PERF_COUNT }, (_, i) => (
            <PerfCircle key={i} index={i} edge="top" tearX={tearX} />
          ))}

          <View style={styles.stubContent}>
            <View style={styles.codeBlock}>
              <Text
                style={[
                  styles.codeLabel,
                  isTornState && { color: resolvedAccent },
                ]}
              >
                {isTornState ? redeemedLabel : 'CODE'}
              </Text>
              <Text style={[styles.codeValue, { color: resolvedAccent }]}>
                {code}
              </Text>
            </View>
            <View style={styles.barcodeWrapper}>
              <View style={styles.barcodeRow}>
                {Array.from({ length: 26 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.barLine,
                      {
                        width: i % 4 === 0 ? 3 : i % 4 === 2 ? 1 : 2,
                        opacity: 0.1 + (i % 5) * 0.05,
                      },
                    ]}
                  />
                ))}
              </View>
              {isTornState && (
                <View
                  style={[
                    styles.redeemedBadge,
                    { borderColor: resolvedAccent },
                  ]}
                >
                  <Text
                    style={[
                      styles.redeemedBadgeText,
                      { color: resolvedAccent },
                    ]}
                  >
                    {redeemedLabel}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {!isTornState && !disabled && (
          <Animated.View
            style={[styles.swipeHint, hintStyle]}
            pointerEvents="none"
          >
            <Text style={styles.swipeHintText}>{swipeHintLabel}</Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.outerWrap}>
      {!isRedeemed && (
        <View style={styles.confettiContainer} pointerEvents="none">
          <ConfettiOverlay particles={particles} />
        </View>
      )}
      {isRedeemed && disabled ? (
        ticketContent
      ) : (
        <GestureDetector gesture={swipeGesture}>
          {ticketContent}
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    overflow: 'visible',
  },
  wrapper: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    ...Shadows.cardFloat,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
    zIndex: 0,
  },

  topOuter: {
    zIndex: 2,
    overflow: 'visible',
  },
  topCard: {
    height: TOP_HEIGHT,
    backgroundColor: Colors.surface.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  topContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  ticketLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontFamily:
      Platform.OS === 'ios'
        ? '.AppleSystemUIFontRounded-Bold'
        : 'sans-serif-medium',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  ticketTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
    fontFamily:
      Platform.OS === 'ios'
        ? '.AppleSystemUIFontRounded-Bold'
        : 'sans-serif-medium',
  },
  countdownText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginLeft: Spacing.sm,
  },
  ticketSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
    fontFamily:
      Platform.OS === 'ios'
        ? '.AppleSystemUIFontRounded-Regular'
        : 'sans-serif',
  },

  perfCircle: {
    position: 'absolute',
    width: PERF_DIAMETER,
    height: PERF_DIAMETER,
    borderRadius: PERF_RADIUS,
    backgroundColor: BG,
  },

  notch: {
    position: 'absolute',
    width: NOTCH_RADIUS * 2,
    height: NOTCH_RADIUS * 2,
    borderRadius: NOTCH_RADIUS,
    backgroundColor: BG,
  },
  notchBL: { bottom: -NOTCH_RADIUS, left: -NOTCH_RADIUS },
  notchBR: { bottom: -NOTCH_RADIUS, right: -NOTCH_RADIUS },

  stubOuter: {
    zIndex: 1,
    overflow: 'visible',
  },
  stubCard: {
    height: STUB_HEIGHT,
    backgroundColor: Colors.surface.primary,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  stubContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  codeBlock: { gap: 2 },
  codeLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.30)',
    textTransform: 'uppercase',
    fontFamily:
      Platform.OS === 'ios'
        ? '.AppleSystemUIFontRounded-Semibold'
        : 'sans-serif-medium',
  },
  codeValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily:
      Platform.OS === 'ios' ? '.AppleSystemUIFontRounded-Bold' : 'monospace',
  },
  barcodeWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 2,
    height: 30,
  },
  barLine: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 1,
  },
  redeemedBadge: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    borderWidth: 1,
  },
  redeemedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily:
      Platform.OS === 'ios'
        ? '.AppleSystemUIFontRounded-Bold'
        : 'sans-serif-medium',
  },

  swipeHint: {
    position: 'absolute',
    bottom: 7,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.5,
    fontFamily:
      Platform.OS === 'ios' ? '.AppleSystemUIFontRounded-Medium' : 'sans-serif',
  },
});
