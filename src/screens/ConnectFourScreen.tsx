import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Vibration,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { gamesApi, GAMES_API_URL } from '../services/gamesApi';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

type Cell = 'red' | 'yellow' | null;

interface GameState {
  board: Cell[][];
  currentPlayer: string;
  player1Color: 'red' | 'yellow';
  player2Color: 'red' | 'yellow';
}

interface Game {
  _id: string;
  gameType: string;
  status: 'waiting' | 'active' | 'completed' | 'timeout' | 'abandoned';
  player1: string;
  player2: string;
  currentTurn: string;
  gameState: GameState;
  winner?: string;
  isDraw: boolean;
}

const ROWS = 6;
const COLS = 7;
const TOKEN_KEY = 'codex_auth_token';

export const ConnectFourScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user, partner } = useAuthStore();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [turnTimer, setTurnTimer] = useState(600);
  const [winningCells, setWinningCells] = useState<{row: number; col: number}[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isMyTurn = game?.currentTurn === user?._id;
  const myColor = game?.player1 === user?._id ? game?.gameState?.player1Color : game?.gameState?.player2Color;
  const partnerColor = myColor === 'red' ? 'yellow' : 'red';

  // Connect to WebSocket
  useEffect(() => {
    const connectSocket = async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      const newSocket = io(GAMES_API_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('🎮 Connected to games server');
        setIsConnecting(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setError('Failed to connect to game server');
        setIsConnecting(false);
      });

      newSocket.on('game:state', ({ game }) => {
        setGame(game);
        setIsLoading(false);
      });

      newSocket.on('game:update', ({ game: updatedGame }) => {
        setGame(updatedGame);
        setTurnTimer(600);
        Vibration.vibrate(50);
      });

      newSocket.on('game:ended', ({ winner, isDraw }) => {
        if (isDraw) {
          Alert.alert('🤝 Draw!', "It's a tie!");
        } else if (winner === user?._id) {
          Alert.alert('🎉 You Win!', 'Congratulations!');
        } else {
          Alert.alert('😢 You Lost', 'Better luck next time!');
        }
      });

      newSocket.on('game:timeout', ({ winnerId }) => {
        if (winnerId === user?._id) {
          Alert.alert('🎉 You Win!', 'Your partner ran out of time!');
        } else {
          Alert.alert('⏰ Time Out!', 'You ran out of time!');
        }
      });

      newSocket.on('game:forfeited', ({ forfeitedBy }) => {
        if (forfeitedBy === user?._id) {
          Alert.alert('Game Forfeited', 'You forfeited the game.');
        } else {
          Alert.alert('🎉 You Win!', 'Your partner forfeited.');
        }
      });

      newSocket.on('error', ({ message }) => {
        Alert.alert('Error', message);
      });

      setSocket(newSocket);
      setIsConnecting(true);
    };

    connectSocket();

    return () => {
      socket?.disconnect();
    };
  }, []);

  // Load or create game
  useEffect(() => {
    const initGame = async () => {
      try {
        const activeGame = await gamesApi.getActiveGame();
        
        if (activeGame.data?.game && activeGame.data.game.gameType === 'connect_four') {
          setGame(activeGame.data.game);
          socket?.emit('game:join', activeGame.data.game._id);
          setIsLoading(false);
        } else if (partner) {
          const newGame = await gamesApi.createGame('connect_four', partner._id);
          if (newGame.data?.game) {
            setGame(newGame.data.game);
            socket?.emit('game:join', newGame.data.game._id);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Init game error:', err);
        setError(err.message || 'Failed to start game');
        setIsLoading(false);
      }
    };

    if (socket?.connected) {
      initGame();
    }
  }, [socket?.connected, partner]);

  // Turn timer
  useEffect(() => {
    if (!game || game.status !== 'active') return;
    
    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [game?.status, game?.currentTurn]);

  const handleColumnPress = useCallback((col: number) => {
    if (!game || game.status !== 'active') return;
    if (!isMyTurn) {
      Vibration.vibrate(50);
      return;
    }

    // Send move via WebSocket
    socket?.emit('game:move', {
      gameId: game._id,
      move: { col },
    });
    
    Vibration.vibrate(30);
  }, [game, isMyTurn, socket]);

  const handleForfeit = () => {
    Alert.alert(
      'Forfeit Game',
      'Are you sure you want to forfeit? You will lose the game.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forfeit',
          style: 'destructive',
          onPress: () => {
            socket?.emit('game:forfeit', game?._id);
          },
        },
      ]
    );
  };

  const handlePlayAgain = async () => {
    if (!partner) return;
    
    setIsLoading(true);
    setWinningCells([]);
    try {
      const newGame = await gamesApi.createGame('connect_four', partner._id);
      if (newGame.data?.game) {
        setGame(newGame.data.game);
        socket?.emit('game:join', newGame.data.game._id);
        setTurnTimer(600);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to start new game');
    }
    setIsLoading(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWinningCell = (row: number, col: number): boolean => {
    return winningCells.some(cell => cell.row === row && cell.col === col);
  };

  const styles = createStyles(colors, isDark);
  const board = game?.gameState?.board || Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  const gameEnded = game?.status === 'completed' || game?.status === 'timeout' || game?.status === 'abandoned';

  if (isLoading || isConnecting) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {isConnecting ? 'Connecting to game server...' : 'Loading game...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔴 Connect Four</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleForfeit}>
          <Ionicons name="flag" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Players */}
      <View style={styles.playersRow}>
        <View style={[styles.playerCard, isMyTurn && styles.playerCardActive]}>
          <View style={[styles.colorIndicator, { backgroundColor: myColor === 'red' ? '#EF4444' : '#FBBF24' }]} />
          <Text style={styles.playerName}>You</Text>
          {isMyTurn && <Text style={styles.turnIndicator}>Your turn!</Text>}
        </View>
        
        <Text style={styles.vsText}>vs</Text>
        
        <View style={[styles.playerCard, !isMyTurn && styles.playerCardActive]}>
          <View style={[styles.colorIndicator, { backgroundColor: partnerColor === 'red' ? '#EF4444' : '#FBBF24' }]} />
          <Text style={styles.playerName}>{partner?.name || 'Partner'}</Text>
          {!isMyTurn && game?.status === 'active' && <Text style={styles.turnIndicator}>Thinking...</Text>}
        </View>
      </View>

      {/* Timer */}
      {game?.status === 'active' && (
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={20} color={turnTimer < 60 ? colors.error : colors.textSecondary} />
          <Text style={[styles.timerText, turnTimer < 60 && { color: colors.error }]}>
            {formatTime(turnTimer)}
          </Text>
        </View>
      )}

      {/* Game Board */}
      <ScrollView contentContainerStyle={styles.boardContainer}>
        <View style={styles.board}>
          {/* Column selectors */}
          <View style={styles.columnSelectors}>
            {Array(COLS).fill(null).map((_, col) => (
              <TouchableOpacity
                key={col}
                style={[styles.columnSelector, isMyTurn && styles.columnSelectorActive]}
                onPress={() => handleColumnPress(col)}
                disabled={gameEnded || !isMyTurn}
              >
                <Ionicons 
                  name="caret-down" 
                  size={24} 
                  color={isMyTurn ? colors.primary : colors.textMuted} 
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Board cells */}
          {board.map((row, i) => (
            <View key={i} style={styles.boardRow}>
              {row.map((cell, j) => (
                <View key={`${i}-${j}`} style={styles.cellContainer}>
                  <View style={[
                    styles.cell,
                    cell === 'red' && styles.cellRed,
                    cell === 'yellow' && styles.cellYellow,
                    isWinningCell(i, j) && styles.cellWinning,
                  ]}>
                    {cell && (
                      <View style={[
                        styles.disc,
                        { backgroundColor: cell === 'red' ? '#EF4444' : '#FBBF24' }
                      ]} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Game Status */}
      {gameEnded && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {game?.isDraw && '🤝 It\'s a Draw!'}
            {game?.winner === user?._id && '🎉 You Won!'}
            {game?.winner && game?.winner !== user?._id && '😢 You Lost'}
          </Text>
          <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Waiting indicator */}
      {game?.status === 'active' && !isMyTurn && (
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.waitingText}>Waiting for {partner?.name}'s move...</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  playerCard: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    minWidth: 100,
    ...shadows.sm,
  },
  playerCardActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  colorIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  playerName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  turnIndicator: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  vsText: {
    fontSize: typography.fontSize.lg,
    color: colors.textMuted,
    fontWeight: '600',
  },

  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  timerText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  boardContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  board: {
    backgroundColor: isDark ? '#1E40AF' : '#2563EB',
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.lg,
  },
  columnSelectors: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  columnSelector: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  columnSelectorActive: {
    opacity: 1,
  },
  boardRow: {
    flexDirection: 'row',
  },
  cellContainer: {
    padding: 2,
  },
  cell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#1E3A5F' : '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRed: {},
  cellYellow: {},
  cellWinning: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  resultContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  resultText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  playAgainBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  playAgainText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: 'white',
  },

  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  waitingText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});

export default ConnectFourScreen;
