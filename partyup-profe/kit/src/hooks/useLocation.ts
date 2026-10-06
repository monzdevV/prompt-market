/**
 * PARTYUP useLocation Hook
 * ========================
 * Manages location permission state and coordinates.
 * Caches the last known location for instant UI on revisit.
 */

import {
  Coordinates,
  LocationPermissionStatus,
  getCurrentLocation,
  getLocationPermissionStatus,
  openLocationSettings,
  requestLocationPermission,
} from '@/src/services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const LOCATION_CACHE_KEY = '@beparty/last-location';

interface UseLocationResult {
  location: Coordinates | null;
  permissionStatus: LocationPermissionStatus;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  openSettings: () => void;
  refresh: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const loadCachedLocation = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        setLocation(JSON.parse(cached));
      }
    } catch {
      // Silently ignore cache read errors
    }
  }, []);

  const cacheLocation = useCallback(async (coords: Coordinates) => {
    try {
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(coords));
    } catch {
      // Silently ignore cache write errors
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    try {
      const status = await getLocationPermissionStatus();
      if (!isMounted.current) return;
      setPermissionStatus(status);

      if (status === 'granted') {
        const coords = await getCurrentLocation();
        if (!isMounted.current) return;
        setLocation(coords);
        cacheLocation(coords);
      }
    } catch (err) {
      console.error('[Location] Failed to fetch location:', err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cacheLocation]);

  // Initial load: restore cache then fetch fresh location
  useEffect(() => {
    isMounted.current = true;

    (async () => {
      await loadCachedLocation();
      await fetchLocation();
    })();

    return () => {
      isMounted.current = false;
    };
  }, [loadCachedLocation, fetchLocation]);

  // Re-check permission and location when the app returns from background
  // (user may have toggled location in Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchLocation();
      }
    });
    return () => subscription.remove();
  }, [fetchLocation]);

  const requestPermission = useCallback(async () => {
    const status = await requestLocationPermission();
    if (!isMounted.current) return;
    setPermissionStatus(status);

    if (status === 'granted') {
      setIsLoading(true);
      await fetchLocation();
    }
  }, [fetchLocation]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    permissionStatus,
    isLoading,
    requestPermission,
    openSettings: openLocationSettings,
    refresh,
  };
}
