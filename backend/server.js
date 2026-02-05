const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const os = require('os');
const cors = require('cors');
const path = require('path');
require('dotenv').config();


const app = express();
app.use(cors());

// Serve simulation files directly from the backend for easy access
app.use('/simulation', express.static(path.join(__dirname, '../simulation')));
app.use(express.static(path.join(__dirname, '../public'))); // Serve unified frontend at root


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin for cross-device testing
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // Allow large buffers if needed
});

// Room state
const rooms = {};

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', ({ room, role, username }) => {
        socket.join(room);

        // Track room details
        if (!rooms[room]) rooms[room] = { count: 0, hosts: 0, name: room };
        rooms[room].count++;
        if (role === 'host') rooms[room].hosts++;

        console.log(`Socket ${socket.id} joined room ${room} as ${role} (${username})`);

        // Notify others
        socket.to(room).emit('user-joined', { id: socket.id, role, username });

        // Broadcast updated room list to everyone (for the join screen)
        io.emit('room-list', Object.values(rooms));
    });

    socket.on('get-rooms', () => {
        socket.emit('room-list', Object.values(rooms));
    });

    // Audio Chunk Relay
    // Expected payload: { room: 'room-id', data: ArrayBuffer }
    socket.on('audio-chunk', (payload, callback) => {
        // Broadcast audio to everyone else in the room
        socket.to(payload.room).volatile.emit('audio-stream', {
            from: socket.id,
            // We can add username here if we track it in a socket-map
            data: payload.data
        });
        if (callback) callback();
    });

    socket.on('disconnecting', () => {
        // Cleanup room counts
        for (const room of socket.rooms) {
            if (rooms[room]) {
                rooms[room].count--;
                // If the room becomes empty, delete it
                if (rooms[room].count <= 0) {
                    delete rooms[room];
                } else {
                    // Notify others in the room that a user left
                    io.to(room).emit('user-left', { id: socket.id });
                }
            }
        }
        // Broadcast updated room list to everyone
        io.emit('room-list', Object.values(rooms));
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});


const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', async () => {
    const ip = getLocalIP();
    console.log(`\n=== HarmoniSync Server Running ===`);
    console.log(`Local:  http://localhost:${PORT}/index.html`);
    console.log(`LAN:    http://${ip}:${PORT}/index.html`);

    // 1. Start mDNS (Bonjour) for Auto-Discovery on LAN
    try {
        const { Bonjour } = require('bonjour-service');
        const bonjour = new Bonjour();
        bonjour.publish({ name: 'HarmoniSync', type: 'http', port: parseInt(PORT) });
        console.log(`Discovery: App is discoverable as 'HarmoniSync.local' on LAN`);
    } catch (err) {
        console.log(`Discovery: Auto-discovery (mDNS) could not start.`);
    }

    // 2. Start Localtunnel for Universal Access (Firewall-Punching)
    try {
        const localtunnel = require('localtunnel');
        const tunnel = await localtunnel({ port: parseInt(PORT) });
        console.log(`\n=== UNIVERSAL ACCESS LINK (No Firewall Required) ===`);
        console.log(`Public: ${tunnel.url}/index.html`);
        console.log(`Note: Give this link to anyone to join from anywhere!`);

        tunnel.on('close', () => {
            console.log('Universal link closed.');
        });
    } catch (err) {
        console.log(`\nUniversal Link: Could not establish a public tunnel (Localtunnel error).`);
    }

    console.log(`\nSimulation files at: /simulation/host.html & /simulation/listener.html`);
});


