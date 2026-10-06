/**
 * PARTYUP Venue Dashboard Screen
 * ===============================
 * Main screen for venue accounts showing a clickable venue card,
 * challenge/offer broadcast cards with daily limits, sticker backgrounds,
 * party stats, and a list of active parties.
 */

import { TEXTURE_RENDERERS } from '@/src/components/challenges';
import { SectionHeader } from '@/src/components/party';
import { VenueHeroCard } from '@/src/components/ui/VenueHeroCard';
import { hashPartyId } from '@/src/constants/partyBackgrounds';
import { Colors, Spacing, Typography, BorderRadius } from '@/src/constants/theme';
import {
  ActiveVenueParty,
  getActiveVenueParties,
  getUserVenueId,
  getVenueStats,
  VenueStats,
} from '@/src/services/venueDashboardService';
import { getVenueById } from '@/src/services/venueService';
import { Venue } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const MAX_DAILY_CHALLENGES = 5;
const MAX_DAILY_OFFERS = 5;

const PARTY_STICKERS = [
  require('@/assets/emojis/partying_face.png'),
  require('@/assets/emojis/fire.png'),
  require('@/assets/emojis/mirror_ball.png'),
  require('@/assets/emojis/tada.png'),
  require('@/assets/emojis/beer.png'),
  require('@/assets/emojis/champagne.png'),
  require('@/assets/emojis/cocktail.png'),
  require('@/assets/emojis/crown.png'),
  require('@/assets/emojis/tropical_drink.png'),
  require('@/assets/emojis/clinking_glasses.png'),
];

// ============================================
// STICKER POSITIONS FOR ACTION CARDS
// ============================================

type StickerPosition = {
  right: number;
  bottom: number;
  size: number;
  rotate: number;
  zIndex: number;
};

const ACTION_CARD_STICKER_POSITIONS: StickerPosition[] = [
  { right: -18, bottom: -20, size: 80, rotate: -12, zIndex: 10 },
  { right: 40, bottom: -8, size: 50, rotate: 18, zIndex: 5 },
  { right: -6, bottom: 36, size: 42, rotate: -15, zIndex: 4 },
  { right: 70, bottom: -2, size: 38, rotate: -10, zIndex: 3 },
  { right: 50, bottom: 28, size: 30, rotate: 22, zIndex: 2 },
];

const CHALLENGE_STICKER_EMOJIS = [
  require('@/assets/emojis/fire.png'),
  require('@/assets/emojis/partying_face.png'),
  require('@/assets/emojis/mirror_ball.png'),
  require('@/assets/emojis/crown.png'),
  require('@/assets/emojis/tada.png'),
];

const OFFER_STICKER_EMOJIS = [
  require('@/assets/emojis/beer.png'),
  require('@/assets/emojis/cocktail.png'),
  require('@/assets/emojis/tropical_drink.png'),
  require('@/assets/emojis/champagne.png'),
  require('@/assets/emojis/clinking_glasses.png'),
];

// ============================================
// ACTION CARD (shared between challenge and offer)
// ============================================

interface ActionCardProps {
  title: string;
  subtitle: string;
  countToday: number;
  maxDaily: number;
  disabled: boolean;
  gradientColors: [string, string];
  disabledGradient: [string, string];
  icon: string;
  stickerEmojis: any[];
  onPress: () => void;
}

function ActionCard({
  title,
  subtitle,
  countToday,
  maxDaily,
  disabled,
  gradientColors,
  disabledGradient,
  icon,
  stickerEmojis,
  onPress,
}: ActionCardProps) {
  const renderTexture = TEXTURE_RENDERERS.confetti;

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.actionCard,
        disabled && styles.actionCardDisabled,
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={disabled ? disabledGradient : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.actionCardTexture} pointerEvents="none">
        {renderTexture()}
      </View>

      <View style={styles.actionCardContent}>
        <View style={styles.actionCardLeft}>
          <Ionicons
            name={icon as any}
            size={22}
            color={disabled ? 'rgba(255,255,255,0.3)' : '#fff'}
          />
          <View>
            <Text style={[styles.actionCardTitle, disabled && styles.actionCardTextDisabled]}>
              {title}
            </Text>
            <Text style={[styles.actionCardSubtitle, disabled && styles.actionCardTextDisabled]}>
              {subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.actionCardBadge}>
          <Text style={[styles.actionCardBadgeText, disabled && styles.actionCardTextDisabled]}>
            {countToday}/{maxDaily}
          </Text>
        </View>
      </View>

      <View style={styles.actionCardStickers} pointerEvents="none">
        {ACTION_CARD_STICKER_POSITIONS.map((pos, i) => (
          <Image
            key={i}
            source={stickerEmojis[i % stickerEmojis.length]}
            style={[
              styles.actionCardSticker,
              {
                right: pos.right,
                bottom: pos.bottom,
                width: pos.size,
                height: pos.size,
                transform: [{ rotate: `${pos.rotate}deg` }],
                zIndex: pos.zIndex,
              },
            ]}
            contentFit="contain"
          />
        ))}
      </View>
    </Pressable>
  );
}

// ============================================
// STAT ITEMS (profile-style layout with emojis)
// ============================================

/* eslint-disable @typescript-eslint/no-require-imports */
const VENUE_STAT_ITEMS = [
  { key: 'today' as const, emoji: require('@/assets/emojis/partying_face.png'), labelKey: 'venueDashboard.today' },
  { key: 'week' as const, emoji: require('@/assets/emojis/beer.png'), labelKey: 'venueDashboard.week' },
  { key: 'month' as const, emoji: require('@/assets/emojis/fire.png'), labelKey: 'venueDashboard.month' },
];
/* eslint-enable @typescript-eslint/no-require-imports */

// ============================================
// ACTIVE PARTY ROW
// ============================================

interface PartyRowProps {
  party: ActiveVenueParty;
  stickerIndex: number;
}

function PartyRow({ party, stickerIndex }: PartyRowProps) {
  const { t } = useTranslation();
  const sticker = PARTY_STICKERS[stickerIndex % PARTY_STICKERS.length];

  return (
    <View style={styles.partyRow}>
      <View style={styles.partyRowSticker}>
        <Image source={sticker} style={styles.partyRowStickerImage} contentFit="contain" />
      </View>
      <View style={styles.partyRowInfo}>
        <Text style={styles.partyRowName} numberOfLines={1}>{party.name}</Text>
        <Text style={styles.partyRowMeta}>
          {party.participantCount} {t('venueDashboard.participants')} · {party.code}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

const keyExtractor = (item: ActiveVenueParty) => item.id;

export default function VenueDashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const venueIdRef = useRef<string | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [activeParties, setActiveParties] = useState<ActiveVenueParty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (showRefresh = false) => {
    console.log('[VenueDashboard] loadData called, showRefresh:', showRefresh);
    try {
      if (showRefresh) setIsRefreshing(true);

      let vId = venueIdRef.current;
      if (!vId) {
        vId = await getUserVenueId();
        venueIdRef.current = vId;
      }

      if (!vId) {
        console.warn('[VenueDashboard] No venueId found, aborting');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      console.log('[VenueDashboard] Fetching data for venue:', vId);
      const minDelay = showRefresh
        ? new Promise((r) => setTimeout(r, 600))
        : Promise.resolve();

      const [venueData, statsData, partiesData] = await Promise.all([
        getVenueById(vId),
        getVenueStats(vId),
        getActiveVenueParties(vId),
        minDelay,
      ]);

      console.log('[VenueDashboard] Data loaded — venue:', !!venueData, 'stats:', !!statsData, 'parties:', partiesData.length);
      if (venueData) setVenue(venueData);
      setStats(statsData);
      setActiveParties(partiesData);
    } catch (err) {
      console.error('[VenueDashboard] Failed to load data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const challengeLimitReached = (stats?.challengesToday ?? 0) >= MAX_DAILY_CHALLENGES;
  const offerLimitReached = (stats?.offersToday ?? 0) >= MAX_DAILY_OFFERS;

  const handleOpenVenueDetail = useCallback(() => {
    if (!venue) return;
    router.push({ pathname: '/club-detail-sheet', params: { venueId: venue.id } });
  }, [venue]);

  const handleSendChallenge = useCallback(() => {
    router.push('/venue/challenge-type' as any);
  }, []);

  const handleSendOffer = useCallback(() => {
    router.push('/venue/offer-type' as any);
  }, []);

  const partyStickerIndices = useMemo(() => {
    return activeParties.map(p => hashPartyId(p.id));
  }, [activeParties]);

  const onRefresh = useCallback(() => {
    console.log('[VenueDashboard] Pull-to-refresh triggered');
    loadData(true);
  }, [loadData]);

  const renderPartyRow = useCallback(
    ({ item, index }: { item: ActiveVenueParty; index: number }) => (
      <PartyRow party={item} stickerIndex={partyStickerIndices[index]} />
    ),
    [partyStickerIndices],
  );

  const listHeader = useMemo(() => (
    <>
      {venue && (
        <VenueHeroCard venue={venue} onPress={handleOpenVenueDetail} />
      )}

      {stats && (
        <ActionCard
          title={t('venueDashboard.sendChallenge')}
          subtitle={
            challengeLimitReached
              ? t('venueDashboard.challengeLimitReached')
              : t('venueDashboard.challengesRemaining', { remaining: MAX_DAILY_CHALLENGES - stats.challengesToday })
          }
          countToday={stats.challengesToday}
          maxDaily={MAX_DAILY_CHALLENGES}
          disabled={challengeLimitReached}
          gradientColors={['#F97316', '#EA580C']}
          disabledGradient={['#374151', '#1F2937']}
          icon="flash"
          stickerEmojis={CHALLENGE_STICKER_EMOJIS}
          onPress={handleSendChallenge}
        />
      )}

      {stats && (
        <ActionCard
          title={t('venueDashboard.sendOffer')}
          subtitle={
            offerLimitReached
              ? t('venueDashboard.offerLimitReached')
              : t('venueDashboard.offersRemaining', { remaining: MAX_DAILY_OFFERS - stats.offersToday })
          }
          countToday={stats.offersToday}
          maxDaily={MAX_DAILY_OFFERS}
          disabled={offerLimitReached}
          gradientColors={['#EF4444', '#DC2626']}
          disabledGradient={['#374151', '#1F2937']}
          icon="pricetag"
          stickerEmojis={OFFER_STICKER_EMOJIS}
          onPress={handleSendOffer}
        />
      )}

      {stats && (
        <>
          <SectionHeader
            title={t('venueDashboard.partyStatsTitle')}
            accentTitle={t('venueDashboard.partyStatsAccent')}
            emojiSource={require('@/assets/emojis/partying_face.png')}
          />
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              {VENUE_STAT_ITEMS.map((item, index) => (
                <React.Fragment key={item.key}>
                  {index > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statItem}>
                    <View style={styles.statValueRow}>
                      <Image source={item.emoji} style={styles.statEmoji} contentFit="contain" />
                      <Text style={styles.statValue}>{stats[item.key]}</Text>
                    </View>
                    <Text style={styles.statLabel}>{t(item.labelKey)}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </>
      )}

      <SectionHeader
        title={t('venueDashboard.activePartiesTitle')}
        accentTitle={t('venueDashboard.activePartiesAccent')}
        emojiSource={require('@/assets/emojis/fire.png')}
        rightContent={
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{activeParties.length}</Text>
          </View>
        }
      />
    </>
  ), [venue, stats, activeParties.length, challengeLimitReached, offerLimitReached, handleOpenVenueDetail, handleSendChallenge, handleSendOffer, t]);

  const listEmpty = useMemo(() => (
    <View style={styles.emptyState}>
      <Ionicons name="moon-outline" size={32} color="rgba(255,255,255,0.2)" />
      <Text style={styles.emptyText}>{t('venueDashboard.noActiveParties')}</Text>
    </View>
  ), [t]);

  const listFooter = useMemo(() => <View style={styles.listFooter} />, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('venueDashboard.headerPrefix')}{' '}
            <Text style={styles.headerAccent}>{t('venueDashboard.headerAccent')}</Text>
          </Text>
        </View>

        <FlatList
          data={activeParties}
          keyExtractor={keyExtractor}
          renderItem={renderPartyRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="always"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary.main}
              colors={[Colors.primary.main]}
              progressBackgroundColor={Colors.background.primary}
            />
          }
        />
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
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
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
  headerAccent: {
    color: Colors.primary.main,
  },

  // Action Card (Challenge / Offer)
  actionCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: { borderCurve: 'continuous' as any },
    }),
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionCardTexture: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    zIndex: 2,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  actionCardTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: '#fff',
  },
  actionCardSubtitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  actionCardTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  actionCardBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    zIndex: 2,
  },
  actionCardBadgeText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#fff',
  },
  actionCardStickers: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: '100%',
    width: '45%',
    zIndex: 1,
  },
  actionCardSticker: {
    position: 'absolute',
    opacity: 0.8,
  },

  // Stats (profile-style layout)
  statsCard: {
    backgroundColor: Colors.surface.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
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

  // Active Parties Section
  activeBadge: {
    backgroundColor: Colors.primary.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary.main,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  partyRowSticker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyRowStickerImage: {
    width: 36,
    height: 36,
  },
  partyRowInfo: {
    flex: 1,
  },
  partyRowName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  partyRowMeta: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.size.md,
    color: Colors.text.muted,
  },
  listFooter: {
    height: 100,
  },
});
