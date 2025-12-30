import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

// Games list with info
const GAMES = [
  {
    id: 'tic_tac_toe',
    name: 'Tic-Tac-Toe',
    emoji: '⭕',
    description: 'Classic 3x3 game',
    gradient: ['#FF6B8A', '#FF8E9E'],
  },
  {
    id: 'connect_four',
    name: 'Connect Four',
    emoji: '🔴',
    description: 'Drop to connect 4!',
    gradient: ['#FFB347', '#FFCC70'],
  },
  {
    id: 'word_guess',
    name: 'Word Guess',
    emoji: '📝',
    description: 'Guess the 5-letter word',
    gradient: ['#87CEEB', '#ADD8E6'],
  },
  {
    id: 'emoji_match',
    name: 'Emoji Match',
    emoji: '🎯',
    description: 'Coming soon!',
    gradient: ['#98FB98', '#90EE90'],
    disabled: true,
  },
];

type RootStackParamList = {
  Games: undefined;
  TicTacToe: undefined;
  ConnectFour: undefined;
  WordGuess: undefined;
};

export const GamesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const { partner } = useAuthStore();
  
  const [activeGame, setActiveGame] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGameSelect = (gameId: string) => {
    // Navigate to specific game screen
    switch (gameId) {
      case 'tic_tac_toe':
        navigation.navigate('TicTacToe');
        break;
      case 'connect_four':
        navigation.navigate('ConnectFour');
        break;
      case 'word_guess':
        navigation.navigate('WordGuess');
        break;
      default:
        Alert.alert('Coming Soon', 'This game is not available yet!');
    }
  };

  const styles = createStyles(colors, isDark);

  const renderGameCard = ({ item, index }: { item: typeof GAMES[0]; index: number }) => (
    <TouchableOpacity
      style={[
        styles.gameCard,
        { backgroundColor: item.gradient[0] },
        item.disabled && styles.gameCardDisabled,
      ]}
      onPress={() => !item.disabled && handleGameSelect(item.id)}
      disabled={item.disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.gameEmoji}>{item.emoji}</Text>
      <View style={styles.gameInfo}>
        <Text style={styles.gameName}>{item.name}</Text>
        <Text style={styles.gameDescription}>{item.description}</Text>
      </View>
      {item.disabled ? (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Soon</Text>
        </View>
      ) : (
        <Ionicons name="play-circle" size={32} color="white" />
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>🎮 Games</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Partner Status */}
      <View style={styles.partnerCard}>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerLabel}>Playing with</Text>
          <Text style={styles.partnerName}>{partner?.name || 'Your Partner'} 💕</Text>
        </View>
        <View style={[styles.onlineIndicator, { backgroundColor: colors.success }]} />
      </View>

      {/* Game Grid */}
      <FlatList
        data={GAMES}
        keyExtractor={(item) => item.id}
        renderItem={renderGameCard}
        contentContainerStyle={styles.gamesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Stats Preview */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Your Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>🔥 0</Text>
            <Text style={styles.statLabel}>Win Streak</Text>
          </View>
        </View>
      </View>
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

  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  partnerInfo: {},
  partnerLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  partnerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  gamesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  gameCardDisabled: {
    opacity: 0.6,
  },
  gameEmoji: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: 'white',
  },
  gameDescription: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  comingSoonText: {
    fontSize: typography.fontSize.xs,
    color: 'white',
    fontWeight: '600',
  },

  statsCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing['2xl'],
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  statsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.md,
  },
});

export default GamesScreen;

