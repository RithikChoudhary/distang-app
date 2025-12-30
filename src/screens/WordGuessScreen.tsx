import React, { useState, useEffect } from 'react';
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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

type LetterResult = 'correct' | 'present' | 'absent' | 'empty';

interface Guess {
  word: string;
  results: LetterResult[];
}

export const WordGuessScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { partner } = useAuthStore();
  
  const [phase, setPhase] = useState<'setting' | 'guessing' | 'won' | 'lost'>('setting');
  const [secretWord, setSecretWord] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [turnTimer, setTurnTimer] = useState(600);
  const [isMyTurn, setIsMyTurn] = useState(true); // I set the word first
  
  useEffect(() => {
    if (phase === 'won' || phase === 'lost') return;
    
    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          if (phase === 'setting' && isMyTurn) {
            Alert.alert('⏰ Time Out!', 'You took too long to set a word!');
          } else if (phase === 'guessing' && isMyTurn) {
            setPhase('lost');
            Alert.alert('⏰ Time Out!', 'You ran out of time!');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [phase, isMyTurn]);

  const handleSetWord = () => {
    const word = wordInput.toUpperCase().trim();
    
    if (word.length !== WORD_LENGTH) {
      Alert.alert('Invalid Word', `Word must be ${WORD_LENGTH} letters`);
      return;
    }
    
    if (!/^[A-Z]+$/.test(word)) {
      Alert.alert('Invalid Word', 'Word must contain only letters');
      return;
    }
    
    setSecretWord(word);
    setWordInput('');
    setPhase('guessing');
    setIsMyTurn(false);
    setTurnTimer(600);
    Vibration.vibrate(50);
    
    // Simulate partner guessing
    simulatePartnerGuess(word);
  };

  const simulatePartnerGuess = (secret: string) => {
    // For demo, simulate partner making guesses
    const commonWords = ['HELLO', 'WORLD', 'APPLE', 'BRAIN', 'CRANE', 'DREAM', 'EARTH'];
    let attemptCount = 0;
    
    const makeGuess = () => {
      if (attemptCount >= MAX_ATTEMPTS) {
        setPhase('won');
        Alert.alert('🎉 You Win!', `${partner?.name || 'Partner'} couldn't guess your word: ${secret}`);
        return;
      }
      
      const guess = commonWords[attemptCount % commonWords.length];
      const results = checkGuess(guess, secret);
      
      setGuesses(prev => [...prev, { word: guess, results }]);
      attemptCount++;
      
      if (guess === secret) {
        setPhase('lost');
        Alert.alert('😢 You Lost', `${partner?.name || 'Partner'} guessed your word!`);
        return;
      }
      
      // Continue guessing
      setTimeout(makeGuess, 2000);
    };
    
    setTimeout(makeGuess, 1500);
  };

  const checkGuess = (guess: string, secret: string): LetterResult[] => {
    const results: LetterResult[] = [];
    const secretLetters = secret.split('');
    const usedIndices = new Set<number>();
    
    // First pass: mark correct
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guess[i] === secret[i]) {
        results[i] = 'correct';
        usedIndices.add(i);
      }
    }
    
    // Second pass: mark present/absent
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (results[i]) continue;
      
      const idx = secretLetters.findIndex((l, j) => l === guess[i] && !usedIndices.has(j));
      if (idx !== -1) {
        results[i] = 'present';
        usedIndices.add(idx);
      } else {
        results[i] = 'absent';
      }
    }
    
    return results;
  };

  const resetGame = () => {
    setPhase('setting');
    setSecretWord('');
    setWordInput('');
    setGuesses([]);
    setCurrentGuess('');
    setTurnTimer(600);
    setIsMyTurn(true);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📝 Word Guess</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={20} color={turnTimer < 60 ? colors.error : colors.textSecondary} />
          <Text style={[styles.timerText, turnTimer < 60 && { color: colors.error }]}>
            {formatTime(turnTimer)}
          </Text>
        </View>

        {/* Setting Phase */}
        {phase === 'setting' && (
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

        {/* Guessing Phase */}
        {(phase === 'guessing' || phase === 'won' || phase === 'lost') && (
          <View style={styles.guessingContainer}>
            <View style={styles.secretWordCard}>
              <Text style={styles.secretLabel}>Your Secret Word:</Text>
              <Text style={styles.secretWord}>{secretWord}</Text>
            </View>
            
            <Text style={styles.guessesTitle}>
              {partner?.name || 'Partner'}'s Guesses ({guesses.length}/{MAX_ATTEMPTS})
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
        {(phase === 'won' || phase === 'lost') && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              {phase === 'won' ? '🎉 You Win!' : '😢 They Got It!'}
            </Text>
            <TouchableOpacity style={styles.playAgainBtn} onPress={resetGame}>
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
    backgroundColor: colors.primaryLight,
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

