/**
 * PARTYUP Paywall Screen
 * =======================
 * Custom paywall sheet with feature carousel, real-time pricing
 * from RevenueCat, and native purchase flow.
 */

import { openLegalLink } from '@/src/constants/legal';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/src/constants/theme';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasProEntitlement,
} from '@/src/services/subscriptionService';
import { useApp, useIsPremium } from '@/src/store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PurchasesPackage } from 'react-native-purchases';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH;

// ============================================
// FEATURE PAGES
// ============================================

interface FeaturePage {
  sticker: ImageSourcePropType;
  title: string;
  subtitle: string;
}

// Feature pages are built inside the component with useMemo to support i18n.

// ============================================
// TYPES
// ============================================

type PlanType = 'yearly' | 'monthly';

interface PlanInfo {
  pkg: PurchasesPackage;
  priceString: string;
  price: number;
  currencyCode: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PaywallScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isPremium = useIsPremium();
  const { dispatch } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [plans, setPlans] = useState<Record<PlanType, PlanInfo | null>>({
    yearly: null,
    monthly: null,
  });

  const scrollRef = useRef<ScrollView>(null);

  const featurePages = useMemo<FeaturePage[]>(() => [
    {
      sticker: require('@/assets/emojis/poop.png'),
      title: t('paywall.partyChallenges'),
      subtitle: t('paywall.partyChallengesDesc'),
    },
    {
      sticker: require('@/assets/emojis/fire.png'),
      title: t('paywall.partyPhotos'),
      subtitle: t('paywall.partyPhotosDesc'),
    },
    {
      sticker: require('@/assets/emojis/joystick.png'),
      title: t('paywall.unlimitedGames'),
      subtitle: t('paywall.unlimitedGamesDesc'),
    },
  ], [t]);

  // If user is already Pro, close immediately
  useEffect(() => {
    if (isPremium) {
      router.back();
    }
  }, [isPremium]);

  // Fetch offerings on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const offerings = await getOfferings();
        if (cancelled) return;

        const current = offerings.current;
        if (!current) {
          console.warn('[Paywall] No current offering available');
          setIsLoading(false);
          return;
        }

        const annual = current.annual;
        const monthly = current.monthly;

        setPlans({
          yearly: annual
            ? {
                pkg: annual,
                priceString: annual.product.priceString,
                price: annual.product.price,
                currencyCode: annual.product.currencyCode,
              }
            : null,
          monthly: monthly
            ? {
                pkg: monthly,
                priceString: monthly.product.priceString,
                price: monthly.product.price,
                currencyCode: monthly.product.currencyCode,
              }
            : null,
        });
      } catch (error) {
        console.warn('[Paywall] Failed to fetch offerings:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Format monthly equivalent price from yearly
  const monthlyEquivalent = plans.yearly
    ? formatPrice(plans.yearly.price / 12, plans.yearly.currencyCode)
    : null;

  const selectedPlanInfo = plans[selectedPlan];

  // Carousel scroll handler
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / CAROUSEL_WIDTH);
      setActivePageIndex(page);
    },
    [],
  );

  // Purchase handler
  const handleSubscribe = useCallback(async () => {
    if (!selectedPlanInfo) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPurchasing(true);

    try {
      const customerInfo = await purchasePackage(selectedPlanInfo.pkg);
      const isPro = hasProEntitlement(customerInfo);
      dispatch({ type: 'SET_PREMIUM_STATUS', payload: isPro });

      if (isPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (error: any) {
      // User cancelled is not an error
      if (error?.userCancelled) return;

      Alert.alert(
        t('paywall.purchaseFailedTitle'),
        error?.message || t('paywall.purchaseFailedMessage'),
      );
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedPlanInfo, dispatch, t]);

  // Restore handler
  const handleRestore = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);

    try {
      const customerInfo = await restorePurchases();
      const isPro = hasProEntitlement(customerInfo);
      dispatch({ type: 'SET_PREMIUM_STATUS', payload: isPro });

      if (isPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('paywall.restoredTitle'), t('paywall.restoredMessage'));
        router.back();
      } else {
        Alert.alert(t('paywall.noPurchasesTitle'), t('paywall.noPurchasesMessage'));
      }
    } catch (error: any) {
      const isTransferError = error?.message?.includes('already another active subscriber');
      const message = isTransferError
        ? t('paywall.receiptInUseMessage')
        : (error?.message || t('paywall.restoreFailedMessage'));
      Alert.alert(t('paywall.restoreFailedTitle'), message);
    } finally {
      setIsRestoring(false);
    }
  }, [dispatch, t]);

  // Plan selection
  const selectPlan = useCallback((plan: PlanType) => {
    Haptics.selectionAsync();
    setSelectedPlan(plan);
  }, []);

  // Subscribe button label
  const subscribeLabel = selectedPlanInfo
    ? t('paywall.subscribeWithPrice', { price: selectedPlanInfo.priceString })
    : t('paywall.subscribe');

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.base }]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
        </View>
      ) : (
        <>
          {/* Feature Carousel */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.carouselContainer}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.carousel}
            >
              {featurePages.map((page, index) => (
                <View key={index} style={styles.featurePage}>
                  <Image source={page.sticker} style={styles.featureSticker} />
                  <Text style={styles.featureTitle}>{page.title}</Text>
                  <Text style={styles.featureSubtitle}>{page.subtitle}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Dot Indicators */}
            <View style={styles.dotsContainer}>
              {featurePages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activePageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* Plan Selection */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.plansContainer}>
            {/* Yearly Plan */}
            {plans.yearly && (
              <Pressable
                onPress={() => selectPlan('yearly')}
                style={[
                  styles.planCard,
                  selectedPlan === 'yearly' && styles.planCardSelected,
                ]}
              >
                <View style={styles.planRadio}>
                  {selectedPlan === 'yearly' && (
                    <View style={styles.planRadioInner} />
                  )}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{t('paywall.yearly')}</Text>
                  <Text style={styles.planDetail}>
                    {monthlyEquivalent}{t('paywall.perMonth')}
                  </Text>
                </View>
                <View style={styles.planPriceContainer}>
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>{t('paywall.bestValue')}</Text>
                  </View>
                  <Text style={styles.planPrice}>
                    {plans.yearly.priceString}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Monthly Plan */}
            {plans.monthly && (
              <Pressable
                onPress={() => selectPlan('monthly')}
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
              >
                <View style={styles.planRadio}>
                  {selectedPlan === 'monthly' && (
                    <View style={styles.planRadioInner} />
                  )}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{t('paywall.monthly')}</Text>
                </View>
                <Text style={styles.planPrice}>
                  {plans.monthly.priceString}
                </Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Subscribe + Restore + Disclaimer + Legal */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.footerContainer}>
            <Pressable
              onPress={handleSubscribe}
              disabled={isPurchasing || !selectedPlanInfo}
              style={({ pressed }) => [
                styles.subscribeButton,
                pressed && styles.subscribeButtonPressed,
                (isPurchasing || !selectedPlanInfo) && styles.subscribeButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={Colors.primary.gradient as unknown as [string, string]}
                style={styles.subscribeGradient}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="star" size={18} color={Colors.text.inverse} />
                    <Text style={styles.subscribeText}>{subscribeLabel}</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={handleRestore} style={({ pressed }) => pressed && styles.footerLinkPressed}>
              <Text style={styles.restoreText}>{t('paywall.restorePurchases')}</Text>
            </Pressable>

            <Text style={styles.disclaimerText}>{t('paywall.subscriptionDisclaimer')}</Text>

            <View style={styles.legalRow}>
              <Pressable onPress={() => openLegalLink('terms')} hitSlop={8} style={({ pressed }) => pressed && styles.footerLinkPressed}>
                <Text style={styles.legalLink}>{t('paywall.termsOfUse')}</Text>
              </Pressable>
              <Text style={styles.legalDot}>·</Text>
              <Pressable onPress={() => openLegalLink('privacy')} hitSlop={8} style={({ pressed }) => pressed && styles.footerLinkPressed}>
                <Text style={styles.legalLink}>{t('paywall.privacyPolicy')}</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Loading overlay for purchase / restore operations */}
          {(isPurchasing || isRestoring) && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary.main} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ============================================
// HELPERS
// ============================================

function formatPrice(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Carousel
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  carousel: {
    flexGrow: 0,
  },
  featurePage: {
    width: CAROUSEL_WIDTH,
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'] + Spacing.lg,
  },
  featureSticker: {
    width: 88,
    height: 88,
    marginBottom: Spacing.lg,
  },
  featureTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  featureSubtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface.tertiary,
  },
  dotActive: {
    backgroundColor: Colors.primary.main,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Plans
  plansContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface.primary,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  planCardSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.muted,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary.main,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  planDetail: {
    fontSize: Typography.size.sm,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  planPriceContainer: {
    alignItems: 'flex-end',
  },
  bestValueBadge: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: 4,
  },
  bestValueText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.inverse,
  },
  planPrice: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.primary.main,
  },

  // Footer (subscribe + restore + disclaimer + legal)
  footerContainer: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  subscribeButton: {
    alignSelf: 'stretch',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.buttonLime,
  },
  subscribeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  subscribeText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.inverse,
  },
  restoreText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  footerLinkPressed: {
    opacity: 0.5,
  },
  disclaimerText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legalLink: {
    fontSize: Typography.size.sm,
    color: Colors.text.tertiary,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },

  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
});
