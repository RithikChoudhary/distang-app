import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const TOKEN_KEY = 'codex_auth_token';

type LetterResult = 'correct' | 'present' | 'absent' | 'empty';

interface Guess {
  word: string;
  results: LetterResult[];
}

interface GameState {
  secretWord: string | null;
  guesses: Guess[];
  status: 'setting' | 'guessing';
  setter: string;
  guesser: string;
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

export const WordGuessScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user, partner } = useAuthStore();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [turnTimer, setTurnTimer] = useState(600);
  const [error, setError] = useState<string | null>(null);

  const isMyTurn = game?.currentTurn === user?._id;
  const amISetter = game?.gameState?.setter === user?._id;
  const amIGuesser = game?.gameState?.guesser === user?._id;
  const phase = game?.gameState?.status || 'setting';
  const guesses = game?.gameState?.guesses || [];
  const secretWord = game?.gameState?.secretWord || '';

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

      newSocket.on('game:ended', ({ winner }) => {
        if (winner === user?._id) {
          Alert.alert('🎉 You Win!', 'Congratulations!');
        } else {
          Alert.alert('😢 Game Over', 'Better luck next time!');
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
        
        if (activeGame.data?.game && activeGame.data.game.gameType === 'word_guess') {
          setGame(activeGame.data.game);
          socket?.emit('game:join', activeGame.data.game._id);
          setIsLoading(false);
        } else if (partner) {
          const newGame = await gamesApi.createGame('word_guess', partner._id);
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

  const handleSetWord = useCallback(() => {
    const word = wordInput.toUpperCase().trim();
    
    if (word.length !== WORD_LENGTH) {
      Alert.alert('Invalid Word', `Word must be ${WORD_LENGTH} letters`);
      return;
    }
    
    if (!/^[A-Z]+$/.test(word)) {
      Alert.alert('Invalid Word', 'Word must contain only letters');
      return;
    }
    
    // Send the secret word via WebSocket
    socket?.emit('game:move', {
      gameId: game?._id,
      move: { type: 'setWord', word },
    });
    
    setWordInput('');
    Vibration.vibrate(50);
  }, [wordInput, game, socket]);

  const handleGuess = useCallback(() => {
    const guess = guessInput.toUpperCase().trim();
    
    if (guess.length !== WORD_LENGTH) {
      Alert.alert('Invalid Guess', `Guess must be ${WORD_LENGTH} letters`);
      return;
    }
    
    if (!/^[A-Z]+$/.test(guess)) {
      Alert.alert('Invalid Guess', 'Guess must contain only letters');
      return;
    }
    
    // Send the guess via WebSocket
    socket?.emit('game:move', {
      gameId: game?._id,
      move: { type: 'guess', guess },
    });
    
    setGuessInput('');
    Vibration.vibrate(30);
  }, [guessInput, game, socket]);

  const handleForfeit = () => {
    Alert.alert(
      'Forfeit Game',
      'Are you sure you want to forfeit?',
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
    try {
      const newGame = await gamesApi.createGame('word_guess', partner._id);
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

  const getResultColor = (result: LetterResult): string => {
    switch (result) {
      case 'correct': return '#4CAF50';
      case 'present': return '#FFC107';
      case 'absent': return isDark ? '#555' : '#9E9E9E';
      default: return colors.backgroundAlt;
    }
  };

  const styles = createStyles(colors, isDark);
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
        <Text style={styles.headerTitle}>📝 Word Guess</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleForfeit}>
          <Ionicons name="flag" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timer */}
        {game?.status === 'active' && (
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color={turnTimer < 60 ? colors.error : colors.textSecondary} />
            <Text style={[styles.timerText, turnTimer < 60 && { color: colors.error }]}>
              {formatTime(turnTimer)}
            </Text>
          </View>
        )}

        {/* Setting Phase - I'm the setter */}
        {phase === 'setting' && amISetter && isMyTurn && (
          <View style={styles.settingContainer}>
            <View style={styles.instructionCard}>
              <Text style={styles.instructionEmoji}>🤫</Text>
              <Text style={styles.instructionTitle}>Set a Secret Word</Text>
              <Text style={styles.instructionText}>
                Enter a {WORD_LENGTH}-letter word for {partner?.name || 'your partner'} to guess!
              </Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.wordInput}
                value={wordInput}
                onChangeText={t => setWordInput(t.toUpperCase().slice(0, WORD_LENGTH))}
                placeholder="ENTER WORD"
                placeholderTextColor={colors.textMuted}
                maxLength={WORD_LENGTH}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.charCount}>{wordInput.length}/{WORD_LENGTH}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.setBtn, wordInput.length !== WORD_LENGTH && styles.setBtnDisabled]}
              onPress={handleSetWord}
              disabled={wordInput.length !== WORD_LENGTH}
            >
              <Text style={styles.setBtnText}>Set Word</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Setting Phase - Waiting for partner to set word */}
        {phase === 'setting' && !isMyTurn && (
          <View style={styles.waitingScreen}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.waitingTitle}>Waiting for {partner?.name}...</Text>
            <Text style={styles.waitingSubtitle}>They're setting a secret word for you to guess!</Text>
          </View>
        )}

        {/* Guessing Phase */}
        {phase === 'guessing' && !gameEnded && (
          <View style={styles.guessingContainer}>
            {/* Show secret word to setter */}
            {amISetter && secretWord && (
              <View style={styles.secretWordCard}>
                <Text style={styles.secretLabel}>Your Secret Word:</Text>
                <Text style={styles.secretWord}>{secretWord}</Text>
              </View>
            )}
            
            <Text style={styles.guessesTitle}>
              {amIGuesser ? 'Your' : `${partner?.name}'s`} Guesses ({guesses.length}/{MAX_ATTEMPTS})
            </Text>
            
            {/* Guesses Grid */}
            <View style={styles.guessesGrid}>
              {Array(MAX_ATTEMPTS).fill(null).map((_, rowIndex) => {
                const guess = guesses[rowIndex];
                return (
                  <View key={rowIndex} style={styles.guessRow}>
                    {Array(WORD_LENGTH).fill(null).map((_, colIndex) => {
                      const letter = guess?.word[colIndex] || '';
                      const result = guess?.results[colIndex] || 'empty';
                      return (
                        <View
                          key={colIndex}
                          style={[
                            styles.letterBox,
                            { backgroundColor: getResultColor(result) },
                          ]}
                        >
                          <Text style={styles.letterText}>{letter}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            {/* Guess input for guesser */}
            {amIGuesser && isMyTurn && (
              <View style={styles.guessInputContainer}>
                <TextInput
                  style={styles.guessTextInput}
                  value={guessInput}
                  onChangeText={t => setGuessInput(t.toUpperCase().slice(0, WORD_LENGTH))}
                  placeholder="YOUR GUESS"
                  placeholderTextColor={colors.textMuted}
                  maxLength={WORD_LENGTH}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={[styles.guessBtn, guessInput.length !== WORD_LENGTH && styles.guessBtnDisabled]}
                  onPress={handleGuess}
                  disabled={guessInput.length !== WORD_LENGTH}
                >
                  <Text style={styles.guessBtnText}>Guess</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Waiting for partner to guess */}
            {amISetter && !isMyTurn && (
              <View style={styles.waitingForGuess}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.waitingGuessText}>
                  Waiting for {partner?.name}'s guess...
                </Text>
              </View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>Correct</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                <Text style={styles.legendText}>Wrong spot</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: isDark ? '#555' : '#9E9E9E' }]} />
                <Text style={styles.legendText}>Not in word</Text>
              </View>
            </View>
          </View>
        )}

        {/* Result */}
        {gameEnded && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              {game?.winner === user?._id ? '🎉 You Win!' : '😢 Game Over'}
            </Text>
            {secretWord && (
              <Text style={styles.revealedWord}>The word was: {secretWord}</Text>
            )}
            <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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

  content: {
    flex: 1,
    padding: spacing.md,
  },

  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  timerText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Setting phase
  settingContainer: {
    alignItems: 'center',
  },
  instructionCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  instructionEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  instructionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instructionText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  wordInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
    letterSpacing: 8,
    ...shadows.sm,
  },
  charCount: {
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
  },
  setBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  setBtnDisabled: {
    opacity: 0.5,
  },
  setBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: 'white',
  },

  // Waiting screen
  waitingScreen: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  waitingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  waitingSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Guessing phase
  guessingContainer: {
    alignItems: 'center',
  },
  secretWordCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
    ...shadows.sm,
  },
  secretLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  secretWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 8,
    marginTop: spacing.xs,
  },
  guessesTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  guessesGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  guessRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  letterBox: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },

  guessInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  guessTextInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
    letterSpacing: 4,
    ...shadows.sm,
  },
  guessBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  guessBtnDisabled: {
    opacity: 0.5,
  },
  guessBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: 'white',
  },

  waitingForGuess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  waitingGuessText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },

  resultContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  resultText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  revealedWord: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
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
});

export default WordGuessScreen;
