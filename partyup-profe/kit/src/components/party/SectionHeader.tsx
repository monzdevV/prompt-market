/**
 * Reusable section header with emoji icon and optional accent text
 */

import { Colors, Spacing } from '@/src/constants/theme';
import { Image, ImageSource } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  accentTitle?: string;
  emojiSource: ImageSource;
  rightContent?: React.ReactNode;
}

export function SectionHeader({ title, accentTitle, emojiSource, rightContent }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <Image source={emojiSource} style={styles.emojiIcon} contentFit="contain" />
        <Text style={styles.title}>
          {title}
          {accentTitle ? <Text style={styles.accentTitle}>{` ${accentTitle}`}</Text> : null}
        </Text>
      </View>
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
    </View>
  );
}

const HEADER_HEIGHT = 36;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HEADER_HEIGHT,
    marginBottom: Spacing.md,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emojiIcon: {
    width: 34,
    height: 34,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  accentTitle: {
    color: Colors.primary.main,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
