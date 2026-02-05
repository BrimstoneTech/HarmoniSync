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

    socket.on('join', (payload) => {
        const { room, role, username } = payload;

        // Track room details
        if (!rooms[room]) rooms[room] = { count: 0, hosts: 0, name: room, users: [], pending: [] };

        if (role === 'host') {
            joinRoomInternal(socket, room, role, username);
            // If there are pending users, notify the new host
            rooms[room].pending.forEach(u => {
                socket.emit('join-request', u);
            });
        } else {
            // Listeners ALWAYS need approval
            console.log(`User ${username} (${socket.id}) queued for room ${room}`);
            rooms[room].pending.push({ id: socket.id, username });

            // Notify hosts in the room if they exist
            socket.to(room).emit('join-request', { id: socket.id, username });
            socket.emit('waiting-room', { room });
        }
    });

    function joinRoomInternal(socket, room, role, username) {
        socket.join(room);

        if (!rooms[room]) rooms[room] = { count: 0, hosts: 0, name: room, users: [], pending: [] };
        rooms[room].count++;
        if (role === 'host') rooms[room].hosts++;

        // Add user to participant list
        rooms[room].users.push({ id: socket.id, username, role });

        console.log(`Socket ${socket.id} joined room ${room} as ${role} (${username})`);

        // Notify room members with updated participant list
        io.to(room).emit('room-update', {
            name: room,
            users: rooms[room].users
        });

        // Broadcast approved state to the user
        socket.emit('approved', { room, role });

        // Broadcast updated room list to everyone (for the join screen)
        io.emit('room-list', Object.values(rooms));
    }

    socket.on('approve-user', ({ room, userId }) => {
        const pendingUser = rooms[room]?.pending.find(u => u.id === userId);
        if (pendingUser) {
            rooms[room].pending = rooms[room].pending.filter(u => u.id !== userId);
            const targetSocket = io.sockets.sockets.get(userId);
            if (targetSocket) {
                joinRoomInternal(targetSocket, room, 'listener', pendingUser.username);
            }
        }
    });

    socket.on('deny-user', ({ room, userId }) => {
        rooms[room].pending = rooms[room].pending.filter(u => u.id !== userId);
        const targetSocket = io.sockets.sockets.get(userId);
        if (targetSocket) {
            targetSocket.emit('denied', { reason: 'The host has denied your join request.' });
        }
    });

    socket.on('get-rooms', () => {
        socket.emit('room-list', Object.values(rooms));
    });

    // Host Controls
    socket.on('session-end', (room) => {
        // Simple trust-based check: in a real app, we'd verify the socket.id is the host
        io.to(room).emit('kicked', { reason: 'Host ended the session' });
        console.log(`Room ${room} ended by host.`);
        delete rooms[room];
        io.emit('room-list', Object.values(rooms));
    });

    // Audio Chunk Relay
    // Expected payload: { room: 'room-id', data: ArrayBuffer }
    socket.on('audio-chunk', (payload, callback) => {
        // console.log(`Audio chunk from ${socket.id} for room ${payload.room}`);
        // Broadcast audio to everyone else in the room
        socket.to(payload.room).volatile.emit('audio-stream', {
            from: socket.id,
            data: payload.data
        });
        if (callback) callback();
    });

    socket.on('disconnecting', () => {
        // Cleanup room counts
        for (const room of socket.rooms) {
            if (rooms[room]) {
                rooms[room].count--;
                // Remove user from the list
                rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);

                // If the room becomes empty, delete it
                if (rooms[room].count <= 0) {
                    delete rooms[room];
                } else {
                    // Update remaining users
                    io.to(room).emit('room-update', {
                        name: room,
                        users: rooms[room].users
                    });
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

    // 2. Start UPnP (Automatic Port Forwarding)
    try {
        const natUpnp = require('nat-upnp');
        const client = natUpnp.createClient();

        client.portMapping({
            public: parseInt(PORT),
            private: parseInt(PORT),
            ttl: 0
        }, (err) => {
            if (err) {
                console.log(`UPnP: Port forwarding could not be established automatically (Check router settings).`);
            } else {
                console.log(`UPnP: Port ${PORT} has been successfully forwarded on your router.`);
            }
        });

        // Cleanup on exit
        process.on('SIGINT', () => {
            client.portUnmapping({ public: parseInt(PORT) });
            process.exit();
        });
    } catch (err) {
        console.log(`UPnP: Error initializing port forwarding.`);
    }

    console.log(`\nSimulation files at: /simulation/host.html & /simulation/listener.html`);
});


