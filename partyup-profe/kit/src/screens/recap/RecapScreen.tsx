/**
 * PARTYUP Recap Screen
 * ====================
 * Dark mode design - Hero Icons
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { format } from 'date-fns';
import { enUS, es as esDateLocale, fr, de as deDateLocale, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout } from '@/src/constants/theme';
import { Button, Card, Avatar, Badge } from '@/src/components/ui';
import { useUser, useIsPremium } from '@/src/store';
import { getEndedParties } from '@/src/services/partyService';
import { Party, DrinkType, DRINK_INFO } from '@/src/types';
import {
    XMarkIcon,
    ShareIcon,
    TrophyIcon,
    FireIcon,
    CameraIcon,
    VideoCameraIcon,
    CalendarIcon,
    ClockIcon,
    SparklesIcon,
    ChartBarIcon,
} from 'react-native-heroicons/solid';
import { DocumentTextIcon } from 'react-native-heroicons/outline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// [kit] El tipo Recap se eliminó de src/types en el original; esta pantalla (oculta) solo usa datos de ejemplo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recap = any;

const DATE_LOCALES: Record<string, typeof enUS> = {
  en: enUS,
  es: esDateLocale,
  fr,
  de: deDateLocale,
  it,
};

// Example recap data
const MOCK_RECAP: Recap = {
  id: 'recap-1',
  partyId: 'party-1',
  partyName: 'Previa en casa de Juan 🎉',
  startTime: { toDate: () => new Date('2026-01-18T22:00:00') } as any,
  endTime: { toDate: () => new Date('2026-01-19T04:30:00') } as any,
  duration: 390, // 6.5 horas
  participants: [
    {
      userId: '1',
      username: 'carlos',
      avatarUrl: undefined,
      drinks: { beer: 5, cubata: 3, shot: 2, wine: 0, cocktail: 1, other: 0, total: 11 },
      maxStreak: 4,
      photosUploaded: 5,
      videosUploaded: 1,
      rank: 1,
      badges: ['leader', 'streak-master'],
    },
    {
      userId: '2',
      username: 'maria',
      drinks: { beer: 3, cubata: 4, shot: 1, wine: 1, cocktail: 0, other: 0, total: 9 },
      maxStreak: 3,
      photosUploaded: 8,
      videosUploaded: 2,
      rank: 2,
      badges: ['photo-master'],
    },
    {
      userId: '3',
      username: 'pablo',
      drinks: { beer: 4, cubata: 2, shot: 2, wine: 0, cocktail: 0, other: 0, total: 8 },
      maxStreak: 5,
      photosUploaded: 2,
      videosUploaded: 0,
      rank: 3,
      badges: ['streak-master'],
    },
  ],
  highlights: [
    { id: 'h1', type: 'moment', title: '¡Carlos va líder!', timestamp: { toDate: () => new Date() } as any, isPremium: false },
    { id: 'h2', type: 'photo', mediaUrl: 'https://picsum.photos/400/600', title: 'Mejor foto', timestamp: { toDate: () => new Date() } as any, isPremium: false },
  ],
  stats: {
    totalDrinks: 28,
    totalPhotos: 15,
    totalVideos: 3,
    totalGamesPlayed: 4,
    longestStreak: { userId: '3', username: 'pablo', count: 5 },
    drinkLeader: { userId: '1', username: 'carlos', count: 11 },
    mvp: { userId: '1', username: 'carlos', reason: 'El alma de la fiesta' },
    drinkBreakdown: { beer: 12, cubata: 9, shot: 5, wine: 1, cocktail: 1, other: 0 },
  },
  timeline: [],
  status: 'ready',
  isPremiumContent: false,
  generatedAt: { toDate: () => new Date() } as any,
  isPublic: false,
};

export default function RecapScreen() {
  const { t, i18n } = useTranslation();
  const dateLocale = DATE_LOCALES[i18n.language] ?? enUS;
  const user = useUser();
  const isPremium = useIsPremium();
  
  const [recaps, setRecaps] = useState<Recap[]>([MOCK_RECAP]);
  const [selectedRecap, setSelectedRecap] = useState<Recap | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Animations for the recap
  const headerOpacity = useSharedValue(0);
  const statsScale = useSharedValue(0.8);
  const podiumY = useSharedValue(50);

  useEffect(() => {
    if (selectedRecap) {
      headerOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
      statsScale.value = withDelay(300, withTiming(1, { duration: 400 }));
      podiumY.value = withDelay(500, withTiming(0, { duration: 600 }));
    }
  }, [selectedRecap]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statsScale.value }],
    opacity: interpolate(statsScale.value, [0.8, 1], [0, 1]),
  }));

  const podiumStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: podiumY.value }],
    opacity: interpolate(podiumY.value, [50, 0], [0, 1]),
  }));

  const handleOpenRecap = (recap: Recap) => {
    if (recap.status === 'premium-locked' && !isPremium) {
      router.push('/paywall-sheet');
      return;
    }
    setSelectedRecap(recap);
  };

  const handleCloseRecap = () => {
    setSelectedRecap(null);
    headerOpacity.value = 0;
    statsScale.value = 0.8;
    podiumY.value = 50;
  };

  const handleShare = () => {
    // Implement sharing
  };

  // Detailed recap view
  if (selectedRecap) {
    const { stats, participants } = selectedRecap;
    const sortedParticipants = [...participants].sort((a, b) => a.rank - b.rank);
    const [first, second, third] = sortedParticipants;

    return (
      <View style={styles.container}>
        <ScrollView 
          style={styles.recapScrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with background image */}
          <Animated.View style={[styles.recapHeader, headerStyle]}>
            <LinearGradient
              colors={Colors.primary.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recapHeaderGradient}
            >
              <SafeAreaView edges={['top']}>
                <Pressable onPress={handleCloseRecap} style={styles.closeButton}>
                  <XMarkIcon size={22} color="#fff" />
                </Pressable>

                <View style={styles.recapHeaderContent}>
                  <Text style={styles.recapDate}>
                    {format(selectedRecap.startTime.toDate(), 'd MMMM', { locale: dateLocale })}
                  </Text>
                  <Text style={styles.recapTitle}>{selectedRecap.partyName}</Text>
                  <Text style={styles.recapDuration}>
                    {Math.floor(selectedRecap.duration / 60)}h {selectedRecap.duration % 60}min {t('recap.partying')}
                  </Text>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </Animated.View>

          {/* Main stats */}
          <Animated.View style={[styles.mainStats, statsStyle]}>
            <View style={styles.mainStatItem}>
              <View style={[styles.mainStatIconWrap, { backgroundColor: Colors.primary.muted }]}>
                <FireIcon size={20} color={Colors.primary.main} />
              </View>
              <Text style={styles.mainStatValue}>{stats.totalDrinks}</Text>
              <Text style={styles.mainStatLabel}>{t('recap.drinks')}</Text>
            </View>
            <View style={styles.mainStatDivider} />
            <View style={styles.mainStatItem}>
              <View style={[styles.mainStatIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <CameraIcon size={20} color={Colors.accent.purple} />
              </View>
              <Text style={styles.mainStatValue}>{stats.totalPhotos}</Text>
              <Text style={styles.mainStatLabel}>{t('recap.photos')}</Text>
            </View>
            <View style={styles.mainStatDivider} />
            <View style={styles.mainStatItem}>
              <View style={[styles.mainStatIconWrap, { backgroundColor: 'rgba(34, 211, 238, 0.15)' }]}>
                <SparklesIcon size={20} color={Colors.accent.cyan} />
              </View>
              <Text style={styles.mainStatValue}>{stats.totalGamesPlayed}</Text>
              <Text style={styles.mainStatLabel}>{t('recap.games')}</Text>
            </View>
          </Animated.View>

          {/* Podium */}
          <Animated.View style={[styles.podiumSection, podiumStyle]}>
            <View style={styles.sectionHeader}>
              <TrophyIcon size={20} color={Colors.accent.yellow} />
              <Text style={styles.sectionTitle}>{t('recap.nightPodium')}</Text>
            </View>
            
            <View style={styles.podium}>
              {/* Second place */}
              {second && (
                <View style={styles.podiumPosition}>
                  <Avatar
                    source={second.avatarUrl}
                    name={second.username}
                    size="lg"
                  />
                  <Text style={styles.podiumName}>@{second.username}</Text>
                  <Text style={styles.podiumDrinks}>{second.drinks.total}</Text>
                  <View style={[styles.podiumBar, styles.podiumSecond]}>
                    <Text style={styles.podiumRank}>2º</Text>
                  </View>
                </View>
              )}

              {/* First place */}
              {first && (
                <View style={styles.podiumPosition}>
                  <View style={styles.crownContainer}>
                    <Text style={styles.crown}>👑</Text>
                  </View>
                  <Avatar
                    source={first.avatarUrl}
                    name={first.username}
                    size="xl"
                    borderWidth={3}
                    borderColor={Colors.accent.yellow}
                  />
                  <Text style={styles.podiumNameFirst}>@{first.username}</Text>
                  <Text style={styles.podiumDrinksFirst}>{first.drinks.total} 🍻</Text>
                  <View style={[styles.podiumBar, styles.podiumFirst]}>
                    <Text style={styles.podiumRankFirst}>1º</Text>
                  </View>
                </View>
              )}

              {/* Third place */}
              {third && (
                <View style={styles.podiumPosition}>
                  <Avatar
                    source={third.avatarUrl}
                    name={third.username}
                    size="lg"
                  />
                  <Text style={styles.podiumName}>@{third.username}</Text>
                  <Text style={styles.podiumDrinks}>{third.drinks.total} 🍻</Text>
                  <View style={[styles.podiumBar, styles.podiumThird]}>
                    <Text style={styles.podiumRank}>3º</Text>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>

          {/* MVP */}
          <Animated.View entering={FadeInDown.delay(700)} style={styles.section}>
            <Card variant="elevated" style={styles.mvpCard}>
              <LinearGradient
                colors={[Colors.accent.yellow + '20', Colors.accent.yellow + '05']}
                style={styles.mvpGradient}
              >
                <Text style={styles.mvpEmoji}>⭐</Text>
                <Text style={styles.mvpTitle}>{t('recap.mvpOfTheNight')}</Text>
                <Avatar
                  source={undefined}
                  name={stats.mvp.username}
                  size="xl"
                />
                <Text style={styles.mvpName}>@{stats.mvp.username}</Text>
                <Text style={styles.mvpReason}>"{stats.mvp.reason}"</Text>
              </LinearGradient>
            </Card>
          </Animated.View>

          {/* Drink breakdown */}
          <Animated.View entering={FadeInDown.delay(800)} style={styles.section}>
            <Text style={styles.sectionTitle}>🍹 {t('recap.drinkBreakdown')}</Text>
            <Card variant="default" style={styles.drinkBreakdownCard}>
              {(Object.entries(stats.drinkBreakdown) as [DrinkType, number][])
                .filter(([_, count]) => count > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([type, count]) => (
                  <View key={type} style={styles.drinkBreakdownItem}>
                    <View style={styles.drinkBreakdownInfo}>
                      <Text style={styles.drinkBreakdownEmoji}>
                        {DRINK_INFO[type]?.emoji}
                      </Text>
                      <Text style={styles.drinkBreakdownName}>
                        {DRINK_INFO[type]?.name}
                      </Text>
                    </View>
                    <View style={styles.drinkBreakdownBarContainer}>
                      <View
                        style={[
                          styles.drinkBreakdownBar,
                          {
                            width: `${(count / stats.totalDrinks) * 100}%`,
                            backgroundColor: DRINK_INFO[type]?.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.drinkBreakdownCount}>{count}</Text>
                  </View>
                ))}
            </Card>
          </Animated.View>

          {/* Share button */}
          <Animated.View entering={FadeInUp.delay(900)} style={styles.shareSection}>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <LinearGradient
                colors={Colors.primary.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareButtonGradient}
              >
                <ShareIcon size={20} color="#fff" />
                <Text style={styles.shareButtonText}>{t('recap.shareRecap')}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // Recap list
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('recap.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('recap.subtitle')}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {recaps.length > 0 ? (
            recaps.map((recap) => (
              <View key={recap.id}>
                <Pressable onPress={() => handleOpenRecap(recap)}>
                  <View style={styles.recapCard}>
                    <LinearGradient
                      colors={Colors.primary.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.recapCardHeader}
                    >
                      <CalendarIcon size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.recapCardDate}>
                        {format(recap.startTime.toDate(), 'd MMM', { locale: dateLocale })}
                      </Text>
                    </LinearGradient>

                    <View style={styles.recapCardContent}>
                      <Text style={styles.recapCardTitle} numberOfLines={1}>
                        {recap.partyName}
                      </Text>
                      
                      <View style={styles.recapCardStats}>
                        <View style={styles.recapCardStatItem}>
                          <FireIcon size={14} color={Colors.text.muted} />
                          <Text style={styles.recapCardStat}>{recap.stats.totalDrinks}</Text>
                        </View>
                        <View style={styles.recapCardStatItem}>
                          <CameraIcon size={14} color={Colors.text.muted} />
                          <Text style={styles.recapCardStat}>{recap.stats.totalPhotos}</Text>
                        </View>
                      </View>

                      <View style={styles.recapCardAvatars}>
                        {recap.participants.slice(0, 4).map((p: any, i: number) => (
                          <View
                            key={p.userId}
                            style={[styles.recapCardAvatar, { marginLeft: i > 0 ? -10 : 0 }]}
                          >
                            <Avatar
                              source={p.avatarUrl}
                              name={p.username}
                              size="sm"
                              borderWidth={2}
                              borderColor={Colors.surface.primary}
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </Pressable>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <DocumentTextIcon size={40} color={Colors.text.muted} />
              </View>
              <Text style={styles.emptyTitle}>{t('recap.noRecapsYet')}</Text>
              <Text style={styles.emptyText}>
                {t('recap.noRecapsDescription')}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.muted,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  recapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.primary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  recapCardHeader: {
    width: 70,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: 4,
  },
  recapCardDate: {
    fontSize: Typography.size.sm,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  recapCardContent: {
    flex: 1,
    padding: Spacing.base,
  },
  recapCardTitle: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  recapCardStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recapCardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recapCardStat: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
  recapCardAvatars: {
    flexDirection: 'row',
  },
  recapCardAvatar: {},
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.size.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.size.md,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Recap Detail Styles
  recapScrollView: {
    flex: 1,
  },
  recapHeader: {
    height: 220,
  },
  recapHeaderGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.base,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.full,
    zIndex: 10,
  },
  recapHeaderContent: {
    padding: Spacing.lg,
  },
  recapDate: {
    fontSize: Typography.size.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  recapTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  recapDuration: {
    fontSize: Typography.size.md,
    color: 'rgba(255,255,255,0.9)',
  },
  mainStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.primary,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  mainStatItem: {
    alignItems: 'center',
  },
  mainStatIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  mainStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  mainStatLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
  mainStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border.subtle,
  },
  podiumSection: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  podiumPosition: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3,
  },
  crownContainer: {
    marginBottom: -8,
    zIndex: 10,
  },
  crown: {
    fontSize: 28,
  },
  podiumName: {
    fontSize: Typography.size.sm,
    fontWeight: '500',
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },
  podiumNameFirst: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.xs,
  },
  podiumDrinks: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginBottom: Spacing.xs,
  },
  podiumDrinksFirst: {
    fontSize: Typography.size.md,
    fontWeight: '500',
    color: Colors.primary.main,
    marginBottom: Spacing.xs,
  },
  podiumBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  podiumFirst: {
    height: 80,
    backgroundColor: Colors.accent.yellow,
  },
  podiumSecond: {
    height: 60,
    backgroundColor: Colors.surface.tertiary,
  },
  podiumThird: {
    height: 45,
    backgroundColor: '#8B5A2B',
  },
  podiumRank: {
    fontSize: Typography.size.lg,
    fontWeight: '700',
    color: '#fff',
  },
  podiumRankFirst: {
    fontSize: Typography.size.xl,
    fontWeight: '700',
    color: Colors.background.primary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  mvpCard: {
    overflow: 'hidden',
    padding: 0,
  },
  mvpGradient: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  mvpEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  mvpTitle: {
    fontSize: Typography.size.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  mvpName: {
    fontSize: Typography.size.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  mvpReason: {
    fontSize: Typography.size.md,
    color: Colors.text.muted,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  drinkBreakdownCard: {
    paddingVertical: Spacing.sm,
  },
  drinkBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  drinkBreakdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: Spacing.sm,
  },
  drinkBreakdownEmoji: {
    fontSize: 20,
  },
  drinkBreakdownName: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
  },
  drinkBreakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  drinkBreakdownBar: {
    height: '100%',
    borderRadius: 4,
  },
  drinkBreakdownCount: {
    width: 30,
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'right',
  },
  shareSection: {
    padding: Spacing.lg,
  },
  shareButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  shareButtonText: {
    fontSize: Typography.size.lg,
    fontWeight: '700',
    color: '#fff',
  },
});
