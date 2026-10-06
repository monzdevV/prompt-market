/**
 * Notes section displayed below Moments
 */

import { BorderRadius, Colors, Spacing } from '@/src/constants/theme';
import { PartyNote } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { NoteAuthorRow } from "./NoteAuthorRow";
import { SectionHeader } from "./SectionHeader";

// ============================================
// NOTE PROMPT BANNER
// ============================================

function NotePromptCard({ partyId }: { partyId: string }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );
    router.push({ pathname: "/note-sheet", params: { partyId } });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.promptContainer, animatedStyle]}>
      <Pressable onPress={handlePress} style={styles.promptPressable}>
        <LinearGradient
          colors={['#4F46E5', '#6366F1', '#818CF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.promptGradient}
        >
          {/* Background pattern */}
          <View style={styles.promptPattern} pointerEvents="none">
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.promptPatternIcon,
                  {
                    left: `${12 + i * 12}%`,
                    top: `${15 + (i % 3) * 25}%`,
                    opacity: 0.12 + (i % 3) * 0.04,
                    transform: [{ rotate: `${-15 + i * 10}deg` }, { scale: 0.6 + (i % 3) * 0.2 }],
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={18} color="#fff" />
              </View>
            ))}
          </View>
          {/* Sticker on the left */}
          <View style={styles.promptStickerContainer}>
            <Image
              source={require('@/assets/emojis/speech_balloon.png')}
              style={styles.promptSticker}
              contentFit="contain"
            />
          </View>
          {/* Text content */}
          <View style={styles.promptTextContainer}>
            <Text style={styles.promptTitle}>{t('notes.writeANote')}</Text>
            <Text style={styles.promptSubtitle}>{t('notes.shareYourThoughts')}</Text>
          </View>
          {/* Arrow */}
          <View style={styles.promptArrow}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// NOTES SECTION
// ============================================

interface NotesSectionProps {
  notes: PartyNote[];
  partyId: string;
  currentUserId?: string;
}

export function NotesSection({ notes, partyId, currentUserId }: NotesSectionProps) {
  const { t } = useTranslation();
  const handleNotePress = (note: PartyNote) => {
    router.push({
      pathname: "/note-editor",
      params: { partyId, noteId: note.id },
    });
  };

  const hasOwnNote = notes.some((n) => n.authorId === currentUserId);
  const showPrompt = !hasOwnNote;

  if (notes.length === 0) {
    return (
      <View style={styles.container}>
        <SectionHeader title={t('partyRoom.partyNotesTitle')} accentTitle={t('partyRoom.partyNotesAccent')} emojiSource={require('@/assets/emojis/tada.png')} />
        {showPrompt && <NotePromptCard partyId={partyId} />}
        {!showPrompt && (
          <View style={styles.emptyPlaceholder}>
            <Ionicons name="document-text-outline" size={32} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyPlaceholderText}>{t('notes.noNotesYet')}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionHeader title={t('partyRoom.partyNotesTitle')} accentTitle={t('partyRoom.partyNotesAccent')} emojiSource={require('@/assets/emojis/tada.png')} />
      {showPrompt && <NotePromptCard partyId={partyId} />}
      <View style={styles.noteList}>
        {notes.map((note) => {
          const isOwn = note.authorId === currentUserId;
          return (
            <Pressable
              key={note.id}
              onPress={() => handleNotePress(note)}
              style={({ pressed }) => [
                styles.noteCard,
                isOwn && styles.ownContentBorder,
                pressed && styles.noteCardPressed,
              ]}
            >
              <Text style={styles.noteText} numberOfLines={5}>
                {note.content}
              </Text>
              <NoteAuthorRow
                avatarUrl={note.authorAvatarUrl}
                username={note.authorUsername}
                displayName={note.authorName}
                fallbackLabel={t('common.anonymous')}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  // Note prompt banner
  promptContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  promptPressable: {
    flex: 1,
  },
  promptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
    position: 'relative',
    overflow: 'hidden',
  },
  promptStickerContainer: {
    marginRight: 14,
  },
  promptSticker: {
    width: 48,
    height: 48,
  },
  promptPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  promptPatternIcon: {
    position: 'absolute',
  },
  promptTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  promptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  promptSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  promptArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Own content border
  ownContentBorder: {
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },

  // Notes list
  noteList: {
    gap: 8,
  },
  noteCard: {
    backgroundColor: Colors.surface.primary,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  noteCardPressed: {
    opacity: 0.8,
  },
  noteText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  emptyPlaceholder: {
    height: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyPlaceholderText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "500",
  },
});
