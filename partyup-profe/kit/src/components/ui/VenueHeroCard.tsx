/**
 * PARTYUP Venue Hero Card
 * ========================
 * Reusable card displaying a venue with its background image,
 * name, verified badge, and city. Used across the venue dashboard,
 * active party room, and party history screens.
 */

import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { PARTY_BACKGROUNDS, hashPartyId } from '@/src/constants/partyBackgrounds';
import { Colors, Spacing, Typography, BorderRadius } from '@/src/constants/theme';
import { Venue } from '@/src/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const DEFAULT_HEIGHT = 160;

interface VenueHeroCardProps {
  venue: Venue;
  onPress?: () => void;
  height?: number;
}

export function VenueHeroCard({ venue, onPress, height = DEFAULT_HEIGHT }: VenueHeroCardProps) {
  const bgSource = venue.imageUrl
    ? { uri: venue.imageUrl }
    : PARTY_BACKGROUNDS[hashPartyId(venue.id) % PARTY_BACKGROUNDS.length];

  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { height },
        pressed && onPress && styles.cardPressed,
      ]}
    >
      <Image source={bgSource} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
          {venue.isVerified && <VerifiedBadge size={20} />}
        </View>
        {venue.addressCity ? (
          <Text style={styles.city}>{venue.addressCity}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: { borderCurve: 'continuous' as any },
    }),
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  info: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.base,
    right: Spacing.base,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flexShrink: 1,
  },
  city: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary.main,
    marginTop: 2,
  },
});
