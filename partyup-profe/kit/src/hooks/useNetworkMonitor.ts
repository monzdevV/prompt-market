/**
 * PARTYUP Network Monitor Hook
 * =============================
 * Subscribes to network state changes and keeps the global
 * store `isOnline` flag in sync with real connectivity.
 * Uses `isInternetReachable` (not just `isConnected`) to
 * detect scenarios like WiFi without actual internet access.
 */

import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useApp } from '@/src/store';

export function useNetworkMonitor(): { isOnline: boolean } {
  const { state, dispatch } = useApp();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const reachable = netState.isInternetReachable ?? netState.isConnected ?? false;
      dispatch({ type: 'SET_ONLINE', payload: reachable });
    });

    return unsubscribe;
  }, [dispatch]);

  return { isOnline: state.isOnline };
}
