/**
 * PARTYUP Party Detail Screen
 * ================================
 * Full-screen detail view for past (ended) parties.
 * Displays ranking, photos (with long-press download), and notes.
 * GIF background extends behind the status bar with a scroll-over effect.
 * Uses a custom glassmorphic back button (no native header).
 */

import { CAROUSEL_CARD_WIDTH, ChallengeCarousel, ChallengeHeaderCard, NoteAuthorRow, PeopleCarousel, PhotoGrid, SectionHeader } from '@/src/components/party';
import { ProBadge } from '@/src/components/ui/ProBadge';
import { VenueHeroCard } from '@/src/components/ui/VenueHeroCard';
import { getPartyGif } from '@/src/constants/partyBackgrounds';
import { BorderRadius, Colors, Spacing } from '@/src/constants/theme';
import { getChallengesByParty } from '@/src/services/challengeService';
import { getPartyPhotos } from '@/src/services/mediaService';
import { getPartyNotes } from '@/src/services/noteService';
import { getPartyById } from '@/src/services/partyService';
import { getReactionsByParty } from '@/src/services/reactionService';
import { getVenueById } from '@/src/services/venueService';
import { useApp } from '@/src/store';
import type { Party, PartyChallenge, PartyMedia, PartyNote, PhotoReaction, Venue } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const GLASS_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';

// ============================================
// HELPERS
// ============================================

function formatDuration(startDate: string, endDate?: string): string {
  if (!endDate) return '';
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(date);
}


// ============================================
// SCREEN
// ============================================

export default function PartyDetailScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const { state } = useApp();
  const { t, i18n } = useTranslation();
  const currentUserId = state.user?.id;
  const insets = useSafeAreaInsets();

  const [party, setParty] = useState<Party | null>(null);
  const [photos, setPhotos] = useState<PartyMedia[]>([]);
  const [notes, setNotes] = useState<PartyNote[]>([]);
  const [reactions, setReactions] = useState<PhotoReaction[]>([]);
  const [challenges, setChallenges] = useState<PartyChallenge[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partyId) return;
    let cancelled = false;

    (async () => {
      try {
        const [partyData, partyPhotos, partyNotes, partyReactions, partyChallenges] = await Promise.all([
          getPartyById(partyId),
          getPartyPhotos(partyId),
          getPartyNotes(partyId),
          getReactionsByParty(partyId),
          getChallengesByParty(partyId),
        ]);
        if (cancelled) return;

        let venueData: Venue | null = null;
        if (partyData?.venueId) {
          try {
            venueData = await getVenueById(partyData.venueId);
          } catch {
            // Venue fetch is non-critical
          }
        }
        if (cancelled) return;

        setParty(partyData);
        setPhotos(partyPhotos);
        setNotes(partyNotes);
        setReactions(partyReactions);
        setChallenges(partyChallenges);
        setVenue(venueData);
      } catch (err) {
        console.warn('[PartyDetail] Failed to load party data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [partyId]);

  // Separate venue challenges from user challenges
  const venueLinkedUserId = venue?.linkedUserId;
  const venueChallenges = useMemo(
    () => venueLinkedUserId
      ? challenges.filter(c => c.creatorId === venueLinkedUserId)
      : [],
    [challenges, venueLinkedUserId],
  );
  const userChallenges = useMemo(
    () => venueLinkedUserId
      ? challenges.filter(c => c.creatorId !== venueLinkedUserId)
      : challenges,
    [challenges, venueLinkedUserId],
  );

  const handleOpenVenueDetail = useCallback(() => {
    if (!venue) return;
    router.push({ pathname: '/club-detail-sheet', params: { venueId: venue.id } });
  }, [venue]);

  const handleNotePress = useCallback((note: PartyNote) => {
    if (!party) return;
    router.push({ pathname: '/note-editor', params: { partyId: party.id, noteId: note.id } });
  }, [party]);

  const renderCompletedChallenge = useCallback(
    (challenge: PartyChallenge) => {
      const isFromVenue = venueLinkedUserId != null && challenge.creatorId === venueLinkedUserId;
      return (
        <ChallengeHeaderCard
          orderNumber={challenge.orderNumber}
          question={challenge.question}
          type={challenge.type}
          isCompleted
          width={CAROUSEL_CARD_WIDTH}
          onPress={() => router.push({
            pathname: '/challenge-results-sheet',
            params: {
              challengeId: challenge.id,
              partyId: challenge.partyId,
              orderNumber: String(challenge.orderNumber),
              question: challenge.question,
              type: challenge.type,
              sourceType: isFromVenue ? 'venue' : 'party',
              sourceName: isFromVenue ? (venue?.name ?? '') : '',
              sourceVerified: isFromVenue ? String(venue?.isVerified ?? false) : '',
            },
          })}
        />
      );
    },
    [venueLinkedUserId, venue],
  );

  const challengeKeyExtractor = useCallback((c: PartyChallenge) => c.id, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary.main} />
      </View>
    );
  }

  if (!party) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{t('partyDetail.partyNotFound')}</Text>
      </View>
    );
  }

  const gifSource = getPartyGif(party.id);
  const duration = formatDuration(party.createdAt, party.endedAt);

  return (
    <View style={styles.container}>
      {/* Background GIF (extends behind status bar) */}
      <View style={styles.bgWrap}>
        <Image source={gifSource} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(10,10,11,0.95)', '#0A0A0B']}
          locations={[0, 0.45, 0.7]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Glassmorphic back button */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.backButton,
          { top: insets.top + 8 },
          pressed && styles.backButtonPressed,
        ]}
      >
        <BlurView intensity={30} tint="dark" style={styles.backButtonBlur}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
        </BlurView>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{party.name}</Text>
            {party.creatorIsPro ? (
              <ProBadge size={32} style={styles.titleProBadge} />
            ) : null}
          </View>
          <Text style={styles.date}>
            {formatDate(party.createdAt, i18n.language)}{duration ? ` · ${duration}` : ''}
          </Text>
        </View>

        {/* Venue card + venue challenge results carousel */}
        {venue && (
          <VenueHeroCard venue={venue} onPress={handleOpenVenueDetail} height={120} />
        )}
        {venueChallenges.length > 0 && (
          <View style={styles.fullWidthCarousel}>
            <ChallengeCarousel
              items={venueChallenges}
              keyExtractor={challengeKeyExtractor}
              renderItem={renderCompletedChallenge}
            />
          </View>
        )}

        {/* Party Drinks header + carousel (identical to active party) */}
        <SectionHeader
          title={t('partyRoom.partyDrinksTitle')}
          accentTitle={t('partyRoom.partyDrinksAccent')}
          emojiSource={require('@/assets/emojis/beer.png')}
        />

        <View style={styles.fullWidthCarousel}>
          <PeopleCarousel participants={party.participants} currentUserId={currentUserId} isEndedParty />
        </View>

        {/* Party Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t('partyDetail.partyPhotosTitle')}
              accentTitle={t('partyDetail.partyPhotosAccent')}
              emojiSource={require('@/assets/emojis/fire.png')}
            />
            <PhotoGrid
              photos={photos}
              reactions={reactions}
              currentUserId={currentUserId}
              readOnly
            />
          </View>
        )}

        {/* Party Notes */}
        {notes.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t('partyDetail.partyNotesTitle')}
              accentTitle={t('partyDetail.partyNotesAccent')}
              emojiSource={require('@/assets/emojis/tada.png')}
            />
            <View style={styles.noteList}>
              {notes.map((note) => {
                const isOwn = note.authorId === currentUserId;
                return (
                  <Pressable
                    key={note.id}
                    onPress={() => handleNotePress(note)}
                    style={({ pressed }) => [
                      styles.noteCard,
                      isOwn && styles.ownContentBorder,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.noteText} numberOfLines={5}>
                      {note.content}
                    </Text>
                    <NoteAuthorRow
                      avatarUrl={note.authorAvatarUrl}
                      username={note.authorUsername}
                      displayName={note.authorName}
                      fallbackLabel={t('common.anonymous')}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* User challenge results carousel */}
        {userChallenges.length > 0 && (
          <View>
            <View style={styles.challengeSectionHeader}>
              <SectionHeader
                title={t('partyRoom.partyChallengesTitle')}
                accentTitle={t('partyRoom.partyChallengesAccent')}
                emojiSource={require('@/assets/emojis/poop.png')}
              />
            </View>
            <View style={styles.fullWidthCarousel}>
              <ChallengeCarousel
                items={userChallenges}
                keyExtractor={challengeKeyExtractor}
                renderItem={renderCompletedChallenge}
              />
            </View>
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: ROUNDED,
  },

  // Background GIF (extends to screen edges, behind status bar)
  bgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },

  // Glass back button (same style as CreatePartyScreen close button)
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    overflow: 'hidden',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.md,
  },

  // Header
  header: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleProBadge: {
    marginTop: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: ROUNDED,
    marginTop: 6,
  },

  // Full-width wrapper to counteract scroll content horizontal padding
  fullWidthCarousel: {
    marginHorizontal: -Spacing.lg,
  },

  // Sections
  section: {},

  // Challenge results
  challengeSectionHeader: {},

  // Notes
  noteList: {
    gap: 8,
  },
  noteCard: {
    backgroundColor: Colors.surface.primary,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  ownContentBorder: {
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  noteText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },

});
