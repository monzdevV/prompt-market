/**
 * Horizontal carousel of party participants showing avatars and drink counts.
 * Sorted by drink total (highest first), with inactive participants dimmed.
 * Shared between active party room and ended party detail screens.
 */

import { AvatarImage } from '@/src/components/ui/AvatarImage';
import { Colors, Spacing } from '@/src/constants/theme';
import { PartyParticipant } from '@/src/types';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const CARD_ROTATIONS = [-3, 2, -2, 3, -1, 2, -3, 1];
const AVATAR_COLORS = ['#F97316', '#8B5CF6', '#10B981', '#EC4899', '#3B82F6', '#F59E0B', '#EF4444', '#06B6D4'];

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase();
}

interface PeopleCarouselProps {
  participants: PartyParticipant[];
  currentUserId?: string;
  isEndedParty?: boolean;
}

export function PeopleCarousel({ participants, currentUserId, isEndedParty }: PeopleCarouselProps) {
  const { t } = useTranslation();

  const sorted = [...participants].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return (b.drinks?.total ?? 0) - (a.drinks?.total ?? 0);
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.container}
    >
      {sorted.map((participant) => {
        const hash = participant.userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const rotation = CARD_ROTATIONS[hash % CARD_ROTATIONS.length];
        const isMe = participant.userId === currentUserId;
        const isInactive = !isEndedParty && !participant.isActive;

        return (
          <View
            key={participant.id}
            style={[
              styles.item,
              { transform: [{ rotate: `${rotation}deg` }] },
              isInactive && styles.itemInactive,
            ]}
          >
            <LinearGradient
              colors={['#1C1C1E', '#141416', '#0A0A0B']}
              style={[styles.card, isMe && styles.cardOwn]}
            >
              <View style={styles.avatarOuter}>
                {participant.avatarUrl ? (
                  <AvatarImage uri={participant.avatarUrl} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] }]}>
                    <Text style={styles.avatarInitials}>
                      {getInitials(participant.username ?? participant.displayName)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {isMe ? t('common.you') : (participant.username ?? participant.displayName)}
              </Text>
              <View style={styles.drinks}>
                <Text style={styles.drinksEmoji}>{'\u{1F37A}'}</Text>
                <Text style={styles.drinksCount}>{participant.drinks?.total ?? 0}</Text>
              </View>
            </LinearGradient>
          </View>
        );
      })}
    </ScrollView>
  );
}

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  item: {
    width: 72,
  },
  itemInactive: {
    opacity: 0.4,
  },
  card: {
    borderRadius: 14,
    padding: Spacing.sm,
    alignItems: 'center',
    height: 100,
    justifyContent: 'center',
  },
  cardOwn: {
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  avatarOuter: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
  },
  name: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    maxWidth: 64,
    marginBottom: 4,
  },
  drinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  drinksEmoji: {
    fontSize: 10,
  },
  drinksCount: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
});
