import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

type Cell = 'X' | 'O' | null;
type Board = Cell[][];

const INITIAL_BOARD: Board = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

export const TicTacToeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user, partner } = useAuthStore();
  
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [mySymbol] = useState<'X' | 'O'>('X');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'draw'>('playing');
  const [turnTimer, setTurnTimer] = useState(600); // 10 minutes in seconds
  
  const partnerSymbol = mySymbol === 'X' ? 'O' : 'X';

  // Turn timer
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    
    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          // Time's up - current player loses
          if (isMyTurn) {
            setGameStatus('lost');
            Alert.alert('⏰ Time Out!', 'You ran out of time!');
          } else {
            setGameStatus('won');
            Alert.alert('🎉 You Win!', 'Your partner ran out of time!');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMyTurn, gameStatus]);

  const checkWinner = (newBoard: Board): Cell => {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (newBoard[i][0] && newBoard[i][0] === newBoard[i][1] && newBoard[i][1] === newBoard[i][2]) {
        return newBoard[i][0];
      }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
      if (newBoard[0][i] && newBoard[0][i] === newBoard[1][i] && newBoard[1][i] === newBoard[2][i]) {
        return newBoard[0][i];
      }
    }
    
    // Check diagonals
    if (newBoard[0][0] && newBoard[0][0] === newBoard[1][1] && newBoard[1][1] === newBoard[2][2]) {
      return newBoard[0][0];
    }
    if (newBoard[0][2] && newBoard[0][2] === newBoard[1][1] && newBoard[1][1] === newBoard[2][0]) {
      return newBoard[0][2];
    }
    
    return null;
  };

  const isBoardFull = (newBoard: Board): boolean => {
    return newBoard.every(row => row.every(cell => cell !== null));
  };

  const handleCellPress = (row: number, col: number) => {
    if (gameStatus !== 'playing') return;
    if (!isMyTurn) {
      Vibration.vibrate(50);
      return;
    }
    if (board[row][col] !== null) return;
    
    // Make move
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = mySymbol;
    setBoard(newBoard);
    Vibration.vibrate(30);
    
    // Check for winner
    const winner = checkWinner(newBoard);
    if (winner) {
      if (winner === mySymbol) {
        setGameStatus('won');
        setTimeout(() => Alert.alert('🎉 You Win!', 'Congratulations!'), 300);
      } else {
        setGameStatus('lost');
        setTimeout(() => Alert.alert('😢 You Lost', 'Better luck next time!'), 300);
      }
      return;
    }
    
    // Check for draw
    if (isBoardFull(newBoard)) {
      setGameStatus('draw');
      setTimeout(() => Alert.alert('🤝 Draw!', "It's a tie!"), 300);
      return;
    }
    
    // Switch turn
    setIsMyTurn(false);
    setTurnTimer(600);
    
    // Simulate partner's move (for demo - replace with real-time sync)
    simulatePartnerMove(newBoard);
  };

  // Demo: Simulate partner's move (replace with WebSocket in production)
  const simulatePartnerMove = (currentBoard: Board) => {
    setTimeout(() => {
      const emptyCells: { row: number; col: number }[] = [];
      currentBoard.forEach((row, i) => {
        row.forEach((cell, j) => {
          if (cell === null) emptyCells.push({ row: i, col: j });
        });
      });
      
      if (emptyCells.length === 0) return;
      
      const randomMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const newBoard = currentBoard.map(r => [...r]);
      newBoard[randomMove.row][randomMove.col] = partnerSymbol;
      setBoard(newBoard);
      
      // Check for winner
      const winner = checkWinner(newBoard);
      if (winner) {
        if (winner === mySymbol) {
          setGameStatus('won');
          setTimeout(() => Alert.alert('🎉 You Win!', 'Congratulations!'), 300);
        } else {
          setGameStatus('lost');
          setTimeout(() => Alert.alert('😢 You Lost', 'Better luck next time!'), 300);
        }
        return;
      }
      
      if (isBoardFull(newBoard)) {
        setGameStatus('draw');
        setTimeout(() => Alert.alert('🤝 Draw!', "It's a tie!"), 300);
        return;
      }
      
      setIsMyTurn(true);
      setTurnTimer(600);
    }, 1500);
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD);
    setIsMyTurn(true);
    setGameStatus('playing');
    setTurnTimer(600);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⭕ Tic-Tac-Toe</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Players */}
      <View style={styles.playersRow}>
        <View style={[styles.playerCard, isMyTurn && styles.playerCardActive]}>
          <Text style={styles.playerSymbol}>{mySymbol}</Text>
          <Text style={styles.playerName}>You</Text>
          {isMyTurn && <Text style={styles.turnIndicator}>Your turn!</Text>}
        </View>
        
        <Text style={styles.vsText}>vs</Text>
        
        <View style={[styles.playerCard, !isMyTurn && styles.playerCardActive]}>
          <Text style={styles.playerSymbol}>{partnerSymbol}</Text>
          <Text style={styles.playerName}>{partner?.name || 'Partner'}</Text>
          {!isMyTurn && <Text style={styles.turnIndicator}>Thinking...</Text>}
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Ionicons name="time-outline" size={20} color={turnTimer < 60 ? colors.error : colors.textSecondary} />
        <Text style={[styles.timerText, turnTimer < 60 && { color: colors.error }]}>
          {formatTime(turnTimer)}
        </Text>
      </View>

      {/* Game Board */}
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {board.map((row, i) => (
            <View key={i} style={styles.boardRow}>
              {row.map((cell, j) => (
                <TouchableOpacity
                  key={`${i}-${j}`}
                  style={[
                    styles.cell,
                    j < 2 && styles.cellBorderRight,
                    i < 2 && styles.cellBorderBottom,
                  ]}
                  onPress={() => handleCellPress(i, j)}
                  disabled={gameStatus !== 'playing' || !isMyTurn || cell !== null}
                >
                  <Text style={[
                    styles.cellText,
                    cell === 'X' && { color: colors.primary },
                    cell === 'O' && { color: '#FFB347' },
                  ]}>
                    {cell}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Game Status */}
      {gameStatus !== 'playing' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {gameStatus === 'won' && '🎉 You Won!'}
            {gameStatus === 'lost' && '😢 You Lost'}
            {gameStatus === 'draw' && '🤝 It\'s a Draw!'}
          </Text>
          <TouchableOpacity style={styles.playAgainBtn} onPress={resetGame}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
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
  playerSymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  playerName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
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
    marginBottom: spacing.md,
  },
  timerText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  board: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.md,
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBorderRight: {
    borderRightWidth: 3,
    borderRightColor: colors.border,
  },
  cellBorderBottom: {
    borderBottomWidth: 3,
    borderBottomColor: colors.border,
  },
  cellText: {
    fontSize: 48,
    fontWeight: 'bold',
  },

  resultContainer: {
    alignItems: 'center',
    paddingBottom: spacing['2xl'],
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

export default TicTacToeScreen;

