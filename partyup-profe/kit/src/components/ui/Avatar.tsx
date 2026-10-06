/**
 * PARTYUP Avatar Component
 * ============================
 * Componente de avatar con indicador de estado online
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Layout, BorderRadius } from '@/src/constants/theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'busy' | 'away';
  style?: ViewStyle;
  borderColor?: string;
  borderWidth?: number;
}

export function Avatar({
  source,
  name,
  size = 'md',
  showStatus = false,
  status = 'offline',
  style,
  borderColor,
  borderWidth = 0,
}: AvatarProps) {
  // Pulse animation for online indicator
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (showStatus && status === 'online') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [showStatus, status]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const avatarSize = Layout.avatarSize[size];
  const fontSize = avatarSize * 0.4;
  const statusSize = avatarSize * 0.25;
  const statusOffset = avatarSize * 0.05;

  const containerStyle: ViewStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    ...(borderWidth > 0 && {
      borderWidth,
      borderColor: borderColor || Colors.primary.main,
    }),
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, { borderRadius: avatarSize / 2 }]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              backgroundColor: getColorFromName(name),
              borderRadius: avatarSize / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {showStatus && (
        <Animated.View
          style={[
            styles.statusIndicator,
            pulseStyle,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: Colors.status[status],
              bottom: statusOffset,
              right: statusOffset,
            },
          ]}
        />
      )}
    </View>
  );
}

// Genera un color consistente basado en el nombre
function getColorFromName(name?: string): string {
  const colors = [
    Colors.primary.main,
    Colors.accent.purple,
    Colors.accent.pink,
    Colors.accent.cyan,
    Colors.accent.yellow,
    Colors.accent.green,
  ];

  if (!name) return colors[0];

  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
});

export default Avatar;
