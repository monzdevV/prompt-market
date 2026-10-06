/**
 * PARTYUP Profile / Settings Screen
 * ==================================
 * Grouped settings with sections: My Data, Support, Account.
 * Dark mode design with the app's lime green accent.
 */

import { isLegalLinkConfigured, openLegalLink } from '@/src/constants/legal';
import { AvatarImage } from '@/src/components/ui/AvatarImage';
import { ProBanner } from '@/src/components/subscription/ProBanner';
import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { ProBadge } from '@/src/components/ui/ProBadge';
import { Colors, Spacing, Typography } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks';
import {
  setLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/src/i18n';
import {
  deleteAccount,
  getUserStats,
  signOut,
  type UserStats,
} from '@/src/services/authService';
import {
  areNotificationsEnabled,
  getNotificationPermissionStatus,
  registerForPushNotifications,
  removePushTokens,
} from '@/src/services/notificationService';
import { logoutUser, presentCustomerCenter } from '@/src/services/subscriptionService';
import { useApp, useIsPremium, useUser } from '@/src/store';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { DocumentTextIcon } from 'react-native-heroicons/outline';
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PencilIcon,
  ShieldCheckIcon,
  StarIcon,
  TrashIcon,
  UserIcon,
} from 'react-native-heroicons/solid';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================
// TYPES
// ============================================

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  destructive?: boolean;
}

// ============================================
// SETTING ROW COMPONENT
// ============================================

function SettingRow({ icon, label, onPress, rightContent, destructive }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightContent}
      style={({ pressed }) => [styles.settingRow, pressed && onPress && styles.settingRowPressed]}
    >
      <View style={styles.settingLeft}>
        {icon}
        <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>
          {label}
        </Text>
      </View>
      {rightContent ?? (
        onPress ? <ChevronRightIcon size={18} color={Colors.text.muted} /> : null
      )}
    </Pressable>
  );
}

function SettingDivider() {
  return <View style={styles.settingDivider} />;
}

/**
 * Formats a number for compact display (e.g., 1500 -> "1.5k").
 */
function formatCompactNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(num);
}

const PROFILE_AVATAR_SIZE = 100;

const STAT_ITEMS = [
  { key: 'totalParties' as const, emoji: require('@/assets/emojis/partying_face.png'), labelKey: 'profile.parties' },
  { key: 'totalDrinks' as const, emoji: require('@/assets/emojis/beer.png'), labelKey: 'profile.drinks' },
  { key: 'totalChallenges' as const, emoji: require('@/assets/emojis/fire.png'), labelKey: 'profile.challenges' },
];

/**
 * Pulsing placeholder bar used as a loading skeleton.
 */
function SkeletonBar({ width, height }: { width: number; height: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: 'rgba(255,255,255,0.15)',
        },
        animStyle,
      ]}
    />
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const user = useUser();
  const isPremium = useIsPremium();
  const { dispatch } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const prevNotificationsRef = useRef<boolean | null>(null);
  const { appState } = useAppState();

  // Load user stats on focus
  useFocusEffect(
    useCallback(() => {
      getUserStats().then(setStats).catch(() => {});
    }, []),
  );

  // Sync notification switch with actual OS permission and keep push tokens in sync
  const syncNotificationState = useCallback(async () => {
    const enabled = await areNotificationsEnabled();
    const prev = prevNotificationsRef.current;

    prevNotificationsRef.current = enabled;
    setNotificationsEnabled(enabled);

    if (prev === null || prev !== enabled) {
      if (enabled) {
        await registerForPushNotifications();
      } else if (prev !== null) {
        await removePushTokens();
      }
    }
  }, []);

  useEffect(() => {
    syncNotificationState();
  }, [syncNotificationState]);

  useFocusEffect(
    useCallback(() => {
      syncNotificationState();
    }, [syncNotificationState]),
  );

  useEffect(() => {
    if (appState === 'active') {
      syncNotificationState();
    }
  }, [appState, syncNotificationState]);

  // ---- Handlers ----

  const handleEditUsername = useCallback(() => {
    router.push({ pathname: '/username-sheet', params: { mode: 'edit' } } as any);
  }, []);

  const handleEditAvatar = useCallback(() => {
    router.push({ pathname: '/avatar-sheet', params: { mode: 'edit' } } as any);
  }, []);

  const handleToggleNotifications = useCallback(async () => {
    const status = await getNotificationPermissionStatus();

    if (status === 'undetermined') {
      const token = await registerForPushNotifications();
      const enabled = !!token;
      prevNotificationsRef.current = enabled;
      setNotificationsEnabled(enabled);
      return;
    }

    await Linking.openSettings();
  }, []);

  const handleManageSubscription = useCallback(async () => {
    try {
      await presentCustomerCenter();
    } catch (error) {
      console.warn('[Profile] Failed to present customer center:', error);
    }
  }, []);

  const handlePremium = useCallback(() => {
    router.push('/paywall-sheet');
  }, []);

  const LANGUAGE_CODES = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];
  const LANGUAGE_ROW_HEIGHT = 44;
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const langListHeight = useSharedValue(0);

  const toggleLanguageList = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = languageExpanded ? 0 : LANGUAGE_CODES.length * LANGUAGE_ROW_HEIGHT;
    langListHeight.value = withTiming(target, { duration: 250 });
    setLanguageExpanded(prev => !prev);
  }, [languageExpanded]);

  const handleSelectLanguage = useCallback((code: SupportedLanguage) => {
    Haptics.selectionAsync();
    setLanguage(code);
    langListHeight.value = withTiming(0, { duration: 250 });
    setLanguageExpanded(false);
  }, []);

  const langListAnimatedStyle = useAnimatedStyle(() => ({
    height: langListHeight.value,
    overflow: 'hidden' as const,
  }));

  const handleLogout = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('profile.logOutTitle'),
      t('profile.logOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logOut'),
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await signOut();
              await logoutUser().catch(() => {});
              dispatch({ type: 'LOGOUT' });
            } catch (error) {
              console.warn('[Profile] Logout error:', error);
              dispatch({ type: 'LOGOUT' });
            }
          },
        },
      ],
    );
  }, [dispatch]);

  const handleDeleteAccount = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('profile.deleteAccountTitle'),
      t('profile.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccountConfirmTitle'),
              t('profile.deleteAccountConfirmMessage'),
              [
                { text: t('profile.keepAccount'), style: 'cancel' },
                {
                  text: t('profile.yesDelete'),
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await deleteAccount();
                      await logoutUser().catch(() => {});
                      dispatch({ type: 'LOGOUT' });
                    } catch (error) {
                      setIsDeleting(false);
                      const message = error instanceof Error ? error.message : t('common.somethingWentWrong');
                      Alert.alert(t('common.error'), message);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [dispatch]);

  // ---- Render ----

  if (isLoggingOut || isDeleting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={styles.loadingText}>
          {isDeleting ? t('profile.deletingAccount') : t('profile.loggingOut')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Fixed header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('profile.my')} <Text style={styles.headerTitleAccent}>{t('profile.settingsAccent')}</Text>
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile header: avatar + username */}
          <View style={styles.profileHeader}>
            <Pressable onPress={handleEditAvatar} style={styles.avatarWrapper}>
              {user?.avatarUrl ? (
                <AvatarImage uri={user.avatarUrl} style={styles.profileAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                  <UserIcon size={36} color={Colors.text.muted} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <PencilIcon size={12} color="#000" />
              </View>
            </Pressable>

            {user?.username ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.profileUsername}>@{user.username}</Text>
                {user?.isVerified && <VerifiedBadge size={18} />}
              </View>
            ) : null}
          </View>

          {/* Stats card */}
          <View style={styles.section}>
            <View style={[styles.card, styles.statsCard]}>
              <View style={styles.statsRow}>
                {STAT_ITEMS.map((item, index) => (
                  <React.Fragment key={item.key}>
                    {index > 0 && <View style={styles.statDivider} />}
                    <View style={styles.statItem}>
                      <View style={styles.statValueRow}>
                        {stats ? (
                          <>
                            <Image source={item.emoji} style={styles.statEmoji} contentFit="contain" />
                            <Text style={styles.statValue}>{formatCompactNumber(stats[item.key])}</Text>
                          </>
                        ) : (
                          <SkeletonBar width={Math.round(SCREEN_WIDTH * 0.15)} height={Math.round(SCREEN_WIDTH * 0.065)} />
                        )}
                      </View>
                      <Text style={styles.statLabel}>{t(item.labelKey)}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          {/* Pro upsell banner for non-premium users */}
          {!isPremium && (
            <View style={styles.proBannerWrapper}>
              <ProBanner />
            </View>
          )}

          {/* My Data Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.myData')}</Text>
            </View>
            <View style={styles.card}>
              <SettingRow
                icon={<UserIcon size={20} color={Colors.primary.main} />}
                label={t('profile.username')}
                onPress={handleEditUsername}
                rightContent={
                  <View style={styles.usernameRow}>
                    <Text style={styles.usernameText}>
                      {user?.username ? `@${user.username}` : t('profile.notSet')}
                    </Text>
                    <ChevronRightIcon size={18} color={Colors.text.muted} />
                  </View>
                }
              />
              <SettingDivider />
              <SettingRow
                icon={<BellIcon size={20} color={Colors.primary.main} />}
                label={t('profile.notifications')}
                rightContent={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleToggleNotifications}
                    trackColor={{ false: Colors.surface.secondary, true: Colors.primary.muted }}
                    thumbColor={notificationsEnabled ? Colors.primary.main : Colors.text.muted}
                  />
                }
              />
              <SettingDivider />
              <SettingRow
                icon={<GlobeAltIcon size={20} color={Colors.primary.main} />}
                label={t('profile.language')}
                onPress={toggleLanguageList}
                rightContent={
                  <View style={styles.usernameRow}>
                    <Text style={styles.usernameText}>
                      {SUPPORTED_LANGUAGES[i18n.language as SupportedLanguage] ?? 'English'}
                    </Text>
                    <ChevronDownIcon
                      size={18}
                      color={Colors.text.muted}
                      style={{ transform: [{ rotate: languageExpanded ? '180deg' : '0deg' }] }}
                    />
                  </View>
                }
              />
              <Animated.View style={langListAnimatedStyle}>
                {LANGUAGE_CODES.map((code) => {
                  const isSelected = i18n.language === code;
                  return (
                    <Pressable
                      key={code}
                      onPress={() => handleSelectLanguage(code)}
                      style={({ pressed }) => [
                        styles.languageOption,
                        pressed && styles.languageOptionPressed,
                      ]}
                    >
                      <Text style={[styles.languageOptionText, isSelected && styles.languageOptionSelected]}>
                        {SUPPORTED_LANGUAGES[code]}
                      </Text>
                      {isSelected && <CheckIcon size={16} color={Colors.primary.main} />}
                    </Pressable>
                  );
                })}
              </Animated.View>
            </View>
          </View>

          {/* Premium Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.subscription')}</Text>
            </View>
            <View style={styles.card}>
              <SettingRow
                icon={<StarIcon size={20} color={Colors.primary.main} />}
                label={t('profile.proStatus')}
                onPress={isPremium ? handleManageSubscription : handlePremium}
                rightContent={
                  <View style={styles.premiumStatusRow}>
                    {isPremium ? <ProBadge size={20} /> : null}
                    <Text style={[styles.premiumStatusText, isPremium && styles.premiumStatusActive]}>
                      {isPremium ? t('profile.active') : t('profile.inactive')}
                    </Text>
                    <ChevronRightIcon size={18} color={Colors.text.muted} />
                  </View>
                }
              />
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.support')}</Text>
            </View>
            <View style={styles.card}>
              <SettingRow
                icon={<ShieldCheckIcon size={20} color={Colors.primary.main} />}
                label={t('profile.privacyPolicy')}
                onPress={() => openLegalLink('privacy')}
              />
              <SettingDivider />
              <SettingRow
                icon={<DocumentTextIcon size={20} color={Colors.primary.main} />}
                label={t('profile.termsOfService')}
                onPress={() => openLegalLink('terms')}
              />
              {isLegalLinkConfigured('support') && (
                <>
                  <SettingDivider />
                  <SettingRow
                    icon={<EnvelopeIcon size={20} color={Colors.primary.main} />}
                    label={t('profile.contactSupport')}
                    onPress={() => openLegalLink('support')}
                  />
                </>
              )}
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
            </View>
            <View style={styles.card}>
              <SettingRow
                icon={<ArrowRightOnRectangleIcon size={20} color={Colors.accent.red} />}
                label={t('profile.logOut')}
                onPress={handleLogout}
              />
              <SettingDivider />
              <SettingRow
                icon={<TrashIcon size={20} color={Colors.accent.red} />}
                label={t('profile.deleteAccount')}
                onPress={handleDeleteAccount}
                destructive
              />
            </View>
          </View>

          {/* Version */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>
              PartyUp v{Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  profileAvatar: {
    width: PROFILE_AVATAR_SIZE,
    height: PROFILE_AVATAR_SIZE,
    borderRadius: PROFILE_AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  profileAvatarPlaceholder: {
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  profileUsername: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: ROUNDED,
  },
  statsCard: {
    paddingVertical: Spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border.subtle,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: Math.round(SCREEN_WIDTH * 0.065),
  },
  statEmoji: {
    width: Math.round(SCREEN_WIDTH * 0.065),
    height: Math.round(SCREEN_WIDTH * 0.065),
  },
  statValue: {
    fontSize: Math.round(SCREEN_WIDTH * 0.06),
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: ROUNDED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  proBannerWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },

  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  headerTitleAccent: {
    color: Colors.primary.main,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: Colors.surface.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    overflow: 'hidden',
  },

  // Setting rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  settingRowPressed: {
    backgroundColor: Colors.surface.secondary,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    flex: 1,
  },
  settingLabelDestructive: {
    color: Colors.accent.red,
  },
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border.subtle,
    marginLeft: 44,
  },

  // Username display
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  usernameText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },

  // Language inline selector
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: Spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.subtle,
  },
  languageOptionPressed: {
    backgroundColor: Colors.surface.secondary,
  },
  languageOptionText: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
  languageOptionSelected: {
    color: Colors.primary.main,
    fontWeight: Typography.weight.semibold,
  },

  // Premium status
  premiumStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  premiumStatusText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
  premiumStatusActive: {
    color: Colors.primary.main,
    fontWeight: Typography.weight.semibold,
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  versionText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
});
