/**
 * Full-screen note editor with native header.
 * Supports three modes:
 * 1. Party note (own): create/edit own party note
 * 2. Party note (other): read-only view of someone else's note
 * 3. Challenge response: submit a note as a challenge response
 */

import { Colors, Spacing } from '@/src/constants/theme';
import { submitNoteResponse } from '@/src/services/challengeService';
import { getMyNote, getNoteById, MAX_NOTE_LENGTH, saveNote } from '@/src/services/noteService';
import { useApp } from '@/src/store';
import { PartyNote } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';

export default function NoteEditorScreen() {
  const { t } = useTranslation();
  const { partyId, noteId, challengeId, readOnlyContent, readOnlyAuthor } = useLocalSearchParams<{
    partyId: string;
    noteId?: string;
    challengeId?: string;
    readOnlyContent?: string;
    readOnlyAuthor?: string;
  }>();
  const { state, dispatch } = useApp();
  const navigation = useNavigation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!challengeId && !readOnlyContent);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [existingNoteId, setExistingNoteId] = useState<string | null>(null);

  const isChallengeMode = !!challengeId;
  const isReadOnlyMode = !!readOnlyContent;

  // Read-only mode for challenge notes: set content directly
  useEffect(() => {
    if (!isReadOnlyMode) return;
    setContent(readOnlyContent);
  }, [isReadOnlyMode, readOnlyContent]);

  // Load note on mount (party note mode only)
  useEffect(() => {
    if (!partyId || isChallengeMode || isReadOnlyMode) return;
    (async () => {
      try {
        if (noteId) {
          const note = await getNoteById(noteId);
          if (note) {
            setContent(note.content);
            setExistingNoteId(note.id);
            setIsOwner(note.authorId === state.user?.id);
          }
        } else {
          setIsOwner(true);
          const note = await getMyNote(partyId);
          if (note) {
            setContent(note.content);
            setExistingNoteId(note.id);
          }
        }
      } catch {
        // First time writing or note not found
      } finally {
        setLoading(false);
      }
    })();
  }, [partyId, noteId, isChallengeMode, state.user?.id]);

  // Challenge mode: always owner, no loading
  useEffect(() => {
    if (isChallengeMode) {
      setIsOwner(true);
    }
  }, [isChallengeMode]);

  /**
   * Save handler for party note mode.
   * Optimistic: updates state and closes immediately, persists in background.
   */
  const handleSavePartyNote = useCallback(() => {
    if (!content.trim() || !partyId || !state.user) return;

    const trimmed = content.trim();
    const now = new Date().toISOString();
    const isUpdate = !!existingNoteId;

    const optimisticNote: PartyNote = {
      id: existingNoteId ?? Crypto.randomUUID(),
      partyId,
      authorId: state.user.id,
      authorName: state.user.displayName,
      authorUsername: state.user.username,
      content: trimmed,
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: isUpdate ? 'UPDATE_NOTE' : 'ADD_NOTE', payload: optimisticNote });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();

    saveNote(partyId, trimmed).catch(() => {
      dispatch({ type: 'REMOVE_NOTE', payload: optimisticNote.id });
      Alert.alert(
        'Note not saved',
        'Something went wrong while saving your note. Please try again.',
      );
    });
  }, [content, partyId, state.user, existingNoteId, dispatch]);

  /**
   * Save handler for challenge response mode.
   * Submits the note as a challenge response and dispatches to state.
   */
  const handleSaveChallengeNote = useCallback(async () => {
    if (!content.trim() || !challengeId) return;

    setSaving(true);
    try {
      const response = await submitNoteResponse(challengeId, content.trim());
      dispatch({ type: 'ADD_CHALLENGE_RESPONSE', payload: response });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('challenges.submissionFailed'));
    } finally {
      setSaving(false);
    }
  }, [content, challengeId, dispatch, t]);

  const handleSave = isChallengeMode ? handleSaveChallengeNote : handleSavePartyNote;

  const isOverLimit = content.length > MAX_NOTE_LENGTH;
  const canSave = !!content.trim() && !saving && !isOverLimit;

  // Configure native header buttons dynamically
  useLayoutEffect(() => {
    const headerTitle = isReadOnlyMode
      ? (readOnlyAuthor ? `@${readOnlyAuthor}` : t('noteEditor.headerTitle'))
      : isChallengeMode
        ? t('noteEditor.challengeHeaderTitle')
        : t('noteEditor.headerTitle');

    navigation.setOptions({
      headerTitle,
      headerLeft: () => (
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>
      ),
      headerRight: () =>
        isOwner ? (
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            hitSlop={8}
            style={[styles.headerButton, { opacity: canSave ? 1 : 0.4 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary.main} />
            ) : (
              <Ionicons name="checkmark" size={22} color={Colors.primary.main} />
            )}
          </Pressable>
        ) : null,
    });
  }, [navigation, isOwner, canSave, handleSave, saving, isChallengeMode, isReadOnlyMode, readOnlyAuthor, t]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <ScrollView style={styles.readOnlyContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.readOnlyText}>{content}</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.editorContainer}>
      <TextInput
        style={styles.textInput}
        value={content}
        onChangeText={setContent}
        placeholder={t('noteEditor.placeholder')}
        placeholderTextColor="rgba(255,255,255,0.3)"
        maxLength={MAX_NOTE_LENGTH}
        multiline
        autoFocus
        textAlignVertical="top"
        scrollEnabled
      />
      <Text style={[styles.charCounter, isOverLimit && styles.charCounterOver]}>
        {content.length}/{MAX_NOTE_LENGTH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#fff',
    lineHeight: 26,
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  charCounter: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'right',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  charCounterOver: {
    color: '#FF4444',
  },
  readOnlyContainer: {
    flex: 1,
    backgroundColor: '#0A0A0B',
    padding: Spacing.lg,
  },
  readOnlyText: {
    fontSize: 17,
    color: '#fff',
    lineHeight: 26,
  },
});
