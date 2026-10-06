/**
 * PARTYUP Verified Badge
 * ======================
 * Displays the verified.png asset next to user/venue names.
 * Renders nothing when isVerified is false for clean conditional usage.
 */

import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, StyleSheet, ViewStyle } from 'react-native';

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

const VERIFIED_ASSET = require('@/assets/emojis/verified.png');

export function VerifiedBadge({ size = 16, style }: VerifiedBadgeProps) {
  return (
    <Image
      source={VERIFIED_ASSET}
      style={[{ width: size, height: size }, style as ImageStyle]}
      contentFit="contain"
    />
  );
}

export default VerifiedBadge;
