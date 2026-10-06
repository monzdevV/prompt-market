/**
 * ProBadge Component
 * ==================
 * Displays the "PRO" sticker badge used to indicate premium party content.
 * Renders the custom pro.png asset at a configurable size.
 */

import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, ViewStyle } from 'react-native';

const PRO_SOURCE = require('@/assets/emojis/pro.png');

interface ProBadgeProps {
  size?: number;
  style?: ViewStyle;
}

export function ProBadge({ size = 20, style }: ProBadgeProps) {
  return (
    <Image
      source={PRO_SOURCE}
      style={[{ width: size, height: size }, style as ImageStyle]}
      contentFit="contain"
    />
  );
}
