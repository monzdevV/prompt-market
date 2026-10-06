/**
 * Instagram Sharing Service
 * =========================
 * Handles sharing photos & images to Instagram Stories.
 * Uses native share sheet via expo-sharing which allows picking Instagram.
 * Uses modern expo-file-system (File, Paths) for file operations.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Linking, Platform } from 'react-native';

// ─── Share local image to Instagram Stories ────────────────────
export async function shareToInstagramStories(imageUri: string): Promise<boolean> {
  try {
    // Try Instagram Stories deep link first (iOS)
    if (Platform.OS === 'ios') {
      const instagramUrl = 'instagram-stories://share?source_application=partyup';
      const canOpen = await Linking.canOpenURL(instagramUrl);
      if (canOpen) {
        // Read file as base64 for the deep link
        const file = new File(imageUri);
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        await Linking.openURL(
          `instagram-stories://share?source_application=partyup&backgroundImage=${encodeURIComponent(
            `data:image/jpeg;base64,${base64}`,
          )}`,
        );
        return true;
      }
    }

    // Fallback: native share sheet (works on both platforms, user picks Instagram)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Compartir en Instagram',
        UTI: 'public.jpeg',
      });
      return true;
    }

    Alert.alert(
      'Instagram no disponible',
      'Instala Instagram para compartir directamente.',
    );
    return false;
  } catch (err) {
    console.warn('Instagram share error:', err);
    // Fallback to native share sheet
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Compartir en Instagram',
          UTI: 'public.jpeg',
        });
        return true;
      }
    } catch {
      // ignore
    }
    Alert.alert('Error', 'No se pudo compartir la imagen.');
    return false;
  }
}

// ─── Download remote image and share ─────────────────────
export async function shareRemoteImageToInstagram(
  url: string,
  filename = 'party_share.jpg',
): Promise<boolean> {
  try {
    // Download image using fetch + modern File API
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    // Write to cache directory
    const cacheFile = new File(Paths.cache, filename);
    const uint8 = new Uint8Array(arrayBuffer);
    const writer = cacheFile.writableStream().getWriter();
    await writer.write(uint8);
    await writer.close();

    return shareToInstagramStories(cacheFile.uri);
  } catch (err) {
    console.warn('Download & share error:', err);
    Alert.alert('Error', 'No se pudo descargar la imagen para compartir.');
    return false;
  }
}

// ─── Share ViewShot capture to Instagram ─────────────────
export async function shareCapturedImageToInstagram(
  captureUri: string,
): Promise<boolean> {
  return shareToInstagramStories(captureUri);
}
