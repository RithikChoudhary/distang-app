import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Vibration,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

type Cell = 'red' | 'yellow' | null;
type Board = Cell[][];

const ROWS = 6;
const COLS = 7;

const createEmptyBoard = (): Board => {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
};

export const ConnectFourScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user, partner } = useAuthStore();
  
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [myColor] = useState<'red' | 'yellow'>('red');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'draw'>('playing');
  const [turnTimer, setTurnTimer] = useState(600);
  const [winningCells, setWinningCells] = useState<{row: number; col: number}[]>([]);
  
  const partnerColor = myColor === 'red' ? 'yellow' : 'red';

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    
    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
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

  const checkWinner = (board: Board, row: number, col: number, color: Cell): {row: number; col: number}[] | null => {
    if (!color) return null;
    
    const directions = [
      { dr: 0, dc: 1 },  // horizontal
      { dr: 1, dc: 0 },  // vertical
      { dr: 1, dc: 1 },  // diagonal down-right
      { dr: 1, dc: -1 }, // diagonal down-left
    ];
    
    for (const { dr, dc } of directions) {
      const cells: {row: number; col: number}[] = [{ row, col }];
      
      // Check in positive direction
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === color) {
          cells.push({ row: r, col: c });
        } else break;
      }
      
      // Check in negative direction
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === color) {
          cells.push({ row: r, col: c });
        } else break;
      }
      
      if (cells.length >= 4) return cells;
    }
    
    return null;
  };

  const isBoardFull = (board: Board): boolean => {
    return board[0].every(cell => cell !== null);
  };

  const dropDisc = (col: number) => {
    if (gameStatus !== 'playing' || !isMyTurn) {
      Vibration.vibrate(50);
      return;
    }
    
    // Find lowest empty row
    let targetRow = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) {
        targetRow = row;
        break;
      }
    }
    
    if (targetRow === -1) return; // Column full
    
    const newBoard = board.map(r => [...r]);
    newBoard[targetRow][col] = myColor;
    setBoard(newBoard);
    Vibration.vibrate(30);
    
    // Check winner
    const winCells = checkWinner(newBoard, targetRow, col, myColor);
    if (winCells) {
      setWinningCells(winCells);
      setGameStatus('won');
      setTimeout(() => Alert.alert('🎉 You Win!', 'Connect Four!'), 300);
      return;
    }
    
    if (isBoardFull(newBoard)) {
      setGameStatus('draw');
      setTimeout(() => Alert.alert('🤝 Draw!', "It's a tie!"), 300);
      return;
    }
    
    setIsMyTurn(false);
    setTurnTimer(600);
    simulatePartnerMove(newBoard);
  };

  const simulatePartnerMove = (currentBoard: Board) => {
    setTimeout(() => {
      // Find valid columns
      const validCols: number[] = [];
      for (let c = 0; c < COLS; c++) {
        if (currentBoard[0][c] === null) validCols.push(c);
      }
      
      if (validCols.length === 0) return;
      
      const col = validCols[Math.floor(Math.random() * validCols.length)];
      let targetRow = -1;
      for (let row = ROWS - 1; row >= 0; row--) {
        if (currentBoard[row][col] === null) {
          targetRow = row;
          break;
        }
      }
      
      if (targetRow === -1) return;
      
      const newBoard = currentBoard.map(r => [...r]);
      newBoard[targetRow][col] = partnerColor;
      setBoard(newBoard);
      
      const winCells = checkWinner(newBoard, targetRow, col, partnerColor);
      if (winCells) {
        setWinningCells(winCells);
        setGameStatus('lost');
        setTimeout(() => Alert.alert('😢 You Lost', 'Better luck next time!'), 300);
        return;
      }
      
      if (isBoardFull(newBoard)) {
        setGameStatus('draw');
        setTimeout(() => Alert.alert('🤝 Draw!', "It's a tie!"), 300);
        return;
      }
      
      setIsMyTurn(true);
      setTurnTimer(600);
    }, 1000);
  };

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setIsMyTurn(true);
    setGameStatus('playing');
    setTurnTimer(600);
    setWinningCells([]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWinningCell = (row: number, col: number): boolean => {
    return winningCells.some(c => c.row === row && c.col === col);
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔴 Connect Four</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Players */}
      <View style={styles.playersRow}>
        <View style={[styles.playerCard, isMyTurn && styles.playerCardActive]}>
          <View style={[styles.colorDot, { backgroundColor: '#E53935' }]} />
          <Text style={styles.playerName}>You</Text>
          {isMyTurn && <Text style={styles.turnIndicator}>Your turn!</Text>}
        </View>
        
        <Text style={styles.vsText}>vs</Text>
        
        <View style={[styles.playerCard, !isMyTurn && styles.playerCardActive]}>
          <View style={[styles.colorDot, { backgroundColor: '#FFC107' }]} />
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
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardScrollContent}
      >
        <View style={styles.boardContainer}>
          {/* Column buttons */}
          <View style={styles.columnButtons}>
            {Array(COLS).fill(null).map((_, col) => (
              <TouchableOpacity
                key={col}
                style={styles.columnBtn}
                onPress={() => dropDisc(col)}
                disabled={gameStatus !== 'playing' || !isMyTurn}
              >
                <Ionicons name="caret-down" size={24} color={isMyTurn ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Board */}
          <View style={styles.board}>
            {board.map((row, i) => (
              <View key={i} style={styles.boardRow}>
                {row.map((cell, j) => (
                  <View
                    key={`${i}-${j}`}
                    style={[
                      styles.cell,
                      isWinningCell(i, j) && styles.winningCell,
                    ]}
                  >
                    <View style={[
                      styles.disc,
                      cell === 'red' && styles.discRed,
                      cell === 'yellow' && styles.discYellow,
                      !cell && styles.discEmpty,
                    ]} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Result */}
      {gameStatus !== 'playing' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {gameStatus === 'won' && '🎉 You Won!'}
            {gameStatus === 'lost' && '😢 You Lost'}
            {gameStatus === 'draw' && '🤝 Draw!'}
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
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  playerCard: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    minWidth: 90,
    ...shadows.sm,
  },
  playerCardActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  playerName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  turnIndicator: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  vsText: {
    fontSize: typography.fontSize.base,
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
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  boardScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  boardContainer: {
    alignItems: 'center',
  },
  columnButtons: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  columnBtn: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    backgroundColor: '#1565C0',
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.md,
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  winningCell: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 22,
  },
  disc: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  discEmpty: {
    backgroundColor: isDark ? '#1A1A1A' : 'white',
  },
  discRed: {
    backgroundColor: '#E53935',
    ...shadows.sm,
  },
  discYellow: {
    backgroundColor: '#FFC107',
    ...shadows.sm,
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

export default ConnectFourScreen;

