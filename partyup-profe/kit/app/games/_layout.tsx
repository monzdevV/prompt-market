/**
 * Games Navigator Layout
 * ======================
 * Stack navigator for game screens.
 * GameProvider lives only in app/_layout.tsx (single instance), so the players
 * edited in the Games tab and the ones used inside a game stay in sync.
 */

import { Stack } from 'expo-router';

export default function GamesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        contentStyle: { backgroundColor: '#0A0A0B' },
      }}
    >
      <Stack.Screen name="impostor" />
      <Stack.Screen name="truth-or-dare" />
      <Stack.Screen name="la-oca" />
      <Stack.Screen name="never-have-i-ever" />
      <Stack.Screen name="most-likely-to" />
      <Stack.Screen name="would-you-rather" />
    </Stack>
  );
}
