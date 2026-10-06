/**
 * Challenge Results Screen
 * ========================
 * Full-screen modal (slide from bottom) that displays the results for a
 * completed challenge. Fixed gradient header with close button, challenge
 * identity (type, number, question, source badge), and scrollable results.
 *
 * Data strategy:
 * - Active party: reads from the global store (real-time via existing subscriptions)
 * - Past party (history): fetches responses/reactions on mount (one-shot)
 */

import { ChallengeResultsSection } from '@/src/components/party';
import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { Colors, Spacing } from '@/src/constants/theme';
import { getResponsesByParty } from '@/src/services/challengeService';
import { getChallengeReactionsByParty, removeChallengeReaction, upsertChallengeReaction } from '@/src/services/reactionService';
import { useApp } from '@/src/store';
import type { ChallengePhotoReaction, ChallengeResponse, PartyChallenge } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const FIRE_STICKER = require('@/assets/emojis/fire.png');

// ============================================
// GRADIENT PALETTES (mirrored from ChallengeHeaderCard)
// ============================================

const CHALLENGE_GRADIENTS: Record<string, [string, string]> = {
  image: ['#F97316', '#EA580C'],
  note: ['#8B5CF6', '#6D28D9'],
  check: ['#10B981', '#059669'],
};

const ACCENT_COLORS: Record<string, string> = {
  image: '#FED7AA',
  note: '#C4B5FD',
  check: '#6EE7B7',
};

// ============================================
// SCREEN
// ============================================

export default function ChallengeResultsSheet() {
  const {
    challengeId, partyId, orderNumber, question, type,
    sourceType, sourceName, sourceVerified,
  } = useLocalSearchParams<{
    challengeId: string;
    partyId: string;
    orderNumber: string;
    question: string;
    type: string;
    sourceType?: string;
    sourceName?: string;
    sourceVerified?: string;
  }>();

  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const insets = useSafeAreaInsets();
  const currentUserId = state.user?.id;

  const isActiveParty = state.currentParty?.id === partyId;

  const [fetchedResponses, setFetchedResponses] = useState<ChallengeResponse[]>([]);
  const [fetchedReactions, setFetchedReactions] = useState<ChallengePhotoReaction[]>([]);
  const [loading, setLoading] = useState(!isActiveParty);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (isActiveParty || !partyId) return;
    let cancelled = false;

    (async () => {
      try {
        const [responses, reactions] = await Promise.all([
          getResponsesByParty(partyId),
          getChallengeReactionsByParty(partyId),
        ]);
        if (cancelled) return;
        setFetchedResponses(responses);
        setFetchedReactions(reactions);
      } catch (err) {
        console.warn('[ChallengeResults] Failed to fetch data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isActiveParty, partyId]);

  const responses = isActiveParty ? state.challengeResponses : fetchedResponses;
  const reactions = isActiveParty ? state.challengePhotoReactions : fetchedReactions;

  const challenge = useMemo<PartyChallenge>(() => ({
    id: challengeId,
    partyId,
    creatorId: '',
    type: type as PartyChallenge['type'],
    question,
    orderNumber: Number(orderNumber),
    expiresAt: '',
    isExpired: true,
    createdAt: '',
  }), [challengeId, partyId, type, question, orderNumber]);

  const handleReact = useCallback(async (responseId: string, stickerId: string) => {
    if (!currentUserId) return;
    dispatch({
      type: 'UPSERT_CHALLENGE_PHOTO_REACTION',
      payload: { id: `temp-${Date.now()}`, mediaId: responseId, userId: currentUserId, stickerId, createdAt: new Date().toISOString() },
    });
    try {
      await upsertChallengeReaction(responseId, stickerId);
    } catch (err) {
      console.warn('[ChallengeResults] Failed to upsert reaction:', err);
      dispatch({ type: 'REMOVE_CHALLENGE_PHOTO_REACTION', payload: { mediaId: responseId, userId: currentUserId } });
    }
  }, [currentUserId, dispatch]);

  const handleRemoveReaction = useCallback(async (responseId: string) => {
    if (!currentUserId) return;
    dispatch({ type: 'REMOVE_CHALLENGE_PHOTO_REACTION', payload: { mediaId: responseId, userId: currentUserId } });
    try {
      await removeChallengeReaction(responseId);
    } catch (err) {
      console.warn('[ChallengeResults] Failed to remove reaction:', err);
    }
  }, [currentUserId, dispatch]);

  const handleHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  }, []);

  const gradientColors = CHALLENGE_GRADIENTS[type] ?? CHALLENGE_GRADIENTS.check;
  const accentColor = ACCENT_COLORS[type] ?? ACCENT_COLORS.check;
  const isVenueSource = sourceType === 'venue';

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={styles.headerWrapper} onLayout={handleHeaderLayout}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          {/* Top row: close button + title + source badge */}
          <View style={styles.headerTopRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('challenges.challengeTitle')}
              <Text style={[styles.headerOrderNumber, { color: accentColor }]}>
                {' '}#{orderNumber}
              </Text>
            </Text>

            {sourceType && (
              <View style={styles.sourceBadge}>
                {isVenueSource ? (
                  <>
                    <Text style={styles.sourceBadgeText} numberOfLines={1}>
                      {sourceName}
                    </Text>
                    {sourceVerified === 'true' && <VerifiedBadge size={12} />}
                  </>
                ) : (
                  <>
                    <Image source={FIRE_STICKER} style={styles.sourceBadgeIcon} contentFit="contain" />
                    <Text style={styles.sourceBadgeText}>Party</Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Question below */}
          <Text style={styles.headerQuestion} numberOfLines={3}>
            {question}
          </Text>
        </LinearGradient>
      </View>

      {/* Scrollable results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary.main} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ChallengeResultsSection
            challenge={challenge}
            responses={responses}
            reactions={reactions}
            currentUserId={currentUserId}
            readOnly={!isActiveParty}
            onReact={isActiveParty ? handleReact : undefined}
            onRemoveReaction={isActiveParty ? handleRemoveReaction : undefined}
          />
        </ScrollView>
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
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.6,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerOrderNumber: {
    fontWeight: '900',
    fontFamily: ROUNDED,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: ROUNDED,
  },
  sourceBadgeIcon: {
    width: 12,
    height: 12,
  },
  headerQuestion: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: ROUNDED,
    marginLeft: 46,
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
});
