import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, NativeModules, NativeEventEmitter, PermissionsAndroid, Alert } from 'react-native';
import { callStatusApi } from '../services/api';

// Types
export type CallState = 'idle' | 'incoming' | 'dialing' | 'connected' | 'disconnected' | 'unknown';

interface CallStateEvent {
  state: CallState;
  platform: 'ios' | 'android';
  timestamp: number;
}

interface UseCallDetectionResult {
  isListening: boolean;
  currentState: CallState;
  partnerState: CallState;
  partnerStateUpdatedAt: Date | null;
  isPartnerOnCall: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

// Check if native module is available
const isNativeModuleAvailable = (): boolean => {
  try {
    return !!NativeModules.CallDetection;
  } catch {
    return false;
  }
};

/**
 * Hook for call detection functionality
 * Works with native modules on Android and iOS
 */
export function useCallDetection(): UseCallDetectionResult {
  const [isListening, setIsListening] = useState(false);
  const [currentState, setCurrentState] = useState<CallState>('idle');
  const [partnerState, setPartnerState] = useState<CallState>('idle');
  const [partnerStateUpdatedAt, setPartnerStateUpdatedAt] = useState<Date | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const eventEmitter = useRef<NativeEventEmitter | null>(null);
  const subscription = useRef<any>(null);
  const partnerPollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Check if partner is on call
  const isPartnerOnCall = partnerState === 'connected' || partnerState === 'incoming' || partnerState === 'dialing';

  // Request permission (Android only, iOS doesn't need it)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      setHasPermission(true);
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: 'Phone State Permission',
          message: 'Codex needs access to phone state to share your call status with your partner.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasPermission(isGranted);
      return isGranted;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }, []);

  // Send call state to backend
  const syncCallState = useCallback(async (state: CallState) => {
    try {
      await callStatusApi.update({
        state,
        platform: Platform.OS as 'ios' | 'android',
      });
    } catch (error) {
      console.error('Failed to sync call state:', error);
    }
  }, []);

  // Fetch partner's call state
  const fetchPartnerState = useCallback(async () => {
    try {
      const response = await callStatusApi.getPartner();
      if (response.success && response.data) {
        setPartnerState(response.data.state);
        if (response.data.updatedAt) {
          setPartnerStateUpdatedAt(new Date(response.data.updatedAt));
        }
      }
    } catch (error) {
      // Silently fail - partner might not have call detection enabled
    }
  }, []);

  // Handle call state change event from native module
  const handleCallStateChange = useCallback((event: CallStateEvent) => {
    console.log('Call state changed:', event);
    setCurrentState(event.state);
    syncCallState(event.state);
  }, [syncCallState]);

  // Start listening for call state changes
  const startListening = useCallback(async () => {
    if (!isNativeModuleAvailable()) {
      console.warn('CallDetection native module not available');
      Alert.alert(
        'Not Available',
        'Call detection requires a development build. This feature is not available in Expo Go.'
      );
      return;
    }

    // Check/request permission first
    const permitted = hasPermission || await requestPermission();
    if (!permitted && Platform.OS === 'android') {
      Alert.alert('Permission Required', 'Phone state permission is required for call detection.');
      return;
    }

    try {
      const { CallDetection } = NativeModules;
      
      // Set up event listener
      eventEmitter.current = new NativeEventEmitter(CallDetection);
      subscription.current = eventEmitter.current.addListener(
        'onCallStateChanged',
        handleCallStateChange
      );

      // Start native listener
      await CallDetection.startListening();
      
      // Start foreground service on Android
      if (Platform.OS === 'android') {
        await CallDetection.startForegroundService();
      }

      setIsListening(true);

      // Start polling for partner's state
      partnerPollingInterval.current = setInterval(fetchPartnerState, 5000);
      fetchPartnerState(); // Initial fetch

    } catch (error) {
      console.error('Failed to start call detection:', error);
    }
  }, [hasPermission, requestPermission, handleCallStateChange, fetchPartnerState]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!isNativeModuleAvailable()) return;

    try {
      const { CallDetection } = NativeModules;
      
      // Remove event listener
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }

      // Stop native listener
      CallDetection.stopListening();

      // Stop foreground service on Android
      if (Platform.OS === 'android') {
        CallDetection.stopForegroundService();
      }

      setIsListening(false);
      setCurrentState('idle');
      syncCallState('idle');

      // Stop polling
      if (partnerPollingInterval.current) {
        clearInterval(partnerPollingInterval.current);
        partnerPollingInterval.current = null;
      }

    } catch (error) {
      console.error('Failed to stop call detection:', error);
    }
  }, [syncCallState]);

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      if (Platform.OS === 'ios') {
        setHasPermission(true);
        return;
      }

      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
        );
        setHasPermission(granted);
      } catch (error) {
        console.error('Permission check error:', error);
      }
    };

    if (isNativeModuleAvailable()) {
      checkPermission();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscription.current) {
        subscription.current.remove();
      }
      if (partnerPollingInterval.current) {
        clearInterval(partnerPollingInterval.current);
      }
    };
  }, []);

  return {
    isListening,
    currentState,
    partnerState,
    partnerStateUpdatedAt,
    isPartnerOnCall,
    startListening,
    stopListening,
    hasPermission,
    requestPermission,
  };
}

export default useCallDetection;

