/**
 * PARTYUP Global State Management
 * ================================
 * Global state using React Context + useReducer
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User, Party, PartyMedia, PartyNote, PhotoReaction, ChallengePhotoReaction, GameSession, Notification, PartyChallenge, ChallengeResponse, OfferTicket } from '@/src/types';

// ============================================
// STATE TYPE
// ============================================

export interface AppState {
  // User
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Active party
  currentParty: Party | null;
  isInParty: boolean;
  partyPhotos: PartyMedia[];
  partyNotes: PartyNote[];
  photoReactions: PhotoReaction[];
  challengePhotoReactions: ChallengePhotoReaction[];
  partyChallenges: PartyChallenge[];
  challengeResponses: ChallengeResponse[];
  offerTickets: OfferTicket[];

  // Active game
  currentGame: GameSession | null;

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Onboarding
  needsUsername: boolean;

  // UI State
  ui: {
    isOnboarding: boolean;
    activeModal: string | null;
    toastMessage: string | null;
  };

  // Connectivity
  isOnline: boolean;
}

// ============================================
// INITIAL STATE
// ============================================

export const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,

  currentParty: null,
  isInParty: false,
  partyPhotos: [],
  partyNotes: [],
  photoReactions: [],
  challengePhotoReactions: [],
  partyChallenges: [],
  challengeResponses: [],
  offerTickets: [],

  currentGame: null,

  notifications: [],
  unreadCount: 0,

  needsUsername: false,

  ui: {
    isOnboarding: false,
    activeModal: null,
    toastMessage: null,
  },

  isOnline: true,
};

// ============================================
// ACTION TYPES
// ============================================

export type AppAction =
  // Auth
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_NEEDS_USERNAME'; payload: boolean }
  | { type: 'UPDATE_USERNAME'; payload: string }
  | { type: 'UPDATE_AVATAR'; payload: string }
  | { type: 'LOGOUT' }

  // Party
  | { type: 'SET_CURRENT_PARTY'; payload: Party | null }
  | { type: 'UPDATE_PARTY'; payload: Partial<Party> }
  | { type: 'LEAVE_PARTY' }
  | { type: 'UPDATE_PARTICIPANT'; payload: { userId: string; data: Partial<import('@/src/types').PartyParticipant> } }

  // Party Media
  | { type: 'SET_PHOTOS'; payload: PartyMedia[] }
  | { type: 'ADD_PHOTO'; payload: PartyMedia }
  | { type: 'REMOVE_PHOTO'; payload: string }

  // Photo Reactions
  | { type: 'SET_PHOTO_REACTIONS'; payload: PhotoReaction[] }
  | { type: 'UPSERT_PHOTO_REACTION'; payload: PhotoReaction }
  | { type: 'REMOVE_PHOTO_REACTION'; payload: { mediaId: string; userId: string } }

  // Challenge Photo Reactions
  | { type: 'SET_CHALLENGE_PHOTO_REACTIONS'; payload: ChallengePhotoReaction[] }
  | { type: 'UPSERT_CHALLENGE_PHOTO_REACTION'; payload: ChallengePhotoReaction }
  | { type: 'REMOVE_CHALLENGE_PHOTO_REACTION'; payload: { mediaId: string; userId: string } }

  // Party Notes
  | { type: 'SET_NOTES'; payload: PartyNote[] }
  | { type: 'ADD_NOTE'; payload: PartyNote }
  | { type: 'UPDATE_NOTE'; payload: PartyNote }
  | { type: 'REMOVE_NOTE'; payload: string }

  // Challenges
  | { type: 'SET_CHALLENGES'; payload: PartyChallenge[] }
  | { type: 'ADD_CHALLENGE'; payload: PartyChallenge }
  | { type: 'SET_CHALLENGE_RESPONSES'; payload: ChallengeResponse[] }
  | { type: 'ADD_CHALLENGE_RESPONSE'; payload: ChallengeResponse }

  // Offer Tickets
  | { type: 'SET_OFFER_TICKETS'; payload: OfferTicket[] }
  | { type: 'REDEEM_OFFER_TICKET'; payload: string }

  // Game
  | { type: 'SET_CURRENT_GAME'; payload: GameSession | null }
  | { type: 'UPDATE_GAME'; payload: Partial<GameSession> }
  | { type: 'END_GAME' }

  // Notifications
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }

  // Premium
  | { type: 'SET_PREMIUM_STATUS'; payload: boolean }

  // UI
  | { type: 'SHOW_MODAL'; payload: string }
  | { type: 'HIDE_MODAL' }
  | { type: 'SHOW_TOAST'; payload: string }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_ONBOARDING'; payload: boolean }

  // Connectivity
  | { type: 'SET_ONLINE'; payload: boolean };

// ============================================
// REDUCER
// ============================================

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Auth
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
      };

    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_NEEDS_USERNAME':
      return { ...state, needsUsername: action.payload };

    case 'UPDATE_USERNAME':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, username: action.payload },
        needsUsername: false,
      };

    case 'UPDATE_AVATAR':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, avatarUrl: action.payload },
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        isOnline: state.isOnline,
      };

    // Party
    case 'SET_CURRENT_PARTY':
      return {
        ...state,
        currentParty: action.payload,
        isInParty: action.payload !== null,
        partyPhotos: action.payload ? state.partyPhotos : [],
        partyNotes: action.payload ? state.partyNotes : [],
        photoReactions: action.payload ? state.photoReactions : [],
        challengePhotoReactions: action.payload ? state.challengePhotoReactions : [],
        partyChallenges: action.payload ? state.partyChallenges : [],
        challengeResponses: action.payload ? state.challengeResponses : [],
        offerTickets: action.payload ? state.offerTickets : [],
      };

    case 'UPDATE_PARTY':
      if (!state.currentParty) return state;
      return {
        ...state,
        currentParty: { ...state.currentParty, ...action.payload },
      };

    case 'LEAVE_PARTY':
      return {
        ...state,
        currentParty: null,
        isInParty: false,
        currentGame: null,
        partyPhotos: [],
        partyNotes: [],
        photoReactions: [],
        challengePhotoReactions: [],
        partyChallenges: [],
        challengeResponses: [],
        offerTickets: [],
      };

    case 'UPDATE_PARTICIPANT':
      if (!state.currentParty) return state;
      return {
        ...state,
        currentParty: {
          ...state.currentParty,
          participants: state.currentParty.participants.map(p =>
            p.userId === action.payload.userId
              ? { ...p, ...action.payload.data }
              : p
          ),
        },
      };

    // Party Media
    case 'SET_PHOTOS':
      return { ...state, partyPhotos: action.payload };

    case 'ADD_PHOTO':
      return {
        ...state,
        partyPhotos: [...state.partyPhotos, action.payload],
      };

    case 'REMOVE_PHOTO':
      return {
        ...state,
        partyPhotos: state.partyPhotos.filter(p => p.id !== action.payload),
      };

    // Photo Reactions
    case 'SET_PHOTO_REACTIONS':
      return { ...state, photoReactions: action.payload };

    case 'UPSERT_PHOTO_REACTION': {
      const existing = state.photoReactions.findIndex(
        r => r.mediaId === action.payload.mediaId && r.userId === action.payload.userId,
      );
      if (existing >= 0) {
        const updated = [...state.photoReactions];
        updated[existing] = action.payload;
        return { ...state, photoReactions: updated };
      }
      return { ...state, photoReactions: [...state.photoReactions, action.payload] };
    }

    case 'REMOVE_PHOTO_REACTION':
      return {
        ...state,
        photoReactions: state.photoReactions.filter(
          r => !(r.mediaId === action.payload.mediaId && r.userId === action.payload.userId),
        ),
      };

    // Challenge Photo Reactions
    case 'SET_CHALLENGE_PHOTO_REACTIONS':
      return { ...state, challengePhotoReactions: action.payload };

    case 'UPSERT_CHALLENGE_PHOTO_REACTION': {
      const idx = state.challengePhotoReactions.findIndex(
        r => r.mediaId === action.payload.mediaId && r.userId === action.payload.userId,
      );
      if (idx >= 0) {
        const updated = [...state.challengePhotoReactions];
        updated[idx] = action.payload;
        return { ...state, challengePhotoReactions: updated };
      }
      return { ...state, challengePhotoReactions: [...state.challengePhotoReactions, action.payload] };
    }

    case 'REMOVE_CHALLENGE_PHOTO_REACTION':
      return {
        ...state,
        challengePhotoReactions: state.challengePhotoReactions.filter(
          r => !(r.mediaId === action.payload.mediaId && r.userId === action.payload.userId),
        ),
      };

    // Party Notes
    case 'SET_NOTES':
      return { ...state, partyNotes: action.payload };

    case 'ADD_NOTE':
      return {
        ...state,
        partyNotes: [...state.partyNotes, action.payload],
      };

    case 'UPDATE_NOTE':
      return {
        ...state,
        partyNotes: state.partyNotes.map(n =>
          n.id === action.payload.id ? action.payload : n
        ),
      };

    case 'REMOVE_NOTE':
      return {
        ...state,
        partyNotes: state.partyNotes.filter(n => n.id !== action.payload),
      };

    // Challenges
    case 'SET_CHALLENGES':
      return { ...state, partyChallenges: action.payload };

    case 'ADD_CHALLENGE':
      return {
        ...state,
        partyChallenges: [...state.partyChallenges, action.payload],
      };

    case 'SET_CHALLENGE_RESPONSES':
      return { ...state, challengeResponses: action.payload };

    case 'ADD_CHALLENGE_RESPONSE': {
      const idx = state.challengeResponses.findIndex(
        r => r.challengeId === action.payload.challengeId && r.userId === action.payload.userId,
      );
      if (idx >= 0) {
        const updated = [...state.challengeResponses];
        updated[idx] = action.payload;
        return { ...state, challengeResponses: updated };
      }
      return {
        ...state,
        challengeResponses: [...state.challengeResponses, action.payload],
      };
    }

    // Offer Tickets
    case 'SET_OFFER_TICKETS':
      return { ...state, offerTickets: action.payload };

    case 'REDEEM_OFFER_TICKET':
      return {
        ...state,
        offerTickets: state.offerTickets.map(t =>
          t.id === action.payload
            ? { ...t, isRedeemed: true, redeemedAt: new Date().toISOString() }
            : t
        ),
      };

    // Game
    case 'SET_CURRENT_GAME':
      return { ...state, currentGame: action.payload };

    case 'UPDATE_GAME':
      if (!state.currentGame) return state;
      return {
        ...state,
        currentGame: { ...state.currentGame, ...action.payload },
      };

    case 'END_GAME':
      return { ...state, currentGame: null };

    // Notifications
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };

    // UI
    case 'SHOW_MODAL':
      return {
        ...state,
        ui: { ...state.ui, activeModal: action.payload },
      };

    case 'HIDE_MODAL':
      return {
        ...state,
        ui: { ...state.ui, activeModal: null },
      };

    // Premium
    case 'SET_PREMIUM_STATUS':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, isPremium: action.payload },
      };

    case 'SHOW_TOAST':
      return {
        ...state,
        ui: { ...state.ui, toastMessage: action.payload },
      };

    case 'HIDE_TOAST':
      return {
        ...state,
        ui: { ...state.ui, toastMessage: null },
      };

    case 'SET_ONBOARDING':
      return {
        ...state,
        ui: { ...state.ui, isOnboarding: action.payload },
      };

    // Connectivity
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return React.createElement(
    AppContext.Provider,
    { value: { state, dispatch } },
    children
  );
}

// ============================================
// HOOKS
// ============================================

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useUser() {
  const { state } = useApp();
  return state.user;
}

export function useParty() {
  const { state } = useApp();
  return state.currentParty;
}

export function useGame() {
  const { state } = useApp();
  return state.currentGame;
}

export function useIsAuthenticated() {
  const { state } = useApp();
  return state.isAuthenticated;
}

export function useIsPremium() {
  const { state } = useApp();
  return state.user?.isPremium ?? false;
}

export function useNeedsUsername() {
  const { state } = useApp();
  return state.needsUsername;
}

export function useNotifications() {
  const { state } = useApp();
  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
  };
}

export function usePartyPhotos() {
  const { state } = useApp();
  return state.partyPhotos;
}

export function usePartyNotes() {
  const { state } = useApp();
  return state.partyNotes;
}

export function usePhotoReactions() {
  const { state } = useApp();
  return state.photoReactions;
}

export function usePartyChallenges() {
  const { state } = useApp();
  return state.partyChallenges;
}

export function useChallengeResponses() {
  const { state } = useApp();
  return state.challengeResponses;
}

export function useOfferTickets() {
  const { state } = useApp();
  return state.offerTickets;
}

export function useIsVenueAccount() {
  const { state } = useApp();
  return state.user?.accountType === 'venue';
}
