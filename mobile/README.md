# TRACE Mobile App

Mobile app lives here. Do not edit the web app.

This is the React Native (Expo) version of TRACE. The web app remains untouched outside this folder.

## Quick Start

```bash
cd mobile
npx expo start --tunnel
```

Scan the QR code with Expo Go on your iPhone.

## Structure

```
mobile/
├── app/              # expo-router screens
│   ├── (tabs)/       # Tab navigation screens
│   ├── _layout.tsx   # Root layout
│   └── index.tsx     # Entry redirect
├── components/       # Reusable components
├── constants/        # Theme tokens (colors, typography, spacing)
├── lib/              # Supabase client, helpers
└── assets/           # Audio, images
```

## Environment Variables

Create these in your Expo environment or `.env`:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
