/**
 * PARTYUP Game Store
 * ======================
 * Global state for the game system.
 * Manages players, active games, and usage tracking.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useIsPremium } from './index';

const PLAYERS_STORAGE_KEY = '@previasplus_players';

// ============================================
// AVAILABLE STICKERS
// ============================================

export const PLAYER_STICKERS = [
  require('@/assets/emojis/beer.png'),
  require('@/assets/emojis/beers.png'),
  require('@/assets/emojis/champagne.png'),
  require('@/assets/emojis/cocktail.png'),
  require('@/assets/emojis/crown.png'),
  require('@/assets/emojis/fire.png'),
  require('@/assets/emojis/mirror_ball.png'),
  require('@/assets/emojis/partying_face.png'),
  require('@/assets/emojis/tada.png'),
  require('@/assets/emojis/tropical_drink.png'),
  require('@/assets/emojis/wine_glass.png'),
  require('@/assets/emojis/game_dice.png'),
  require('@/assets/emojis/space_invader.png'),
  require('@/assets/emojis/joystick.png'),
];

// ============================================
// TYPES
// ============================================

export interface GamePlayer {
  id: string;
  name: string;
  sticker: any; // Sticker image
  stickerIndex: number;
  score: number;
  drinks: number;
}

export type GameType = 
  | 'impostor' 
  | 'truth-or-dare' 
  | 'la-oca' 
  | 'never-have-i-ever';

export interface ActiveGame {
  type: GameType;
  players: GamePlayer[];
  currentRound: number;
  currentPlayerIndex: number;
  gameData: any; // Game-specific data
  startedAt: Date;
}

// Impostor game specific
export interface ImpostorGameData {
  secretWord: string;
  impostorId: string;
  category: string;
  revealedPlayers: string[];
  votes: Record<string, string>; // playerId -> votedPlayerId
}

// Truth or Dare specific
export interface TruthOrDareGameData {
  currentChallenge: TruthOrDareCard | null;
  usedCardIds: string[];
  skippedCards: number;
}

export interface TruthOrDareCard {
  id: string;
  type: 'truth' | 'dare';
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  drinkPenalty: number;
  isPremium: boolean;
  category?: string;
}

// La Oca specific
export interface LaOcaGameData {
  playerPositions: Record<string, number>; // playerId -> position
  currentDiceValue: number;
  boardSize: number;
  boardType: 'basic' | 'premium';
  lastAction: string | null;
}

export interface LaOcaSquare {
  position: number;
  type: 'normal' | 'special';
  category: 'never-have-i-ever' | 'would-you-rather' | 'dare' | 'truth-or-dare' | 'drink' | 'move' | 'skip';
  color: string;
  action?: {
    type: 'move-forward' | 'move-back' | 'drink' | 'skip-turn' | 'question';
    value?: number;
    question?: string;
  };
}

// Never Have I Ever specific
export interface NeverHaveIEverGameData {
  currentQuestion: NeverHaveIEverCard | null;
  usedCardIds: string[];
  questionsAsked: number;
}

export interface NeverHaveIEverCard {
  id: string;
  content: string;
  intensity: 1 | 2 | 3;
  category: string;
  isPremium: boolean;
}

// ============================================
// FREE VS PREMIUM LIMITS
// ============================================

// Keys used in the usage state (camelCase)
type UsageKey = 'impostor' | 'truthOrDare' | 'laOca' | 'neverHaveIEver';

// Mapping from GameType to UsageKey
const gameTypeToUsageKey: Record<GameType, UsageKey> = {
  'impostor': 'impostor',
  'truth-or-dare': 'truthOrDare',
  'la-oca': 'laOca',
  'never-have-i-ever': 'neverHaveIEver',
};

export const FREE_LIMITS = {
  impostor: {
    wordsPerCategory: 10,
    categories: 2,
  },
  truthOrDare: {
    truths: 20,
    dares: 20,
    packs: 1,
  },
  laOca: {
    boardType: 'basic' as const,
    questionsPerCategory: 15,
  },
  neverHaveIEver: {
    questions: 30,
    packs: 1,
  },
};

export const PREMIUM_LIMITS = {
  impostor: {
    wordsPerCategory: 100,
    categories: 10,
  },
  truthOrDare: {
    truths: 200,
    dares: 200,
    packs: 5,
  },
  laOca: {
    boardType: 'premium' as const,
    questionsPerCategory: 100,
  },
  neverHaveIEver: {
    questions: 300,
    packs: 5,
  },
};

// ============================================
// STATE TYPE
// ============================================

export interface GameState {
  // Global players
  players: GamePlayer[];
  
  // Premium status (synced from app store)
  isPremium: boolean;
  
  // Active game
  activeGame: ActiveGame | null;
  
  // Usage tracking (for free-tier limits)
  usage: {
    impostor: { wordsUsed: string[] };
    truthOrDare: { cardsUsed: string[] };
    laOca: { questionsUsed: string[] };
    neverHaveIEver: { questionsUsed: string[] };
  };
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: GameState = {
  players: [],
  isPremium: false,
  activeGame: null,
  usage: {
    impostor: { wordsUsed: [] },
    truthOrDare: { cardsUsed: [] },
    laOca: { questionsUsed: [] },
    neverHaveIEver: { questionsUsed: [] },
  },
};

// ============================================
// ACTIONS
// ============================================

export type GameAction =
  // Players
  | { type: 'ADD_PLAYER'; payload: { name: string } }
  | { type: 'REMOVE_PLAYER'; payload: { id: string } }
  | { type: 'UPDATE_PLAYER'; payload: { id: string; data: Partial<GamePlayer> } }
  | { type: 'CLEAR_PLAYERS' }
  | { type: 'SET_PLAYERS'; payload: GamePlayer[] }
  
  // Active Game
  | { type: 'START_GAME'; payload: { gameType: GameType; gameData: any } }
  | { type: 'UPDATE_GAME_DATA'; payload: any }
  | { type: 'NEXT_PLAYER' }
  | { type: 'NEXT_ROUND' }
  | { type: 'END_GAME' }
  
  // Usage tracking
  | { type: 'TRACK_USAGE'; payload: { gameType: GameType; itemId: string } }
  | { type: 'RESET_USAGE'; payload: { gameType: GameType } }
  // Premium sync
  | { type: 'SET_PREMIUM'; payload: boolean }
  // Full reset (logout / account deletion)
  | { type: 'RESET' };

// ============================================
// HELPERS
// ============================================

const generatePlayerId = () => `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getRandomSticker = (usedIndices: number[]) => {
  const availableIndices = PLAYER_STICKERS.map((_, i) => i).filter(i => !usedIndices.includes(i));
  if (availableIndices.length === 0) {
    // All stickers in use — pick a random one
    const randomIndex = Math.floor(Math.random() * PLAYER_STICKERS.length);
    return { sticker: PLAYER_STICKERS[randomIndex], index: randomIndex };
  }
  const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  return { sticker: PLAYER_STICKERS[randomIndex], index: randomIndex };
};

// ============================================
// REDUCER
// ============================================

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // Players
    case 'ADD_PLAYER': {
      const usedIndices = state.players.map(p => p.stickerIndex);
      const { sticker, index } = getRandomSticker(usedIndices);
      const newPlayer: GamePlayer = {
        id: generatePlayerId(),
        name: action.payload.name,
        sticker,
        stickerIndex: index,
        score: 0,
        drinks: 0,
      };
      return { ...state, players: [...state.players, newPlayer] };
    }
    
    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.payload.id),
      };
    
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.data } : p
        ),
      };
    
    case 'CLEAR_PLAYERS':
      return { ...state, players: [] };
    
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    
    // Active Game
    case 'START_GAME':
      return {
        ...state,
        activeGame: {
          type: action.payload.gameType,
          players: [...state.players],
          currentRound: 1,
          currentPlayerIndex: 0,
          gameData: action.payload.gameData,
          startedAt: new Date(),
        },
      };
    
    case 'UPDATE_GAME_DATA':
      if (!state.activeGame) return state;
      return {
        ...state,
        activeGame: {
          ...state.activeGame,
          gameData: { ...state.activeGame.gameData, ...action.payload },
        },
      };
    
    case 'NEXT_PLAYER':
      if (!state.activeGame) return state;
      const nextIndex = (state.activeGame.currentPlayerIndex + 1) % state.activeGame.players.length;
      return {
        ...state,
        activeGame: {
          ...state.activeGame,
          currentPlayerIndex: nextIndex,
        },
      };
    
    case 'NEXT_ROUND':
      if (!state.activeGame) return state;
      return {
        ...state,
        activeGame: {
          ...state.activeGame,
          currentRound: state.activeGame.currentRound + 1,
          currentPlayerIndex: 0,
        },
      };
    
    case 'END_GAME':
      return { ...state, activeGame: null };
    
    // Usage tracking
    case 'TRACK_USAGE': {
      const { gameType, itemId } = action.payload;
      const usageKey = gameTypeToUsageKey[gameType];
      const currentUsage = state.usage[usageKey];
      const key = Object.keys(currentUsage)[0] as string;
      return {
        ...state,
        usage: {
          ...state.usage,
          [usageKey]: {
            ...currentUsage,
            [key]: [...(currentUsage as any)[key], itemId],
          },
        },
      };
    }
    
    case 'RESET_USAGE': {
      const usageKey = gameTypeToUsageKey[action.payload.gameType];
      return {
        ...state,
        usage: {
          ...state.usage,
          [usageKey]: initialState.usage[usageKey],
        },
      };
    }

    case 'SET_PREMIUM':
      return { ...state, isPremium: action.payload };

    case 'RESET':
      return { ...initialState };
    
    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  
  // Helpers
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  startGame: (gameType: GameType, gameData: any) => void;
  endGame: () => void;
  showPremiumUpsell: (message: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const appIsPremium = useIsPremium();
  // True once persisted players have been read, so the initial empty state
  // never overwrites the saved list before it is loaded.
  const playersHydrated = useRef(false);

  // Sync premium status from app store
  useEffect(() => {
    dispatch({ type: 'SET_PREMIUM', payload: appIsPremium });
  }, [appIsPremium]);
  
  // Load persisted players on mount
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const savedPlayers = await AsyncStorage.getItem(PLAYERS_STORAGE_KEY);
        if (savedPlayers) {
          const players = JSON.parse(savedPlayers);
          // Restore sticker images from persisted indices
          const restoredPlayers = players.map((p: any) => ({
            ...p,
            sticker: PLAYER_STICKERS[p.stickerIndex] || PLAYER_STICKERS[0],
          }));
          dispatch({ type: 'SET_PLAYERS', payload: restoredPlayers });
        }
      } catch (error) {
        console.log('Error loading players:', error);
      } finally {
        playersHydrated.current = true;
      }
    };
    loadPlayers();
  }, []);
  
  // Persist players when they change
  useEffect(() => {
    const savePlayers = async () => {
      try {
        // Only persist serializable data (exclude sticker require() references)
        const playersToSave = state.players.map(p => ({
          id: p.id,
          name: p.name,
          stickerIndex: p.stickerIndex,
          score: p.score,
          drinks: p.drinks,
        }));
        await AsyncStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(playersToSave));
      } catch (error) {
        console.log('Error saving players:', error);
      }
    };
    // Persist the empty list too (e.g. after removing the last player),
    // otherwise the deleted players come back on the next launch.
    if (playersHydrated.current) {
      savePlayers();
    }
  }, [state.players]);
  
  const addPlayer = useCallback((name: string) => {
    dispatch({ type: 'ADD_PLAYER', payload: { name } });
  }, []);
  
  const removePlayer = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: { id } });
  }, []);
  
  const startGame = useCallback((gameType: GameType, gameData: any) => {
    dispatch({ type: 'START_GAME', payload: { gameType, gameData } });
  }, []);
  
  const endGame = useCallback(() => {
    dispatch({ type: 'END_GAME' });
  }, []);

  const showPremiumUpsell = useCallback((_message: string) => {
    router.push('/paywall-sheet');
  }, []);
  
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    addPlayer,
    removePlayer,
    startGame,
    endGame,
    showPremiumUpsell,
  }), [state, addPlayer, removePlayer, startGame, endGame, showPremiumUpsell]);
  
  return React.createElement(GameContext.Provider, { value: contextValue }, children);
}

// ============================================
// HOOKS
// ============================================

export function useGameStore() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameStore must be used within a GameProvider');
  }
  return context;
}

export function usePlayers() {
  const { state } = useGameStore();
  return state.players;
}

export function useActiveGame() {
  const { state } = useGameStore();
  return state.activeGame;
}
