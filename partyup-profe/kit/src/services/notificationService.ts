/**
 * PARTYUP Notification Service
 * =============================
 * Push notification management using expo-notifications.
 * Handles token registration, permission requests, and notification handlers.
 */

import { supabase } from '@/src/config/supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Configures notification behavior for the app.
 * Call once at app startup before any notification interactions.
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * EAS project ID used to request the Expo push token.
 * Read from app.json (`extra.eas.projectId`, written by `eas init`) or, in EAS
 * builds, from the embedded EAS config. Never hardcode it here.
 */
function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

// ============================================
// PERMISSIONS & TOKEN REGISTRATION
// ============================================

/**
 * Requests notification permissions and registers the push token with Supabase.
 * Returns the Expo push token string, or null if permissions were denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications require a physical device
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    console.warn('[Notifications] Missing EAS projectId (run `eas init`); push token not registered');
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenData.data;

  // Store token in Supabase
  await savePushToken(expoPushToken);

  return expoPushToken;
}

/**
 * Saves the push token to the database.
 * Uses upsert to handle device re-registration gracefully.
 */
async function savePushToken(expoPushToken: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: user.id,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' },
    );

  if (error) {
    console.warn('[Notifications] Failed to save push token:', error.message);
  }
}

/**
 * Removes all push tokens for the current user.
 * Call on logout to stop receiving notifications.
 */
export async function removePushTokens(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.warn('[Notifications] Failed to remove push tokens:', error.message);
  }
}

// ============================================
// NOTIFICATION LISTENERS
// ============================================

/**
 * Adds a listener for notifications received while the app is in the foreground.
 * Returns a cleanup function.
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}

/**
 * Adds a listener for when the user taps on a notification.
 * Returns a cleanup function.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}

// ============================================
// PERMISSION CHECK
// ============================================

/**
 * Returns the current notification permission status.
 * Useful to distinguish between 'undetermined', 'denied', and 'granted'.
 */
export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Checks if push notification permissions are currently granted.
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const status = await getNotificationPermissionStatus();
  return status === 'granted';
}
