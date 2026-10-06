/**
 * PARTYUP Club Detail Sheet
 * ==========================
 * Bottom sheet displaying full venue information and party statistics.
 * Presented as a formSheet with profile-style stats, contact info,
 * and social links. Content fits within the sheet on most devices
 * but allows scroll when needed.
 */

import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { PARTY_BACKGROUNDS, hashPartyId } from '@/src/constants/partyBackgrounds';
import { Colors, BorderRadius, Spacing, Typography } from '@/src/constants/theme';
import { getVenueById } from '@/src/services/venueService';
import { Venue } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_DETENT = 0.78;

// ============================================
// STAT ITEMS (profile-style with emojis)
// ============================================

/* eslint-disable @typescript-eslint/no-require-imports */
const VENUE_STAT_ITEMS = [
  { key: 'partiesToday' as const, emoji: require('@/assets/emojis/partying_face.png'), labelKey: 'clubDetail.partiesNow' },
  { key: 'partiesLastWeek' as const, emoji: require('@/assets/emojis/fire.png'), labelKey: 'clubDetail.partiesWeek' },
];
/* eslint-enable @typescript-eslint/no-require-imports */

// ============================================
// INFO ROW
// ============================================

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}

function InfoRow({ icon, label, value, onPress }: InfoRowProps) {
  const content = (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.4)" />
      <View style={styles.infoRowContent}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text
          style={[styles.infoRowValue, onPress && styles.infoRowValueLink]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={() => { Haptics.selectionAsync(); onPress(); }}>
        {content}
      </Pressable>
    );
  }

  return content;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ClubDetailSheet() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getVenueById(venueId);
        if (!cancelled) setVenue(data);
      } catch {
        // Silently handle fetch errors
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [venueId]);

  const sheetMinHeight = SCREEN_HEIGHT * SHEET_DETENT;

  if (isLoading) {
    return (
      <View style={[styles.centered, { minHeight: sheetMinHeight }]}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={[styles.centered, { minHeight: sheetMinHeight }]}>
        <Ionicons name="location-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.errorText}>{t('clubs.noClubsNearby')}</Text>
      </View>
    );
  }

  const bgSource = venue.imageUrl
    ? { uri: venue.imageUrl }
    : PARTY_BACKGROUNDS[hashPartyId(venue.id) % PARTY_BACKGROUNDS.length];

  const fullAddress = [
    venue.addressStreet,
    venue.addressHousenumber,
    venue.addressPostcode,
    venue.addressCity,
  ].filter(Boolean).join(', ');

  const amenityLabel = venue.amenity === 'nightclub' ? 'Nightclub' : 'Pub';

  const hasSocials = venue.contactInstagram || venue.contactFacebook || venue.contactTwitter || venue.contactTiktok;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.base }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Hero image */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.heroContainer}>
        <Image source={bgSource} style={styles.heroImage} contentFit="cover" />
        <LinearGradient
          colors={['transparent', Colors.background.primary]}
          locations={[0.4, 1]}
          style={styles.heroGradient}
        />
        <View style={styles.heroInfo}>
          <View style={styles.amenityBadge}>
            <Text style={styles.amenityBadgeText}>{amenityLabel}</Text>
          </View>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{venue.name}</Text>
            {venue.isVerified && <VerifiedBadge size={20} />}
          </View>
          {venue.addressCity ? (
            <Text style={styles.heroCity}>{venue.addressCity}</Text>
          ) : null}
        </View>
      </Animated.View>

      {/* Stats (profile-style: emoji + number + label with dividers) */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.statsCard}>
        <View style={styles.statsRow}>
          {VENUE_STAT_ITEMS.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <View style={styles.statValueRow}>
                  <Image source={item.emoji} style={styles.statEmoji} contentFit="contain" />
                  <Text style={styles.statValue}>{venue[item.key] ?? 0}</Text>
                </View>
                <Text style={styles.statLabel}>{t(item.labelKey)}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </Animated.View>

      {/* Information */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.infoSection}>
        {fullAddress ? (
          <InfoRow
            icon="location-outline"
            label={t('clubDetail.address')}
            value={fullAddress}
          />
        ) : null}

        {venue.openingHours ? (
          <InfoRow
            icon="time-outline"
            label={t('clubDetail.openingHours')}
            value={venue.openingHours}
          />
        ) : null}

        {venue.phone ? (
          <InfoRow
            icon="call-outline"
            label={t('clubDetail.contact')}
            value={venue.phone}
            onPress={() => Linking.openURL(`tel:${venue.phone}`)}
          />
        ) : null}

        {venue.website ? (
          <InfoRow
            icon="globe-outline"
            label="Website"
            value={venue.website}
            onPress={() => Linking.openURL(venue.website!)}
          />
        ) : null}

        {venue.email ? (
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={venue.email}
            onPress={() => Linking.openURL(`mailto:${venue.email}`)}
          />
        ) : null}
      </Animated.View>

      {/* Social links */}
      {hasSocials ? (
        <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.socialRow}>
          {venue.contactInstagram ? (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); Linking.openURL(venue.contactInstagram!); }}
              style={styles.socialButton}
            >
              <Ionicons name="logo-instagram" size={22} color="#E4405F" />
            </Pressable>
          ) : null}
          {venue.contactFacebook ? (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); Linking.openURL(venue.contactFacebook!); }}
              style={styles.socialButton}
            >
              <Ionicons name="logo-facebook" size={22} color="#1877F2" />
            </Pressable>
          ) : null}
          {venue.contactTwitter ? (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); Linking.openURL(venue.contactTwitter!); }}
              style={styles.socialButton}
            >
              <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
            </Pressable>
          ) : null}
          {venue.contactTiktok ? (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); Linking.openURL(venue.contactTiktok!); }}
              style={styles.socialButton}
            >
              <Ionicons name="musical-notes" size={22} color="#fff" />
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </ScrollView>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: Typography.size.base,
    color: Colors.text.tertiary,
    fontFamily: ROUNDED,
  },

  // Hero
  heroContainer: {
    height: 160,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroInfo: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  amenityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    backgroundColor: 'rgba(191,255,0,0.15)',
    marginBottom: Spacing.xs,
  },
  amenityBadgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.primary.main,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  heroCity: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary.main,
    fontFamily: ROUNDED,
    marginTop: 2,
  },

  // Stats (profile-style)
  statsCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    paddingVertical: Spacing.base,
    marginTop: Spacing.md,
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

  // Info section
  infoSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.base,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  infoRowContent: {
    flex: 1,
  },
  infoRowLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoRowValue: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    fontFamily: ROUNDED,
    lineHeight: 20,
  },
  infoRowValueLink: {
    color: Colors.primary.main,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
