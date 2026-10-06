/**
 * Legal & support links
 * =====================
 * Read from app.json -> expo.extra.legal so each install sets its own values
 * without touching code:
 *
 *   "extra": {
 *     "legal": {
 *       "privacyPolicyUrl": "https://example.com/privacy",
 *       "termsOfServiceUrl": "https://example.com/terms",
 *       "supportEmail": "support@example.com"
 *     }
 *   }
 *
 * Values that are not a valid http(s) URL / email (e.g. the template
 * placeholders "TU_URL_DE_PRIVACIDAD") count as "not configured": the
 * support row is hidden and privacy/terms show a notice instead of opening.
 */

import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import i18n from '@/src/i18n';

interface LegalConfig {
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  supportEmail?: string;
}

const raw = (Constants.expoConfig?.extra?.legal ?? {}) as LegalConfig;

const isHttpUrl = (value?: string): value is string =>
  !!value && /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(value.trim());

const isEmail = (value?: string): value is string =>
  !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const LEGAL_LINKS = {
  privacyPolicyUrl: isHttpUrl(raw.privacyPolicyUrl) ? raw.privacyPolicyUrl.trim() : null,
  termsOfServiceUrl: isHttpUrl(raw.termsOfServiceUrl) ? raw.termsOfServiceUrl.trim() : null,
  supportEmail: isEmail(raw.supportEmail) ? raw.supportEmail.trim() : null,
} as const;

export type LegalLink = 'privacy' | 'terms' | 'support';

function urlFor(link: LegalLink): string | null {
  switch (link) {
    case 'privacy':
      return LEGAL_LINKS.privacyPolicyUrl;
    case 'terms':
      return LEGAL_LINKS.termsOfServiceUrl;
    case 'support':
      return LEGAL_LINKS.supportEmail ? `mailto:${LEGAL_LINKS.supportEmail}` : null;
  }
}

/** True when the link has a real value in app.json. */
export function isLegalLinkConfigured(link: LegalLink): boolean {
  return urlFor(link) !== null;
}

/** Opens the privacy policy, terms or support email configured in app.json. */
export async function openLegalLink(link: LegalLink): Promise<void> {
  const url = urlFor(link);
  if (!url) {
    if (__DEV__) {
      console.warn(`[legal] "${link}" is not configured in app.json -> expo.extra.legal`);
    }
    Alert.alert(i18n.t('legal.notAvailableTitle'), i18n.t('legal.notAvailableMessage'));
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(i18n.t('common.error'), i18n.t('legal.openFailed'));
  }
}
