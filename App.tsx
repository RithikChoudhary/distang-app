import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';

/**
 * Codex Couples - A privacy-first couples app
 * 
 * Core Principles:
 * - Mutual consent required for all features
 * - No background tracking or spying
 * - Either partner can revoke consent anytime
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

