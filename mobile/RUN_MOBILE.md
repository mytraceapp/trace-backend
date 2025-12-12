# How to Run the TRACE Mobile App

## Prerequisites
- Install **Expo Go** app on your iPhone (from App Store)

## Start the Mobile App

**Option 1: From Replit**
1. Look for the "Mobile App" workflow in the console panel
2. The QR code will appear in the workflow output
3. Scan it with your iPhone camera

**Option 2: Manual command**
```bash
cd mobile
npx expo start --tunnel
```

## Finding the QR Code

The QR code appears in the terminal/console output after running the start command.
It looks like this:
```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▄▄██████▄██▄▄█ ▄▄▄▄▄ █
...
```

Below it you'll see:
```
› Metro waiting on exp://...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

## Troubleshooting

If the QR code doesn't appear:
1. Make sure ngrok is installed: `npm install @expo/ngrok`
2. Clear cache: `npx expo start --tunnel --clear`
3. Check that port 8081 is available
