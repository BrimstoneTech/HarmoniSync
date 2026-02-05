# 📶 Direct LAN Testing Guide

Since Localtunnel was unreliable, we are switching to **Direct LAN Testing**. This is faster, more stable, and works without any external passwords or internet connection.

## Step 1: Start the Server (PC)
1. Open PowerShell and run: `node backend/server.js`
2. **Copy the LAN Link**: (e.g., `http://192.168.0.124:8000/index.html`)

## Step 2: Connect Your Devices
Ensure your phone(s) and your PC are on the **Same WiFi Network**.

## Step 3: Solve the "Microphone" Problem (IMPORTANT)
Modern phones block the microphone on `http://` links (they only like `https://`). To bypass this for testing:

### For Android (Chrome/Edge):
1. Open Chrome on your phone.
2. Type this into the address bar and press Enter: **`chrome://flags/#unsafely-treat-insecure-origin-as-secure`**
3. In the box **"Insecure origins treated as secure"**, paste your server address:
   - `http://192.168.0.124:8000` (Use **your** IP from Step 1)
4. Change the dropdown from "Disabled" to **"Enabled"**.
5. Click **"Relaunch"** at the bottom.
6. Now, go to `http://192.168.0.124:8000` and the microphone will work perfectly!

---

## 🚀 Professional Deployment (Permanent Fix)
If you want a link that "just works" for everyone with HTTPS, the best solution is to deploy to a hosting service.

### Recommended: Render.com
1. Create a free account on [Render.com](https://render.com).
2. Connect your GitHub repository.
3. It will give you a permanent **HTTPS link** (e.g., `harmonisync.onrender.com`).
4. Microphones will work on all devices automatically without any "Friendly Reminders" or special flags.

---

## 🧪 Test Scenario (3 Devices)
1. **PC Host**: Go to `http://localhost:8000`. Create room "LAN_PARTY".
2. **Phone A**: Join the room using the LAN link. Speak.
3. **Phone B**: Join the room using the LAN link. Speak.
4. **Result**: Audio should sync instantly with zero "tunnel" lag!
