/**
 * PARTYUP Clubs Screen
 * ============================
 * Displays nearby nightclubs/pubs in a grid view identical to the Calendar grid.
 * Cards show GIF backgrounds, venue name, city, and party counts.
 * The top 3 "hot" venues (most parties) display a fire sticker overlay.
 * Requires location permission; prompts the user to enable it if denied.
 */

import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { useLocation } from '@/src/hooks/useLocation';
import { useDebounce } from '@/src/hooks';
import { PARTY_BACKGROUNDS, hashPartyId } from '@/src/constants/partyBackgrounds';
import { Colors } from '@/src/constants/theme';
import { getNearbyVenues, DEFAULT_VENUE_PAGE_SIZE } from '@/src/services/venueService';
import { Venue } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';

// ============================================
// CONSTANTS
// ============================================

const HOT_VENUE_COUNT = 3;

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ============================================
// FIRE STICKER (animated bounce for hot venues)
// ============================================

function FireSticker() {
  const bounceY = useSharedValue(0);

  React.useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  return (
    <Animated.View style={[styles.fireSticker, animatedStyle]}>
      <Image
        source={require('@/assets/emojis/fire.png')}
        style={styles.fireStickerImage}
        contentFit="contain"
      />
    </Animated.View>
  );
}

// ============================================
// VENUE GRID CARD
// ============================================

interface VenueCardProps {
  venue: Venue;
  isHot: boolean;
  onPress: () => void;
}

function VenueCard({ venue, isHot, onPress }: VenueCardProps) {
  const { t } = useTranslation();
  const bgSource = venue.imageUrl
    ? { uri: venue.imageUrl }
    : PARTY_BACKGROUNDS[hashPartyId(venue.id) % PARTY_BACKGROUNDS.length];

  const partiesToday = venue.partiesToday ?? 0;
  const partiesWeek = venue.partiesLastWeek ?? 0;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.85 }]}
    >
      <Image source={bgSource} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      {isHot ? <FireSticker /> : null}

      <View style={styles.gridCardInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.gridCardName} numberOfLines={1}>{venue.name}</Text>
          {venue.isVerified && <VerifiedBadge size={14} />}
        </View>
        <Text style={styles.gridCardCity} numberOfLines={1}>
          {venue.addressCity ?? venue.amenity}
          {venue.distanceMeters != null ? ` · ${formatDistance(venue.distanceMeters)}` : ''}
        </Text>
        {(partiesToday > 0 || partiesWeek > 0) ? (
          <Text style={styles.gridCardParties}>
            {partiesToday > 0 ? t('clubs.partiesToday', { count: partiesToday }) : ''}
            {partiesToday > 0 && partiesWeek > 0 ? ' · ' : ''}
            {partiesWeek > 0 ? t('clubs.partiesThisWeek', { count: partiesWeek }) : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ============================================
// LOCATION REQUIRED STATE
// ============================================

interface LocationRequiredProps {
  permissionStatus: string;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
}

function LocationRequired({ permissionStatus, onRequestPermission, onOpenSettings }: LocationRequiredProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.locationRequired}>
      <Ionicons name="location-outline" size={48} color="rgba(255,255,255,0.25)" />
      <Text style={styles.locationRequiredTitle}>{t('clubs.locationRequired')}</Text>
      <Text style={styles.locationRequiredText}>{t('clubs.enableLocation')}</Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (permissionStatus === 'undetermined') {
            onRequestPermission();
          } else {
            onOpenSettings();
          }
        }}
        style={({ pressed }) => [
          styles.locationRequiredButton,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="location" size={18} color="#0A0A0B" />
        <Text style={styles.locationRequiredButtonText}>{t('clubs.openSettings')}</Text>
      </Pressable>
    </View>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function ClubsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { location, permissionStatus, isLoading: isLoadingLocation, requestPermission, openSettings } = useLocation();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const offsetRef = useRef(0);

  const loadVenues = useCallback(async () => {
    if (!location) {
      setLoading(false);
      return;
    }

    const searchTerm = debouncedSearch.trim();
    const amenityFilter = searchTerm ? undefined : 'nightclub';

    setLoading(true);
    try {
      const results = await getNearbyVenues(
        location.latitude,
        location.longitude,
        {
          limit: DEFAULT_VENUE_PAGE_SIZE,
          search: searchTerm || undefined,
          amenity: amenityFilter,
        },
      );
      setVenues(results);
      setHasMore(results.length >= DEFAULT_VENUE_PAGE_SIZE);
      offsetRef.current = 0;
    } catch (err) {
      console.error('[Clubs] Failed to load venues:', err);
    } finally {
      setLoading(false);
    }
  }, [location, debouncedSearch]);

  // Reload on tab focus and when search/location changes
  useFocusEffect(
    useCallback(() => {
      loadVenues();
    }, [loadVenues]),
  );

  const loadMoreVenues = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !location) return;

    const searchTerm = debouncedSearch.trim();
    const amenityFilter = searchTerm ? undefined : 'nightclub';

    setLoadingMore(true);
    try {
      const newOffset = offsetRef.current + DEFAULT_VENUE_PAGE_SIZE;
      const more = await getNearbyVenues(
        location.latitude,
        location.longitude,
        {
          limit: DEFAULT_VENUE_PAGE_SIZE,
          offset: newOffset,
          search: searchTerm || undefined,
          amenity: amenityFilter,
        },
      );
      if (more.length < DEFAULT_VENUE_PAGE_SIZE) setHasMore(false);
      setVenues((prev) => [...prev, ...more]);
      offsetRef.current = newOffset;
    } catch (err) {
      console.error('[Clubs] Failed to load more venues:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, location, debouncedSearch]);

  const navigateToClubDetail = useCallback((venue: Venue) => {
    Keyboard.dismiss();
    router.push({ pathname: '/club-detail-sheet', params: { venueId: venue.id } });
  }, []);

  const renderVenueCard = useCallback(({ item, index }: { item: Venue; index: number }) => {
    const isHot = index < HOT_VENUE_COUNT && (item.partiesToday ?? 0) + (item.partiesLastWeek ?? 0) > 0;
    return (
      <VenueCard
        venue={item}
        isHot={isHot}
        onPress={() => navigateToClubDetail(item)}
      />
    );
  }, [navigateToClubDetail]);

  const keyExtractor = useCallback((item: Venue) => item.id, []);

  const locationNotAvailable = permissionStatus !== 'granted' && !isLoadingLocation;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Pressable style={styles.header} onPress={Keyboard.dismiss}>
        <Text style={styles.headerTitle}>
          {t('clubs.hot')} <Text style={styles.headerTitleAccent}>{t('clubs.clubsAccent')}</Text>
        </Text>
      </Pressable>

      {locationNotAvailable ? (
        <LocationRequired
          permissionStatus={permissionStatus}
          onRequestPermission={requestPermission}
          onOpenSettings={openSettings}
        />
      ) : (
        <>
          {/* Search bar */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={t('clubs.searchPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.25)"
                selectionColor={Colors.primary.main}
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Venue grid */}
          {loading ? (
            <View style={styles.listLoading}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
            </View>
          ) : (
            <FlatList
              data={venues}
              renderItem={renderVenueCard}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.gridContainer,
                venues.length === 0 && styles.gridContainerEmpty,
              ]}
              onEndReached={loadMoreVenues}
              onEndReachedThreshold={0.5}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.noVenues}>{t('clubs.noClubsNearby')}</Text>
                </View>
              }
              ListFooterComponent={loadingMore ? (
                <View style={styles.listLoading}>
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                </View>
              ) : null}
            />
          )}
        </>
      )}
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

  // Header (identical to CalendarScreen)
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

  // Search
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: ROUNDED,
    padding: 0,
  },

  // Grid View (identical to CalendarScreen grid)
  gridContainer: {
    paddingBottom: 100,
  },
  gridContainerEmpty: {
    flexGrow: 1,
  },
  gridCard: {
    height: 200,
    overflow: 'hidden',
  },
  gridCardInfo: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
  },
  gridCardName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  gridCardCity: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.primary.main,
    fontFamily: ROUNDED,
    marginTop: 4,
  },
  gridCardParties: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: ROUNDED,
    marginTop: 4,
  },

  // Fire sticker for hot venues
  fireSticker: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 10,
  },
  fireStickerImage: {
    width: 32,
    height: 32,
  },

  // Loading & empty states (identical to CalendarScreen)
  listLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVenues: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: ROUNDED,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Location required state
  locationRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  locationRequiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: ROUNDED,
    textAlign: 'center',
  },
  locationRequiredText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: ROUNDED,
    textAlign: 'center',
    lineHeight: 22,
  },
  locationRequiredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary.main,
    marginTop: 8,
  },
  locationRequiredButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A0A0B',
    fontFamily: ROUNDED,
  },
});
