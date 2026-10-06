/**
 * PARTYUP Party Challenge Type Selection
 * ========================================
 * Allows the host to pick a challenge type (image, note, or check).
 * Uses the shared ChallengeTypeSelector component.
 */

import { ChallengeTypeSelector } from '@/src/components/challenges';
import { ChallengeType } from '@/src/types';
import { router } from 'expo-router';
import React, { useRef } from 'react';

export default function PartyChallengeTypeScreen() {
  const isNavigatingRef = useRef(false);

  const handleSelectType = (type: ChallengeType) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push(`/party/challenge-question?type=${type}` as any);
    setTimeout(() => { isNavigatingRef.current = false; }, 1000);
  };

  return (
    <ChallengeTypeSelector
      onSelectType={handleSelectType}
      onClose={() => router.back()}
    />
  );
}
