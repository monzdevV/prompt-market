/**
 * PARTYUP Location Service
 * ========================
 * Location permission management and coordinate retrieval
 * powered by expo-location.
 */

import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

// ============================================
// TYPES
// ============================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

// ============================================
// PERMISSIONS
// ============================================

/**
 * Returns the current foreground location permission status.
 */
export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/**
 * Requests foreground location permission from the user.
 * Returns the resulting permission status.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/**
 * Checks whether foreground location permission is currently granted.
 */
export async function hasLocationPermission(): Promise<boolean> {
  const status = await getLocationPermissionStatus();
  return status === 'granted';
}

// ============================================
// LOCATION
// ============================================

/**
 * Returns the device's current coordinates.
 * Uses balanced accuracy for quick results without excessive battery drain.
 * Throws if location services are disabled or permission is not granted.
 */
export async function getCurrentLocation(): Promise<Coordinates> {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

// ============================================
// SETTINGS
// ============================================

/**
 * Opens the device's location settings so the user can enable location services.
 */
export function openLocationSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}
