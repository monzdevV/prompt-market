/**
 * PARTYUP Calendar Stack Layout
 * ==================================
 * Nested stack within the Calendar tab to support push navigation
 * (e.g. party detail) while keeping the tab bar visible.
 */

import { Stack } from 'expo-router';

export default function CalendarLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0B' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="party-detail" />
    </Stack>
  );
}
