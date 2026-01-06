import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * Games API Service
 * Connects to the separate games backend server
 */

const DEV_GAMES_URL = 'http://192.168.68.110:4000';
const PROD_GAMES_URL = 'https://games.distang.com';

const USE_PRODUCTION = true;

export const GAMES_API_URL = USE_PRODUCTION ? PROD_GAMES_URL : DEV_GAMES_URL;

const TOKEN_KEY = 'codex_auth_token';

// Internal axios client - renamed to avoid conflict with exported gamesApi
const gamesClient = axios.create({
  baseURL: GAMES_API_URL,
  timeout: 15000,
});

// Add auth token to requests
gamesClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface GameInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  avgDuration: string;
}

export interface Game {
  _id: string;
  coupleId: string;
  gameType: string;
  status: 'waiting' | 'active' | 'completed' | 'timeout' | 'abandoned';
  player1: string;
  player2: string;
  currentTurn: string;
  gameState: any;
  player1Score: number;
  player2Score: number;
  winner?: string;
  isDraw: boolean;
  turnStartedAt: string;
  lastMoveAt: string;
  createdAt: string;
}

export interface GameStats {
  coupleId: string;
  totalGamesPlayed: number;
  stats: {
    [gameType: string]: {
      played: number;
      player1Wins: number;
      player2Wins: number;
      draws: number;
      totalPlayTime: number;
    };
  };
  currentWinStreak: {
    playerId: string | null;
    count: number;
  };
  longestWinStreak: {
    playerId: string | null;
    count: number;
  };
}

export const gamesService = {
  getGamesList: async (): Promise<{ games: GameInfo[] }> => {
    const response = await gamesClient.get('/games/list');
    return response.data.data;
  },

  createGame: async (gameType: string, partnerId: string): Promise<{ game: Game }> => {
    const response = await gamesClient.post('/games/create', { gameType, partnerId });
    return response.data.data;
  },

  getActiveGame: async (): Promise<{ game: Game | null }> => {
    const response = await gamesClient.get('/games/active');
    return response.data.data;
  },

  makeMove: async (gameId: string, move: any): Promise<{ game: Game }> => {
    const response = await gamesClient.post(`/games/${gameId}/move`, { move });
    return response.data.data;
  },

  forfeitGame: async (gameId: string): Promise<{ game: Game }> => {
    const response = await gamesClient.post(`/games/${gameId}/forfeit`);
    return response.data.data;
  },

  getGameHistory: async (page: number = 1, limit: number = 20): Promise<{
    games: Game[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> => {
    const response = await gamesClient.get('/games/history', { params: { page, limit } });
    return response.data.data;
  },

  getGameStats: async (): Promise<{ stats: GameStats }> => {
    const response = await gamesClient.get('/games/stats');
    return response.data.data;
  },
};

// Exported API for game screens (WebSocket-based games)
export const gamesApi = {
  createGame: async (gameType: string, partnerId: string) => {
    const response = await gamesClient.post('/games/create', { gameType, partnerId });
    return { data: response.data.data };
  },
  
  getActiveGame: async () => {
    const response = await gamesClient.get('/games/active');
    return { data: response.data.data };
  },
};

export default gamesService;
