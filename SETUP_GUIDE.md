# LAN Access & Git Installation Guide

## Step 1: Fix LAN Access (Windows Firewall)

The firewall command requires **administrator privileges**. Here are two methods:

### Method A: PowerShell (Administrator)

1. **Right-click** on PowerShell in Start menu
2. Select **"Run as Administrator"**
3. Navigate to your project:
   ```powershell
   cd "C:\Users\Administrator\Documents\THESE ARE MY PROJECTS\HarmoniSync"
   ```
4. Run the firewall command:
   ```powershell
   netsh advfirewall firewall add rule name="HarmoniSync Server" dir=in action=allow protocol=TCP localport=8000
   ```
5. You should see: **"Ok."**

### Method B: Windows Firewall GUI

1. Press **Win + R**, type `wf.msc`, press Enter
2. Click **"Inbound Rules"** in left panel
3. Click **"New Rule..."** in right panel
4. Select **"Port"** → Next
5. Select **"TCP"**, enter **8000** in "Specific local ports" → Next
6. Select **"Allow the connection"** → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name: **HarmoniSync Server** → Finish

### Test LAN Access

After adding the rule:
1. On another device (phone/laptop) connected to the same WiFi
2. Open browser to: `http://192.168.0.124:8000/index.html`
3. You should see the HarmoniSync interface

---

## Step 2: Install Git

### Download Git

1. Open browser: **https://git-scm.com/download/win**
2. Click **"Click here to download"** (64-bit installer)
3. Run the downloaded `.exe` file

### Installation Steps

Follow the installer with these **recommended settings**:

1. **Select Components**: ✅ All defaults are fine
2. **Default editor**: Choose your preferred editor (VS Code, Notepad++)
3. **PATH environment**: ✅ **"Git from the command line and also from 3rd-party software"** (recommended)
4. **HTTPS transport**: ✅ Use bundled OpenSSL
5. **Line ending conversions**: ✅ Checkout Windows-style, commit Unix-style
6. **Terminal emulator**: ✅ Use MinTTY (recommended)
7. **Default branch name**: `main` (modern standard)
8. Continue with all other defaults

### Verify Installation

1. **Close and reopen** your terminal (PowerShell)
2. Run:
   ```powershell
   git --version
   ```
3. Should see something like: `git version 2.x.x.windows.x`

---

## Step 3: Initialize Git Repository

Once Git is installed, run these commands in your project directory:

```powershell
cd "C:\Users\Administrator\Documents\THESE ARE MY PROJECTS\HarmoniSync"

# Initialize repository
git init

# Configure your identity (first time only)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: HarmoniSync audio distribution system"

# Check status
git status
```

---

## Step 4: Create GitHub Repository

1. Go to **https://github.com/new**
2. Repository name: **HarmoniSync**
3. Description: *"Real-time audio distribution system for multi-device communication"*
4. Visibility: **Public** or **Private** (your choice)
5. **DO NOT** initialize with README (we already have one)
6. Click **"Create repository"**

---

## Step 5: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```powershell
# Link to your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/HarmoniSync.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Note**: Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Troubleshooting

### Git authentication
If prompted for credentials, use a **Personal Access Token** (not password):
1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
2. Select scopes: `repo` (full control)
3. Use the token as your password when pushing

### Firewall still blocking
- Restart the Node.js server after adding the firewall rule
- Check Windows Defender settings aren't blocking the app
- Temporarily disable antivirus to test (re-enable after)

---

## Verification Checklist

- [ ] Firewall rule added successfully
- [ ] LAN access works from another device
- [ ] Git installed and verified
- [ ] Repository initialized
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
