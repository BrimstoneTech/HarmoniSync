# 🎙️ Multi-Device Initialization Test

Follow this exact process to verify that **Microphone Permissions** and **Audio Relay** work across multiple different devices simultaneously.

## Setup Diagram
- **PC (Host)**: Acts as the Server and the Room Leader.
- **Phone A (Guest)**: Listener/Speaker.
- **Phone B (Guest)**: Listener/Speaker.

---

## Step 1: Start the Server (PC)
1. Open PowerShell and run: `node backend/server.js`
2. **Copy the Public Link** (e.g., `https://harmonisync-7760.loca.lt/index.html`)
3. **Note the Password**: (e.g., `41.75.185.73`)

---

## Step 2: Initialize Device 1 (PC Host)
1. In Chrome/Edge on your PC, go to `http://localhost:8000`.
2. Enter Name: **"BOSS"** and click **"Create New Room"**.
3. **Mic Check**: Click **"Allow"** when the browser asks.
4. **Verification**: Confirm the green visualizer at the bottom moves when you hum.

---

## Step 3: Initialize Device 2 (Mobile Phone A)
1. Open the **Public Link** on Phone A.
2. Enter the **Tunnel Password** (41.75.185.73) and submit.
3. Enter Name: **"MOBILE_1"** and find the room "BOSS" created.
4. Click **"Join"**.
5. **Mic Check**: Click the **"Hold to Speak"** button. If the browser asks for mic access, click **"Allow"**.
6. **PTT Test**: Hold the button and speak.
   - ✅ **Verification**: You should hear your voice coming from the **PC Speakers**.
   - ✅ **Verification**: The PC screen should show **"Who's Speaking: MOBI..."**

---

## Step 4: Initialize Device 3 (Mobile Phone B)
1. Open the **Public Link** on Phone B.
2. Enter Name: **"MOBILE_2"** and Join the room.
3. **Mic Check**: Grant permissions if prompted.
4. **Full Network Test**:
   - Hold the button on **Phone B** and speak.
   - ✅ **Verification**: Both the **PC** and **Phone A** should hear your voice.
   - ✅ **Verification**: Every listener's screen should update the "Who is Speaking" indicator.

---

## 🛠️ Critical Troubleshooting for Multi-Device
- **Feedback Loop**: If devices are in the same room, you will get loud screeching (feedback). Test from different rooms or use **headphones** on all mobile devices.
- **Mic Permission Denied**: If a user accidentally clicked "Block", they must go to browser settings -> Site Settings -> Microphone -> Allow `loca.lt`.
- **Latency**: Expect a small delay (0.5s - 1s) due to the Localtunnel processing. This is normal for a relay system.

---

## ✅ Ready to Proceed?
Once you've confirmed:
1. Microphone icon appears in the browser tab.
2. Visualizer moves when you speak.
3. Audio is heard on the other device.

...then we are 100% ready to push to GitHub!
