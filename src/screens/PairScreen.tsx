import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../components';
import { coupleApi, userApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { PairRequest, Partner } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

interface PairScreenProps {
  navigation: any;
}

export const PairScreen: React.FC<PairScreenProps> = ({ navigation }) => {
  const { user, refreshUser } = useAuthStore();
  const [partnerUniqueId, setPartnerUniqueId] = useState('');
  const [searchResult, setSearchResult] = useState<Partner | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<PairRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PairRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const response = await coupleApi.getPendingRequests();
      if (response.success && response.data) {
        setIncomingRequests(response.data.incoming || []);
        setOutgoingRequests(response.data.outgoing || []);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!partnerUniqueId.trim()) {
      Alert.alert('Error', 'Please enter a partner ID');
      return;
    }

    try {
      setIsSearching(true);
      setSearchResult(null);
      
      const response = await userApi.searchUser(partnerUniqueId.trim());
      
      if (response.success && response.data) {
        setSearchResult(response.data.user);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'User not found';
      Alert.alert('Search Failed', message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;

    try {
      setIsSending(true);
      
      const response = await coupleApi.sendRequest(searchResult.uniqueId);
      
      if (response.success) {
        Alert.alert('Success', 'Pair request sent!');
        setSearchResult(null);
        setPartnerUniqueId('');
        loadRequests();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send request';
      Alert.alert('Error', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async (coupleId: string) => {
    try {
      const response = await coupleApi.acceptRequest(coupleId);
      
      if (response.success) {
        Alert.alert('Success', 'You are now connected!');
        await refreshUser();
        navigation.goBack();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to accept request';
      Alert.alert('Error', message);
    }
  };

  const handleRejectRequest = async (coupleId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await coupleApi.rejectRequest(coupleId);
              loadRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const isPaired = user?.relationshipStatus === 'paired';

  if (isPaired) {
    return (
      <View style={styles.container}>
        <View style={styles.pairedContainer}>
          <Ionicons name="heart" size={64} color={colors.primary} />
          <Text style={styles.pairedTitle}>Already Connected!</Text>
          <Text style={styles.pairedSubtitle}>
            You're already in a relationship. Go to your home screen to see your partner.
          </Text>
          <Button
            title="Go Home"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Your ID Card */}
      <View style={styles.idCard}>
        <Text style={styles.idCardLabel}>Your Unique ID</Text>
        <Text style={styles.idCardValue}>{user?.uniqueId}</Text>
        <Text style={styles.idCardHint}>Share this ID with your partner</Text>
      </View>

      {/* Search Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Find Your Partner</Text>
        <Input
          placeholder="Enter partner's unique ID"
          value={partnerUniqueId}
          onChangeText={setPartnerUniqueId}
          autoCapitalize="characters"
          leftIcon="search-outline"
          containerStyle={{ marginBottom: 0 }}
        />
        <Button
          title="Search"
          onPress={handleSearch}
          loading={isSearching}
          variant="outline"
          style={{ marginTop: spacing.md }}
        />

        {/* Search Result */}
        {searchResult && (
          <View style={styles.searchResult}>
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{searchResult.name}</Text>
                <Text style={styles.userUniqueId}>{searchResult.uniqueId}</Text>
                <Text style={styles.userStatus}>
                  {searchResult.relationshipStatus === 'paired'
                    ? '⚠️ Already in a relationship'
                    : '✓ Available'}
                </Text>
              </View>
            </View>
            
            {searchResult.relationshipStatus !== 'paired' && (
              <Button
                title="Send Pair Request"
                onPress={handleSendRequest}
                loading={isSending}
                icon={<Ionicons name="heart" size={18} color={colors.textInverse} />}
              />
            )}
          </View>
        )}
      </View>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Incoming Requests ({incomingRequests.length})
          </Text>
          {incomingRequests.map((request) => (
            <View key={request.coupleId} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{(request.from as any)?.name}</Text>
                <Text style={styles.requestId}>{(request.from as any)?.uniqueId}</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(request.coupleId)}
                >
                  <Ionicons name="checkmark" size={20} color={colors.textInverse} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRejectRequest(request.coupleId)}
                >
                  <Ionicons name="close" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pending Requests ({outgoingRequests.length})
          </Text>
          {outgoingRequests.map((request) => (
            <View key={request.coupleId} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{(request.to as any)?.name}</Text>
                <Text style={styles.requestId}>{(request.to as any)?.uniqueId}</Text>
              </View>
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={16} color={colors.warning} />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {isLoading && (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  pairedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  pairedTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  pairedSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  
  // ID Card
  idCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  idCardLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textInverse,
    opacity: 0.8,
  },
  idCardValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textInverse,
    letterSpacing: 2,
    marginVertical: spacing.sm,
  },
  idCardHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textInverse,
    opacity: 0.7,
  },
  
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  // Search Result
  searchResult: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  userUniqueId: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  userStatus: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    marginTop: 2,
  },
  
  // Request Cards
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  requestId: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  pendingText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
  },
});

export default PairScreen;

