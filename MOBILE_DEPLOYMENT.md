# 🔒 Security & Mobile Deployment Guide

## ✅ Security Hardening Completed

### What We Secured

1. **No Hardcoded Secrets**: Audit confirmed no passwords, API keys, or secrets in code
2. **Environment Variables**: Created `.env.example` template for configuration
3. **Enhanced .gitignore**: Added patterns to protect:
   - Environment files (`.env`, `.env.local`)
   - Certificates and keys (`*.key`, `*.pem`, `*.p12`)
   - Mobile provisioning profiles
   - Build artifacts (`android/`, `ios/`)
   - Credentials directory

### Files Protected from Git

```gitignore
# Secrets
.env
*.key, *.pem, *.p12
config/secrets.json

# Mobile builds
android/, ios/, www/

# Certificates
*.cert, *.crt, *.cer
```

---

## 📱 Mobile Wrapper Setup

### Technology: Capacitor

We're using **Capacitor** (by Ionic) to wrap the web app as a native mobile app.

**Why Capacitor?**
- ✅ Modern, maintained by Ionic team
- ✅ Direct access to native APIs
- ✅ Easy to configure and deploy
- ✅ Works with existing web code
- ✅ Smaller APK size than alternatives

### Project Structure

```
HarmoniSync/
├── public/              # Web app (served in mobile wrapper)
├── backend/             # Node.js server (runs separately)
├── android/             # Auto-generated Android project
├── capacitor.config.json # Capacitor configuration
└── package.json         # Capacitor dependencies
```

---

## 🚀 Mobile Deployment Steps

### Step 1: Install Dependencies

```powershell
cd "C:\Users\Administrator\Documents\THESE ARE MY PROJECTS\HarmoniSync"
npm install
```

This installs Capacitor CLI and Android platform.

### Step 2: Initialize Android Project

```powershell
npx cap add android
```

This creates the `android/` folder with a complete Android Studio project.

### Step 3: Sync Web Assets

Whenever you change your web app:

```powershell
npx cap sync
```

This copies `public/` files to the Android project.

### Step 4: Open in Android Studio

```powershell
npx cap open android
```

This launches Android Studio with your project.

### Step 5: Build & Test

**In Android Studio:**
1. Connect your Android device via USB (or use emulator)
2. Enable **Developer Options** and **USB Debugging** on your device
3. Click **Run** (▶️) button
4. Select your device
5. Wait for build and installation

---

## 🔧 Configuration Details

### Server Connection

The mobile app is configured to connect to:
```json
"server": {
  "url": "http://localhost:8000",
  "cleartext": true
}
```

**For LAN Testing:**
1. Find your computer's IP (shown in server console)
2. Update `capacitor.config.json`:
   ```json
   "url": "http://192.168.0.124:8000"
   ```
3. Run `npx cap sync`
4. Rebuild the app

### App Identity

```json
"appId": "com.harmonisync.app",
"appName": "HarmoniSync"
```

Change these before publishing to Play Store.

---

## 📋 Pre-GitHub Checklist

Before pushing to GitHub, ensure:

- [x] No secrets in code (✅ Verified)
- [x] `.env.example` created
- [x] `.gitignore` updated
- [ ] Mobile app tested on device
- [ ] All features working
- [ ] Backend server accessible from mobile
- [ ] Audio streaming works on mobile
- [ ] UI responsive on mobile screen

---

## 🧪 Testing Workflow

### 1. Start Backend Server

```powershell
node backend/server.js
```

Server runs at: `http://192.168.0.124:8000`

### 2. Test on Mobile

1. Launch app on Android device
2. Should connect to server automatically
3. Create/join rooms
4. Test push-to-talk functionality
5. Verify audio streaming works

### 3. Common Issues

**Issue**: App can't connect to server
- **Fix**: Check `capacitor.config.json` has correct IP
- **Fix**: Ensure firewall allows port 8000
- **Fix**: Device on same WiFi as server

**Issue**: Microphone not working
- **Fix**: Grant microphone permission in Android settings
- **Fix**: Check browser console in Android Studio (Logcat)

**Issue**: Audio not playing
- **Fix**: Check speaker/volume on device
- **Fix**: Test with headphones

---

## 📦 Building APK for Distribution

### Debug APK (for testing)

```powershell
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for production)

1. Generate keystore:
   ```powershell
   keytool -genkey -v -keystore my-release-key.keystore -alias harmonisync -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure signing in `android/app/build.gradle`

3. Build:
   ```powershell
   cd android
   ./gradlew assembleRelease
   ```

---

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Add Android platform**: `npx cap add android`
3. **Test on device**: Deploy and verify all features
4. **Refine UI**: Adjust for mobile screen if needed
5. **Final security check**: Review all files before GitHub push
6. **Push to GitHub**: Once confident everything works

---

## 📝 Notes

- The `android/` and `ios/` folders are **ignored by Git** (in `.gitignore`)
- Keep `.env.example` updated when adding new config
- Never commit `.env` or `*.key` files
- Test thoroughly on mobile before going public
