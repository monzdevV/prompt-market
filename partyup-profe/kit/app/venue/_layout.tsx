/**
 * PARTYUP Venue Routes Layout
 * =============================
 * Stack navigation for venue challenge and offer flows.
 */

import { Stack } from 'expo-router';

export default function VenueLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
        contentStyle: { backgroundColor: '#0A0A0B' },
      }}
    >
      <Stack.Screen name="challenge-type" />
      <Stack.Screen name="challenge-question" />
      <Stack.Screen name="offer-type" />
      <Stack.Screen name="offer-details" />
    </Stack>
  );
}
