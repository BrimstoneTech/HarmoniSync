# HarmoniSync 🎵

A real-time audio distribution system for seamless multi-device communication.

## Features

- **Multi-Device Audio Streaming**: Host-Listener model for broadcasting audio
- **Push-to-Talk**: Intuitive PTT interface for controlled audio transmission
- **Room Management**: Create and join audio rooms dynamically
- **Premium UI**: Glassmorphism design with neon accents and smooth animations
- **Real-time Communication**: Socket.io powered WebSocket connections
- **LAN Support**: Share audio across devices on the same network

## Tech Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Audio**: Web Audio API
- **Real-time**: Socket.io (WebSockets)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/HarmoniSync.git
cd HarmoniSync
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Start the server:
```bash
node server.js
```

4. Open in browser:
```
http://localhost:8000/index.html
```

## Usage

### Host
1. Enter your name
2. Create a new room (or use auto-generated name)
3. Hold "Hold to Speak" button to broadcast audio

### Listener
1. Enter your name
2. Select a room from the active rooms list
3. Click "Join"
4. Listen to audio from other participants

## LAN Access

To allow devices on your local network to connect:

1. Find your local IP address (shown in server console)
2. Share the LAN URL: `http://YOUR_IP:8000/index.html`
3. Ensure Windows Firewall allows port 8000 (see Troubleshooting)

## Troubleshooting

### Firewall Configuration (Windows)
If LAN access is blocked, add a firewall rule:
```powershell
netsh advfirewall firewall add rule name="HarmoniSync Server" dir=in action=allow protocol=TCP localport=8000
```

### Port Already In Use
Kill the process using port 8000:
```powershell
netstat -ano | findstr :8000
taskkill /F /PID <PID>
```

## Project Structure

```
HarmoniSync/
├── backend/
│   ├── server.js          # Node.js + Socket.io server
│   ├── server.py          # Legacy Python WebSocket server
│   └── package.json       # Dependencies
├── public/
│   ├── index.html         # Main SPA interface
│   ├── app.js             # Frontend logic
│   ├── styles.css         # Glassmorphism UI
│   └── assets/            # SVG icons and decorations
└── simulation/
    ├── host.html          # Legacy host interface
    └── listener.html      # Legacy listener interface
```

## License

MIT

## Author
TaiSan - BrimstoneTech - Founder

Your Name
