/**
 * Animated Skia glow background for the party hero section
 */

import {
  Blur,
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BG_SIZE = SCREEN_WIDTH + 80;

export function PartyGlowBackground() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const CX = BG_SIZE / 2;
  const CY = BG_SIZE / 2;

  const g1X = useDerivedValue(() => CX - 40 + Math.sin(progress.value * Math.PI * 2) * 50);
  const g1Y = useDerivedValue(() => CY - 50 + Math.cos(progress.value * Math.PI * 2) * 40);
  const g2X = useDerivedValue(() => CX + 60 + Math.cos(progress.value * Math.PI * 2 + 1.2) * 45);
  const g2Y = useDerivedValue(() => CY - 10 + Math.sin(progress.value * Math.PI * 2 + 0.8) * 35);
  const g3X = useDerivedValue(() => CX + Math.sin(progress.value * Math.PI * 2 + 2.5) * 40);
  const g3Y = useDerivedValue(() => CY + 50 + Math.cos(progress.value * Math.PI * 2 + 1.8) * 35);
  const g4X = useDerivedValue(() => CX - 60 + Math.cos(progress.value * Math.PI * 2 + 3.2) * 35);
  const g4Y = useDerivedValue(() => CY + 20 + Math.sin(progress.value * Math.PI * 2 + 2.4) * 30);

  return (
    <Canvas style={{ width: BG_SIZE, height: BG_SIZE }}>
      <Group>
        <Blur blur={55} />
        <Circle cx={g1X} cy={g1Y} r={120}>
          <RadialGradient c={vec(0, 0)} r={120} colors={['rgb(137, 0, 241)', 'rgba(134, 36, 209, 0.4)']} positions={[0, 1]} />
        </Circle>
        <Circle cx={g2X} cy={g2Y} r={110}>
          <RadialGradient c={vec(0, 0)} r={110} colors={['rgb(159, 18, 58)', 'rgba(159,18,58,0.35)']} positions={[0, 1]} />
        </Circle>
        <Circle cx={g3X} cy={g3Y} r={100}>
          <RadialGradient c={vec(0, 0)} r={100} colors={['rgb(100, 43, 80)', 'rgba(134, 25, 96, 0.4)']} positions={[0, 1]} />
        </Circle>
        <Circle cx={g4X} cy={g4Y} r={90}>
          <RadialGradient c={vec(0, 0)} r={90} colors={['rgb(180, 98, 50)', 'rgba(180, 124, 50, 0.4)']} positions={[0, 1]} />
        </Circle>
      </Group>
    </Canvas>
  );
}

export const GLOW_BG_SIZE = BG_SIZE;
