/**
 * PARTYUP Subscription Service
 * =================================
 * RevenueCat SDK wrapper for subscription management.
 * Single source of truth for Pro entitlement status.
 */

import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

// ============================================
// CONSTANTS
// ============================================

const ENTITLEMENT_ID = 'PartyUp Pro';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

// ============================================
// INITIALIZATION
// ============================================

let isConfigured = false;

/**
 * Configure RevenueCat SDK. Must be called once before any other method.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function configureSubscriptions(): void {
  if (isConfigured || !API_KEY) {
    if (!API_KEY) {
      console.warn('[Subscriptions] Missing EXPO_PUBLIC_REVENUECAT_API_KEY');
    }
    return;
  }

  Purchases.configure({ apiKey: API_KEY });

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  isConfigured = true;
  console.log('[Subscriptions] RevenueCat configured');
}

// ============================================
// USER IDENTITY
// ============================================

/**
 * Associate the current RevenueCat anonymous user with our Supabase user id.
 * Returns the latest CustomerInfo after login.
 */
export async function loginUser(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(userId);
  console.log('[Subscriptions] Logged in user:', userId);
  return customerInfo;
}

/**
 * Reset RevenueCat to an anonymous user (call on sign-out).
 */
export async function logoutUser(): Promise<void> {
  await Purchases.logOut();
  console.log('[Subscriptions] Logged out');
}

// ============================================
// ENTITLEMENT CHECK
// ============================================

/**
 * Returns true when the customer has an active "PartyUp Pro" entitlement.
 */
export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
}

/**
 * Fetch the latest customer info from RevenueCat and check Pro status.
 */
export async function checkProStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return hasProEntitlement(customerInfo);
  } catch (error) {
    console.warn('[Subscriptions] Failed to check pro status:', error);
    return false;
  }
}

// ============================================
// OFFERINGS & PURCHASES
// ============================================

/**
 * Fetch current offerings with real-time pricing from the stores.
 */
export async function getOfferings(): Promise<PurchasesOfferings> {
  return Purchases.getOfferings();
}

/**
 * Purchase a specific package (monthly or yearly).
 * Returns the updated CustomerInfo on success.
 * Throws on failure (caller should handle cancellation vs error).
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/**
 * Restore previous purchases (e.g. after reinstall or device change).
 * Returns the restored CustomerInfo.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  console.log('[Subscriptions] Purchases restored');
  return customerInfo;
}

// ============================================
// LISTENERS
// ============================================

/**
 * Subscribe to real-time changes in customer info (e.g. subscription renewal,
 * cancellation, billing issue). Returns an unsubscribe function.
 */
export function addCustomerInfoListener(
  callback: (info: CustomerInfo) => void,
): () => void {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}

// ============================================
// CUSTOMER CENTER
// ============================================

/**
 * Present the RevenueCat Customer Center for subscription management.
 */
export async function presentCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}
