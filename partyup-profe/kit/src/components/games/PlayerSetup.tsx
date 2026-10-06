/**
 * PARTYUP Player Setup Screen
 * ================================
 * Pantalla para añadir jugadores antes de empezar un juego
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/src/constants/theme';
import { GamePlayer, useGameStore } from '@/src/store/gameStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    ArrowRightIcon,
    ChevronLeftIcon,
    PlusIcon,
    UserGroupIcon,
    XMarkIcon,
} from 'react-native-heroicons/solid';
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout,
    SlideInRight,
    SlideOutLeft,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const ROUNDED: string = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface PlayerSetupProps {
  minPlayers?: number;
  maxPlayers?: number;
  gameName: string;
  gameColor: string;
  onBack: () => void;
  onContinue: () => void;
}

export function PlayerSetup({
  minPlayers = 2,
  maxPlayers = 12,
  gameName,
  gameColor,
  onBack,
  onContinue,
}: PlayerSetupProps) {
  const { state, addPlayer, removePlayer } = useGameStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  
  const buttonScale = useSharedValue(1);
  
  const players = state.players;
  const canContinue = players.length >= minPlayers;
  const canAddMore = players.length < maxPlayers;
  
  const handleAddPlayer = () => {
    if (!inputValue.trim() || !canAddMore) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addPlayer(inputValue.trim());
    setInputValue('');
    inputRef.current?.focus();
  };
  
  const handleRemovePlayer = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removePlayer(id);
  };
  
  const handleContinue = () => {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue();
  };
  
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  const renderPlayer = ({ item, index }: { item: GamePlayer; index: number }) => (
    <Animated.View
      entering={SlideInRight.delay(index * 50).springify()}
      exiting={SlideOutLeft.springify()}
      layout={Layout.springify()}
      style={styles.playerCard}
    >
      <View style={styles.playerInfo}>
        <Image
          source={item.sticker}
          style={styles.playerSticker}
          contentFit="contain"
        />
        <Text style={styles.playerName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      
      <Pressable
        onPress={() => handleRemovePlayer(item.id)}
        style={styles.removeButton}
        hitSlop={8}
      >
        <XMarkIcon size={16} color={Colors.text.muted} />
      </Pressable>
    </Animated.View>
  );
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeftIcon size={24} color={Colors.text.primary} />
          </Pressable>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{gameName}</Text>
            <Text style={styles.headerSubtitle}>Add players</Text>
          </View>
          
          <View style={styles.headerRight}>
            <View style={[styles.playerCountBadge, { backgroundColor: gameColor }]}>
              <UserGroupIcon size={14} color="#000" />
              <Text style={styles.playerCountText}>{players.length}</Text>
            </View>
          </View>
        </View>
        
        {/* Content */}
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          {/* Input */}
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={styles.inputContainer}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleAddPlayer}
                placeholder="Player name"
                placeholderTextColor={Colors.text.muted}
                style={styles.input}
                maxLength={20}
                returnKeyType="done"
                autoCapitalize="words"
                autoCorrect={false}
              />
              
              <Pressable
                onPress={handleAddPlayer}
                disabled={!inputValue.trim() || !canAddMore}
                style={[
                  styles.addButton,
                  { backgroundColor: gameColor },
                  (!inputValue.trim() || !canAddMore) && styles.addButtonDisabled,
                ]}
              >
                <PlusIcon size={20} color="#000" />
              </Pressable>
            </View>
            
            {!canAddMore && (
              <Text style={styles.limitText}>
                Maximum players reached ({maxPlayers})
              </Text>
            )}
          </Animated.View>
          
          {/* Player list */}
          <FlatList
            data={players}
            renderItem={renderPlayer}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.playerList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Animated.View
                entering={FadeInUp.delay(200)}
                style={styles.emptyState}
              >
                <UserGroupIcon size={48} color={Colors.text.muted} />
                <Text style={styles.emptyTitle}>No players</Text>
                <Text style={styles.emptySubtitle}>
                  Add at least {minPlayers} players to continue
                </Text>
              </Animated.View>
            }
          />
          
          {/* Continue button */}
          <View style={styles.footer}>
            <AnimatedPressable
              onPress={handleContinue}
              disabled={!canContinue}
              onPressIn={() => {
                buttonScale.value = withSpring(0.96);
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1);
              }}
              style={[
                styles.continueButton,
                animatedButtonStyle,
                !canContinue && styles.continueButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={canContinue ? [gameColor, gameColor] : ['#333', '#222']}
                style={styles.continueGradient}
              >
                <Text style={[
                  styles.continueText,
                  !canContinue && styles.continueTextDisabled,
                ]}>
                  Continue
                </Text>
                <ArrowRightIcon 
                  size={20} 
                  color={canContinue ? '#000' : Colors.text.muted}
                />
              </LinearGradient>
            </AnimatedPressable>
            
            {!canContinue && (
              <Text style={styles.minPlayersText}>
                You need at least {minPlayers} players
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(120,120,128,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: '700',
    fontFamily: ROUNDED,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  playerCountText: {
    fontSize: Typography.size.sm,
    fontWeight: '700',
    fontFamily: ROUNDED,
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120,120,128,0.18)',
    paddingLeft: Spacing.base,
    paddingRight: 6,
    paddingVertical: 6,
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  input: {
    flex: 1,
    fontSize: Typography.size.base,
    fontFamily: ROUNDED,
    color: Colors.text.primary,
    paddingVertical: Spacing.md,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  addButtonDisabled: {
    backgroundColor: Colors.surface.secondary,
    opacity: 0.5,
  },
  limitText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontFamily: ROUNDED,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  playerList: {
    paddingBottom: Spacing.xl,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(120,120,128,0.18)',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerSticker: {
    width: 36,
    height: 36,
    marginRight: Spacing.md,
  },
  playerName: {
    fontSize: Typography.size.base,
    fontWeight: '600',
    fontFamily: ROUNDED,
    color: Colors.text.primary,
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontWeight: '600',
    fontFamily: ROUNDED,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.muted,
    fontFamily: ROUNDED,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  footer: {
    paddingVertical: Spacing.lg,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'continuous' as any } }),
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  continueText: {
    fontSize: Typography.size.base,
    fontWeight: '700',
    fontFamily: ROUNDED,
    color: '#000',
  },
  continueTextDisabled: {
    color: Colors.text.muted,
  },
  minPlayersText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontFamily: ROUNDED,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default PlayerSetup;
