/**
 * PARTYUP Brand Name Component
 * =============================
 * Renders "Party" in white and "Up" in the primary lime green.
 * Accepts a size prop for use in different contexts.
 */

import { Colors, Typography } from '@/src/constants/theme';
import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';

interface BrandNameProps {
  size?: number;
  style?: TextStyle;
}

export function BrandName({ size = Typography.size.lg, style }: BrandNameProps) {
  const fontStyle: TextStyle = {
    fontSize: size,
    fontWeight: Typography.weight.bold,
  };

  return (
    <Text style={[styles.container, fontStyle, style]}>
      <Text style={styles.party}>Party</Text>
      <Text style={styles.up}>Up</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    // Inherits fontWeight and fontSize from parent
  },
  party: {
    color: Colors.text.primary,
  },
  up: {
    color: Colors.primary.main,
  },
});
