/**
 * PARTYUP Archive Screen
 * ============================
 * Displays the user's ended party history in a grid / monthly calendar view.
 * Default view is the grid; the calendar is a toggleable alternative.
 * Tapping a party navigates to the full-screen party detail.
 */

import { ProBadge } from '@/src/components/ui/ProBadge';
import { PARTY_BACKGROUNDS, hashPartyId } from '@/src/constants/partyBackgrounds';
import { Colors } from '@/src/constants/theme';
import { getPartyPhotos } from '@/src/services/mediaService';
import { getEndedParties, getMemoryParty } from '@/src/services/partyService';
import { Party } from '@/src/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';

// ============================================
// CONSTANTS
// ============================================


import { CACHE_KEY_PARTIES } from '@/src/services/prefetchService';

// Cache configuration
const CACHE_KEY_THUMBNAILS = '@beparty/party-thumbnails';
const CACHE_KEY_FETCHED_AT = '@beparty/parties-fetched-at';
const THUMBNAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_FETCH_LIMIT = 50;

// Grid configuration
const GRID_PAGE_SIZE = 15;
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const CELL_WIDTH = (SCREEN_WIDTH - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;
const MEMORY_CARD_HEIGHT = (SCREEN_WIDTH - 32) * 0.38;

const MEMORY_EMOJIS = [
  require('@/assets/emojis/tada.png'),
  require('@/assets/emojis/partying_face.png'),
  require('@/assets/emojis/mirror_ball.png'),
  require('@/assets/emojis/champagne.png'),
  require('@/assets/emojis/fire.png'),
];

const MEMORY_STICKER_POSITIONS = [
  { right: -15, bottom: -18, size: 80, rotate: -12, zIndex: 10 },
  { right: 35, bottom: -8, size: 48, rotate: 18, zIndex: 5 },
  { right: -6, bottom: 38, size: 38, rotate: -15, zIndex: 4 },
  { right: 62, bottom: -2, size: 36, rotate: -10, zIndex: 3 },
  { right: 42, bottom: 28, size: 30, rotate: -10, zIndex: 2 },
];

// ============================================
// HELPERS
// ============================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function formatDate(dateStr: string, locale: string = 'en'): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(date);
}

function formatShortDate(dateStr: string, locale: string = 'en'): { day: string; month: string } {
  const date = new Date(dateStr);
  return {
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
  };
}

/** Split an array into fixed-size chunks */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}


// ============================================
// CALENDAR MONTH VIEW (fixed, non-scrollable)
// ============================================

interface CalendarMonthViewProps {
  year: number;
  month: number;
  parties: Party[];
  weekdays: string[];
  onSelectDay: (parties: Party[]) => void;
}

function CalendarMonthView({ year, month, parties, weekdays, onSelectDay }: CalendarMonthViewProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const partyByDay = useMemo(() => {
    const map: Record<number, Party[]> = {};
    parties.forEach((p) => {
      const date = new Date(p.createdAt);
      if (date.getFullYear() === year && date.getMonth() === month) {
        const d = date.getDate();
        if (!map[d]) map[d] = [];
        map[d].push(p);
      }
    });
    return map;
  }, [parties, year, month]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete the last row so every row has exactly 7 cells
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = chunkArray(cells, 7);

  return (
    <View style={styles.calendarGrid}>
      <View style={styles.weekdayRow}>
        {weekdays.map((w, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{w}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.daysRow}>
          {row.map((day, colIndex) => {
            if (day === null) {
              return <View key={`e-${rowIndex}-${colIndex}`} style={styles.dayCell} />;
            }

            const dayParties = partyByDay[day];
            const hasParty = dayParties && dayParties.length > 0;
            const isToday = isCurrentMonth && day === todayDate;

            return (
              <Pressable
                key={day}
                style={styles.dayCell}
                onPress={() => {
                  if (hasParty) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectDay(dayParties);
                  }
                }}
              >
                <View
                  style={[
                    styles.dayCellInner,
                    hasParty && styles.dayCellParty,
                    isToday && styles.dayCellToday,
                  ]}
                >
                  {hasParty && (
                    <>
                      <Image
                        source={PARTY_BACKGROUNDS[hashPartyId(dayParties[0].id) % PARTY_BACKGROUNDS.length]}
                        style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
                        contentFit="cover"
                      />
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10 },
                        ]}
                      />
                    </>
                  )}
                  <Text
                    style={[
                      styles.dayNum,
                      hasParty && styles.dayNumParty,
                      isToday && !hasParty && styles.dayNumToday,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ============================================
// PARTY LIST ROW
// ============================================

interface PartyRowProps {
  party: Party;
  thumbnail: string | null;
  locale: string;
  onPress: () => void;
}

function PartyRow({ party, thumbnail, locale, onPress }: PartyRowProps) {
  const totalDrinks = party.participants.reduce((sum, p) => sum + (p.drinks?.total ?? 0), 0);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.partyRow,
        { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.partyRowThumbnailWrapper}>
        <View style={styles.partyRowThumbnail}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.partyRowImage} contentFit="cover" />
          ) : (
            <View style={styles.partyRowPlaceholder}>
              <Ionicons name="image-outline" size={18} color="rgba(255,255,255,0.2)" />
            </View>
          )}
        </View>
        {party.creatorIsPro ? (
          <ProBadge size={18} style={styles.partyRowProBadge} />
        ) : null}
      </View>
      <View style={styles.partyRowInfo}>
        <Text style={styles.partyRowName} numberOfLines={1}>{party.name}</Text>
        <Text style={styles.partyRowMeta}>
          {formatDate(party.createdAt, locale)}
          <Text style={styles.partyRowSeparator}> · </Text>
          {party.participants.length} people
          <Text style={styles.partyRowSeparator}> · </Text>
          {totalDrinks} drinks
        </Text>
      </View>
      <Text style={styles.partyRowArrow}>{'\u203A'}</Text>
    </Pressable>
  );
}

// ============================================
// GRID VIEW (Instagram Stories Archive style)
// ============================================

type ViewMode = 'calendar' | 'grid';

interface GridCellProps {
  party: Party;
  thumbnail: string | null;
  locale: string;
  onPress: () => void;
}

function GridCell({ party, thumbnail, locale, onPress }: GridCellProps) {
  const { day, month } = formatShortDate(party.createdAt, locale);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.gridCell, pressed && { opacity: 0.85 }]}
    >
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.gridCellPlaceholder}>
          <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.15)" />
        </View>
      )}

      <View style={styles.gridCellDateLabel}>
        <Text style={styles.gridCellDay}>{day}</Text>
        <Text style={styles.gridCellMonth}>{month}</Text>
      </View>

      {party.creatorIsPro ? (
        <ProBadge size={16} style={styles.gridCellProBadge} />
      ) : null}

      <View style={styles.gridCellBottom}>
        <Text style={styles.gridCellName} numberOfLines={1}>{party.name}</Text>
      </View>
    </Pressable>
  );
}

interface GridViewProps {
  parties: Party[];
  thumbnails: Record<string, string | null>;
  locale: string;
  emptyText: string;
  onSelectParty: (party: Party) => void;
  onEndReached: () => void;
  loadingMore: boolean;
  memoryParty: Party | null;
  memoryThumbnail: string | null;
  memoryLabel: string;
  memorySubtitle: string;
}

function GridView({
  parties, thumbnails, locale, emptyText,
  onSelectParty, onEndReached, loadingMore,
  memoryParty, memoryThumbnail, memoryLabel, memorySubtitle,
}: GridViewProps) {
  const renderGridCell = useCallback(({ item: party }: { item: Party }) => (
    <GridCell
      party={party}
      thumbnail={thumbnails[party.id] ?? null}
      locale={locale}
      onPress={() => onSelectParty(party)}
    />
  ), [thumbnails, onSelectParty, locale]);

  const gridKeyExtractor = useCallback((item: Party) => item.id, []);

  const headerComponent = useMemo(() => {
    if (!memoryParty) return null;
    return (
      <Pressable
        onPress={() => onSelectParty(memoryParty)}
        style={({ pressed }) => [styles.memoryCard, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={['#5B2C8E', '#8B45C6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.memoryStickers} pointerEvents="none">
          {MEMORY_STICKER_POSITIONS.map((pos, i) => (
            <Image
              key={i}
              source={MEMORY_EMOJIS[i]}
              style={[styles.memorySticker, {
                right: pos.right,
                bottom: pos.bottom,
                width: pos.size,
                height: pos.size,
                transform: [{ rotate: `${pos.rotate}deg` }],
                zIndex: pos.zIndex,
              }]}
              contentFit="contain"
            />
          ))}
        </View>
        <View style={styles.memoryImageContainer}>
          {memoryThumbnail ? (
            <Image source={{ uri: memoryThumbnail }} style={styles.memoryImage} contentFit="cover" />
          ) : (
            <View style={styles.memoryImagePlaceholder}>
              <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.15)" />
            </View>
          )}
        </View>
        <View style={styles.memoryInfo}>
          <Text style={styles.memoryLabel}>{memoryLabel}</Text>
          <Text style={styles.memorySubtitle}>{memorySubtitle}</Text>
        </View>
      </Pressable>
    );
  }, [memoryParty, memoryThumbnail, memoryLabel, memorySubtitle, onSelectParty]);

  const footerComponent = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.listLoading}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
      </View>
    );
  }, [loadingMore]);

  return (
    <FlatList
      data={parties}
      renderItem={renderGridCell}
      keyExtractor={gridKeyExtractor}
      numColumns={GRID_COLUMNS}
      extraData={thumbnails}
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={[
        styles.gridContainer,
        parties.length === 0 && styles.gridContainerEmpty,
      ]}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.noParties}>{emptyText}</Text>
        </View>
      }
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
    />
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => t(`calendar.months.${i}`)), [t]);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => t(`calendar.weekdays.${i}`)), [t]);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const viewModeRef = useRef<ViewMode>(viewMode);
  viewModeRef.current = viewMode;

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const isFirstMount = useRef(true);

  // Grid client-side pagination
  const [gridDisplayCount, setGridDisplayCount] = useState(GRID_PAGE_SIZE);

  // Memory (On this Day)
  const [memoryParty, setMemoryParty] = useState<Party | null>(null);
  const [memoryThumbnail, setMemoryThumbnail] = useState<string | null>(null);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  /** Fetch one random thumbnail per party from their photos */
  const fetchThumbnails = useCallback(async (
    partiesToFetch: Party[],
  ): Promise<Record<string, string | null>> => {
    const thumbMap: Record<string, string | null> = {};
    await Promise.all(
      partiesToFetch.map(async (party) => {
        try {
          const photos = await getPartyPhotos(party.id);
          thumbMap[party.id] = photos.length > 0
            ? photos[hashPartyId(party.id) % photos.length].url
            : null;
        } catch {
          thumbMap[party.id] = null;
        }
      }),
    );
    return thumbMap;
  }, []);

  /**
   * Stale-while-revalidate data loading:
   * 1. On cold start, load from AsyncStorage cache for instant UI
   * 2. Always fetch fresh data from Supabase in the background
   * 3. Refresh thumbnails only when cache is stale (>24h) or incomplete
   */
  const loadParties = useCallback(async () => {
    try {
      // Load cached data for instant UI on cold start
      if (isFirstMount.current) {
        isFirstMount.current = false;
        const [cachedParties, cachedThumbs] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY_PARTIES),
          AsyncStorage.getItem(CACHE_KEY_THUMBNAILS),
        ]);
        if (cachedParties) {
          setParties(JSON.parse(cachedParties));
          setLoading(false);
        }
        if (cachedThumbs) {
          setThumbnails(JSON.parse(cachedThumbs));
        }
      }

      // Fetch fresh data from Supabase (last 12 months)
      const since = new Date();
      since.setMonth(since.getMonth() - 12);

      const fresh = await getEndedParties({
        limit: DEFAULT_FETCH_LIMIT,
        since: since.toISOString(),
      });

      setParties(fresh);
      setLoading(false);
      setHasMore(fresh.length >= DEFAULT_FETCH_LIMIT);
      offsetRef.current = fresh.length;
      setGridDisplayCount(GRID_PAGE_SIZE);

      // Persist party data to cache (fire-and-forget)
      AsyncStorage.setItem(CACHE_KEY_PARTIES, JSON.stringify(fresh));

      // Determine if thumbnails need refreshing
      const fetchedAtRaw = await AsyncStorage.getItem(CACHE_KEY_FETCHED_AT);
      const isStale = !fetchedAtRaw || Date.now() - parseInt(fetchedAtRaw, 10) > THUMBNAIL_CACHE_TTL;
      const thumbsRaw = await AsyncStorage.getItem(CACHE_KEY_THUMBNAILS);
      const cached: Record<string, string | null> = thumbsRaw ? JSON.parse(thumbsRaw) : {};

      const toFetch = isStale ? fresh : fresh.filter((p) => !(p.id in cached));
      if (toFetch.length === 0) return;

      const newThumbs = await fetchThumbnails(toFetch);
      const merged = { ...cached, ...newThumbs };
      setThumbnails(merged);

      // Persist thumbnail cache (fire-and-forget)
      AsyncStorage.setItem(CACHE_KEY_THUMBNAILS, JSON.stringify(merged));
      AsyncStorage.setItem(CACHE_KEY_FETCHED_AT, String(Date.now()));
    } catch {
      // Silently handle errors; cached or empty state is shown
      setLoading(false);
    }
  }, [fetchThumbnails]);

  // Refetch data every time the Calendar tab receives focus
  useFocusEffect(
    useCallback(() => {
      loadParties();
    }, [loadParties])
  );

  // Load memory party (from ~1 year ago) once on mount
  const memoryLoaded = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (memoryLoaded.current) return;
      memoryLoaded.current = true;

      (async () => {
        try {
          const party = await getMemoryParty();
          if (party) {
            setMemoryParty(party);
            const photos = await getPartyPhotos(party.id);
            if (photos.length > 0) {
              setMemoryThumbnail(photos[hashPartyId(party.id) % photos.length].url);
            }
          }
        } catch {
          // Silently handle; memory section simply won't appear
        }
      })();
    }, [])
  );

  /** Infinite scroll: load next page of older parties */
  const loadMoreParties = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - 12);

      const limit = viewModeRef.current === 'grid' ? GRID_PAGE_SIZE : DEFAULT_FETCH_LIMIT;
      const more = await getEndedParties({
        limit,
        offset: offsetRef.current,
        since: since.toISOString(),
      });

      if (more.length < limit) setHasMore(false);
      setParties((prev) => [...prev, ...more]);
      offsetRef.current += more.length;

      if (viewModeRef.current === 'grid') {
        setGridDisplayCount((prev) => prev + more.length);
      }

      const newThumbs = await fetchThumbnails(more);
      setThumbnails((prev) => ({ ...prev, ...newThumbs }));
    } catch {
      // Silently handle pagination errors
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, fetchThumbnails]);

  // Filter parties for current month
  const monthParties = useMemo(() => {
    return parties.filter((p) => {
      const date = new Date(p.createdAt);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });
  }, [parties, currentYear, currentMonth]);

  // Client-side paginated subset for the grid view (newest first)
  const gridParties = useMemo(
    () => parties.slice(0, gridDisplayCount),
    [parties, gridDisplayCount],
  );

  const handleGridEndReached = useCallback(() => {
    if (gridDisplayCount < parties.length) {
      setGridDisplayCount((prev) => prev + GRID_PAGE_SIZE);
      return;
    }
    if (hasMore && !loadingMore) {
      loadMoreParties();
    }
  }, [gridDisplayCount, parties.length, hasMore, loadingMore, loadMoreParties]);

  // Month transition animation via shared values
  const calendarTranslateX = useSharedValue(0);
  const calendarOpacity = useSharedValue(1);

  const animatedCalendarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: calendarTranslateX.value }],
    opacity: calendarOpacity.value,
  }));

  const animateMonthTransition = (direction: 'forward' | 'backward') => {
    const offset = direction === 'forward' ? SCREEN_WIDTH * 0.15 : -SCREEN_WIDTH * 0.15;
    calendarTranslateX.value = offset;
    calendarOpacity.value = 0;
    calendarTranslateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
    calendarOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
  };

  const goToPrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    animateMonthTransition('backward');
  };

  const goToNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    animateMonthTransition('forward');
  };

  const toggleView = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setViewMode((v) => (v === 'calendar' ? 'grid' : 'calendar'));
  };

  const toggleOpacity = useSharedValue(1);
  const toggleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toggleOpacity.value,
  }));

  // Swipe gesture for month navigation
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.translationX > 50) {
        runOnJS(goToPrevMonth)();
      } else if (event.translationX < -50) {
        runOnJS(goToNextMonth)();
      }
    });

  const navigateToPartyDetail = useCallback((party: Party) => {
    router.push({ pathname: '/(tabs)/calendar/party-detail', params: { partyId: party.id } });
  }, []);

  const handleDaySelect = useCallback((dayParties: Party[]) => {
    if (dayParties.length >= 1) {
      navigateToPartyDetail(dayParties[0]);
    }
  }, [navigateToPartyDetail]);

  const renderPartyRow = useCallback(({ item }: { item: Party }) => (
    <PartyRow
      party={item}
      thumbnail={thumbnails[item.id] ?? null}
      locale={i18n.language}
      onPress={() => navigateToPartyDetail(item)}
    />
  ), [thumbnails, navigateToPartyDetail, i18n.language]);

  const keyExtractor = useCallback((item: Party) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('calendar.my')} <Text style={styles.headerTitleAccent}>{t('calendar.archiveAccent')}</Text>
        </Text>
        <Animated.View style={toggleAnimatedStyle}>
          <Pressable
            onPressIn={() => { toggleOpacity.value = withTiming(0.4, { duration: 80 }); }}
            onPressOut={() => { toggleOpacity.value = withTiming(1, { duration: 150 }); }}
            onPress={toggleView}
            hitSlop={8}
            style={styles.headerButton}
          >
            <Ionicons
              name={viewMode === 'calendar' ? 'grid-outline' : 'calendar-outline'}
              size={22}
              color="rgba(255,255,255,0.6)"
            />
          </Pressable>
        </Animated.View>
      </View>

      {viewMode === 'calendar' ? (
        <>
          {/* Swipeable month navigation + calendar grid */}
          <GestureDetector gesture={swipeGesture}>
              <Animated.View>
                <View style={styles.monthNav}>
                  <Pressable onPress={goToPrevMonth} hitSlop={12}>
                    <Text style={styles.monthArrow}>{'\u2039'}</Text>
                  </Pressable>
                  <Text style={styles.monthTitle}>
                    {months[currentMonth]} {currentYear}
                  </Text>
                  <Pressable onPress={goToNextMonth} hitSlop={12}>
                    <Text style={styles.monthArrow}>{'\u203A'}</Text>
                  </Pressable>
                </View>

                <Animated.View style={animatedCalendarStyle}>
                  <CalendarMonthView
                    year={currentYear}
                    month={currentMonth}
                    parties={parties}
                    weekdays={weekdays}
                    onSelectDay={handleDaySelect}
                  />
                </Animated.View>
              </Animated.View>
            </GestureDetector>

            {/* Scrollable party list */}
            <View style={styles.partyListContainer}>
              {loading ? (
                <View style={styles.listLoading}>
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                </View>
              ) : monthParties.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.noParties}>{t('calendar.noPartiesThisMonth')}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.partyListHeader}>
                    <Image
                      source={require('@/assets/emojis/fire.png')}
                      style={styles.partyListIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.partyListTitle}>
                      {t('calendar.partiesIn')}{' '}
                      <Text style={styles.partyListTitleAccent}>{months[currentMonth]}</Text>
                    </Text>
                  </View>
                  <FlatList
                    data={monthParties}
                    renderItem={renderPartyRow}
                    keyExtractor={keyExtractor}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.partyListContent}
                    onEndReached={loadMoreParties}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? (
                      <View style={styles.listLoading}>
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                      </View>
                    ) : null}
                  />
                </>
              )}
            </View>
          </>
        ) : (
          loading ? (
            <View style={styles.listLoading}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
            </View>
          ) : (
            <GridView
              parties={gridParties}
              thumbnails={thumbnails}
              locale={i18n.language}
              emptyText={t('calendar.noPartiesYet')}
              onSelectParty={navigateToPartyDetail}
              onEndReached={handleGridEndReached}
              loadingMore={loadingMore}
              memoryParty={memoryParty}
              memoryThumbnail={memoryThumbnail}
              memoryLabel={t('calendar.onThisDay')}
              memorySubtitle={t('calendar.oneYearAgo')}
            />
          )
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
  headerButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },

  // Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
    marginTop: 4,
  },
  monthArrow: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '300',
    paddingHorizontal: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },

  // Calendar Grid
  calendarGrid: {
    paddingHorizontal: 24,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: ROUNDED,
  },
  daysRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  dayCellInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  dayCellParty: {
    borderColor: 'rgba(191,255,0,0.25)',
  },
  dayCellToday: {
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    fontFamily: ROUNDED,
  },
  dayNumParty: {
    fontWeight: '700',
    color: '#fff',
  },
  dayNumToday: {
    fontWeight: '700',
    color: Colors.primary.main,
  },

  // Party List
  partyListContainer: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  partyListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  partyListIcon: {
    width: 24,
    height: 24,
  },
  partyListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },
  partyListTitleAccent: {
    color: Colors.primary.main,
  },
  partyListContent: {
    paddingBottom: 100,
  },
  listLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noParties: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: ROUNDED,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Party Row
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  partyRowThumbnailWrapper: {
    width: 48,
    height: 48,
  },
  partyRowThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  partyRowProBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  partyRowImage: {
    width: '100%',
    height: '100%',
  },
  partyRowPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyRowInfo: {
    flex: 1,
  },
  partyRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: ROUNDED,
  },
  partyRowMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    fontFamily: ROUNDED,
    marginTop: 2,
  },
  partyRowSeparator: {
    color: Colors.primary.main,
  },
  partyRowArrow: {
    fontSize: 20,
    color: Colors.primary.main,
    fontWeight: '300',
  },

  // Grid View (Instagram Stories Archive style)
  gridContainer: {
    paddingBottom: 100,
  },
  gridContainerEmpty: {
    flexGrow: 1,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  gridCell: {
    width: CELL_WIDTH,
    aspectRatio: 3 / 4,
    backgroundColor: Colors.surface.primary,
    overflow: 'hidden',
    marginBottom: GRID_GAP,
  },
  gridCellPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.primary,
  },
  gridCellDateLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  gridCellProBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gridCellDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridCellMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: ROUNDED,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridCellBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  gridCellName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    fontFamily: ROUNDED,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Memory (On this Day) — Game card style
  memoryCard: {
    marginTop: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    height: MEMORY_CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        borderCurve: 'continuous' as any,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  memoryStickers: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: '60%',
    width: '70%',
    zIndex: 1,
  },
  memorySticker: {
    position: 'absolute',
  },
  memoryImageContainer: {
    width: 100,
    height: '100%',
    zIndex: 2,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
  },
  memoryImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  memoryInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  memoryLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  memorySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: ROUNDED,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
