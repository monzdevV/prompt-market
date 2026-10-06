/**
 * PARTYUP Party Routes Layout
 * ===============================
 * Stack navigation for party creation, joining, and room
 */

import { Stack } from 'expo-router';

export default function PartyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
        contentStyle: { backgroundColor: '#0A0A0B' },
      }}
    >
      <Stack.Screen
        name="create"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="join"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="challenge-type"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="challenge-question"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="challenge-reveal"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="[partyId]/index"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
