/**
 * NoteAuthorRow
 * =============
 * Displays a small avatar and @username for note authors.
 * Reused in NotesSection, ChallengeResultsSection (NoteResults),
 * and PartyDetailScreen history notes.
 */

import { AvatarImage } from '@/src/components/ui/AvatarImage';
import { Colors } from '@/src/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const ROUNDED = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const AVATAR_SIZE = 20;

interface NoteAuthorRowProps {
  avatarUrl?: string;
  username?: string;
  displayName?: string;
  fallbackLabel?: string;
}

export function NoteAuthorRow({
  avatarUrl,
  username,
  displayName,
  fallbackLabel = '?',
}: NoteAuthorRowProps) {
  const label = username ?? displayName ?? fallbackLabel;
  const initial = label[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.row}>
      {avatarUrl ? (
        <AvatarImage
          uri={avatarUrl}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}
      <Text style={styles.label} numberOfLines={1}>
        by @{label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: ROUNDED,
  },
  label: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontFamily: ROUNDED,
  },
});
