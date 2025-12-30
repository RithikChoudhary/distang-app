import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import {
  WelcomeScreen,
  SignupScreen,
  OTPVerifyScreen,
  OnboardingScreen,
  NewLoginScreen,
  HomeScreen,
  PairScreen,
  ConsentScreen,
  MemoryScreen,
  BreakupScreen,
  LocationScreen,
  ChatScreen,
  CalendarScreen,
  SettingsScreen,
  HelpScreen,
  TermsScreen,
  GamesScreen,
  TicTacToeScreen,
  ConnectFourScreen,
  WordGuessScreen,
  EditProfileScreen,
  NotificationsScreen,
  FavoritesScreen,
  PartnerProfileScreen,
} from '../screens';
import { colors } from '../utils/theme';

// Type definitions for navigation
export type RootStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  Login: undefined;
  OTPVerify: {
    email: string;
    name: string;
    username: string;
    phoneNumber?: string;
    type: 'signup' | 'login';
  };
  Onboarding: undefined;
  Home: undefined;
  Pair: undefined;
  Consent: undefined;
  Memory: undefined;
  Breakup: undefined;
  Location: undefined;
  Chat: undefined;
  Calendar: undefined;
  Settings: undefined;
  Help: undefined;
  Terms: undefined;
  Games: undefined;
  TicTacToe: undefined;
  ConnectFour: undefined;
  WordGuess: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  Favorites: undefined;
  PartnerProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth Stack (not authenticated)
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="Login" component={NewLoginScreen} />
    <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
  </Stack.Navigator>
);

// App Stack (authenticated)
const AppStack = () => {
  const { user } = useAuthStore();
  
  // Check if user needs to complete profile
  const initialRoute = user?.isProfileComplete === false ? 'Onboarding' : 'Home';
  
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Memory"
        component={MemoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Pair"
        component={PairScreen}
        options={{ title: 'Find Partner' }}
      />
      <Stack.Screen
        name="Consent"
        component={ConsentScreen}
        options={{ title: 'Privacy & Consent' }}
      />
      <Stack.Screen
        name="Breakup"
        component={BreakupScreen}
        options={{ title: 'End Relationship' }}
      />
      <Stack.Screen
        name="Location"
        component={LocationScreen}
        options={{ title: 'Share Location' }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'Important Dates' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Games"
        component={GamesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TicTacToe"
        component={TicTacToeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ConnectFour"
        component={ConnectFourScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WordGuess"
        component={WordGuessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartnerProfile"
        component={PartnerProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Loading Screen
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

// Main Navigator
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
