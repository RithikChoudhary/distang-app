# Codex Couples - Mobile App

A privacy-first couples app for Android & iOS built with React Native and Expo.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on physical device (optional)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
# or
expo start
```

### Running on Devices

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Physical device with Expo Go
# Scan QR code from terminal
```

### Configuration

Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:3000'  // Update with your machine's IP
  : 'https://api.codex-couples.com';
```

To find your local IP:
- Mac/Linux: `ifconfig | grep inet`
- Windows: `ipconfig`

## 📱 Features

### Authentication
- Email or phone number registration
- Secure password storage
- JWT token management with Expo SecureStore

### Couple Pairing
- Search users by unique ID
- Send/receive pair requests
- Accept/reject requests

### Consent Management
- Photo sharing toggle
- Memory access toggle
- Location sharing toggle
- All features require MUTUAL consent

### Shared Memories
- Upload photos with captions
- Grid gallery view
- Either partner can delete memories

### Location Sharing
- Manual "share now" button
- NO background tracking
- Location expires after 5 minutes

### Relationship Certificate
- Digital certificate with both names
- Export as PDF
- Clear "not a legal document" disclaimer

### Breakup Flow
- End relationship cleanly
- Memories are archived (not deleted)
- Optional anonymous feedback

## 📁 Project Structure

```
app/
├── App.tsx                 # Main app entry
├── index.js                # Expo entry point
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── ConsentToggle.tsx
│   │   └── MemoryCard.tsx
│   ├── screens/            # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── PairScreen.tsx
│   │   ├── ConsentScreen.tsx
│   │   ├── MemoryScreen.tsx
│   │   ├── CertificateScreen.tsx
│   │   ├── BreakupScreen.tsx
│   │   └── LocationScreen.tsx
│   ├── navigation/         # React Navigation setup
│   │   └── AppNavigator.tsx
│   ├── services/           # API layer
│   │   └── api.ts
│   ├── store/              # Zustand state management
│   │   └── authStore.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   └── utils/              # Theme and utilities
│       └── theme.ts
├── app.json                # Expo configuration
├── package.json
└── tsconfig.json
```

## 🎨 Design Principles

- **Soft, romantic color palette** - Warm rose primary, lavender secondary
- **Clean typography** - System fonts for performance
- **Clear consent toggles** - No dark patterns
- **Mobile-first** - Designed for phones only

## 🔐 Privacy Features

1. **Mutual Consent** - Every shared feature requires both partners to opt-in
2. **Instant Revocation** - Turning off consent immediately disables features
3. **No Spying** - We don't track app usage or background location
4. **Secure Storage** - Tokens stored in device secure storage

## 🛠️ Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development toolchain
- **TypeScript** - Type safety
- **Zustand** - Lightweight state management
- **React Navigation** - Navigation library
- **Axios** - HTTP client
- **Expo SecureStore** - Secure token storage
- **Expo Image Picker** - Photo selection
- **Expo Location** - Location services

## 📝 License

MIT

