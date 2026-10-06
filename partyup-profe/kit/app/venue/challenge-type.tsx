/**
 * PARTYUP Venue Challenge Type Selection
 * ========================================
 * Reuses the shared ChallengeTypeSelector for venue challenge broadcasts.
 * Navigates to the venue-specific question screen.
 */

import { ChallengeTypeSelector } from '@/src/components/challenges';
import { ChallengeType } from '@/src/types';
import { router } from 'expo-router';
import React, { useRef } from 'react';

export default function VenueChallengeTypeScreen() {
  const isNavigatingRef = useRef(false);

  const handleSelectType = (type: ChallengeType) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push(`/venue/challenge-question?type=${type}` as any);
    setTimeout(() => { isNavigatingRef.current = false; }, 1000);
  };

  return (
    <ChallengeTypeSelector
      onSelectType={handleSelectType}
      onClose={() => router.back()}
    />
  );
}
