
const app = {
    socket: null,
    audioCtx: null,
    role: null,
    username: 'Guest',
    currentRoom: null,
    mediaStream: null,
    worklet: null,
    enhanceEnabled: false,

    init: () => {
        // Connect to IO immediately to get room lists
        app.socket = io();

        app.socket.on('connect', () => {
            console.log('Connected to server');
            app.socket.emit('get-rooms');
        });

        app.socket.on('room-list', (rooms) => {
            app.renderRoomList(rooms);
        });

        app.socket.on('audio-stream', (packet) => {
            app.playAudio(packet.data);
            app.showSpeaker(packet.from);
        });

        app.socket.on('room-update', (data) => {
            app.renderParticipants(data.users);
        });

        app.socket.on('kicked', (data) => {
            alert(data.reason);
            app.leaveRoom();
        });

        app.socket.on('user-joined', (data) => {
            console.log("User joined:", data.username);
        });

        app.socket.on('joined', (data) => {
            console.log("Joined room:", data.room);
        });

        // Setup Visuals
        app.setupVisualizer();
    },

    nav: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    },

    createRoom: () => {
        const name = document.getElementById('username').value || 'Guest';
        const roomInput = document.getElementById('new-room-name').value;
        const roomName = roomInput || params.generateRoomName();

        app.role = 'host';
        app.username = name;
        app.join(roomName);
    },

    joinRoom: (roomName) => {
        const name = document.getElementById('username').value || 'Guest';
        if (!roomName) {
            // Manual IP Entry logic fallback
            const ip = document.getElementById('room-ip').value;
            if (ip && ip !== window.location.hostname) {
                window.location.href = `http://${ip}:8000/public/index.html`;
                return;
            }
            alert("Please select a room or enter an IP");
            return;
        }
        app.role = 'listener';
        app.username = name;
        app.join(roomName);
    },

    join: (room) => {
        app.currentRoom = room;
        app.socket.emit('join', { room, role: app.role, username: app.username });

        document.getElementById('room-id-display').innerText = room;

        // Show/Hide Host Panel
        const hostPanel = document.getElementById('host-panel');
        if (app.role === 'host') {
            hostPanel.classList.remove('hidden');
        } else {
            hostPanel.classList.add('hidden');
        }

        app.nav('view-room');

        // Start Audio Context
        app.initAudio();
    },

    participants: [],

    renderParticipants: (users) => {
        app.participants = users;
        const list = document.getElementById('participant-list');
        if (!list) return;

        list.innerHTML = '';
        users.forEach(u => {
            const badge = document.createElement('div');
            badge.className = `participant-badge ${u.role === 'host' ? 'badge-host' : ''}`;
            badge.innerHTML = `
                <div class="role-dot"></div>
                <span>${u.username} ${u.id === app.socket.id ? '(You)' : ''}</span>
            `;
            list.appendChild(badge);
        });
    },

    endSession: () => {
        if (confirm("Are you sure you want to end this session for everyone?")) {
            app.socket.emit('session-end', app.currentRoom);
        }
    },

    leaveRoom: () => {
        window.location.reload();
    },

    renderRoomList: (rooms) => {
        const list = document.getElementById('room-list-container');
        if (!list) return;

        list.innerHTML = '';
        if (rooms.length === 0) {
            list.innerHTML = '<div style="color:#777; font-style:italic;">No active rooms found. Create one!</div>';
            return;
        }

        rooms.forEach((r) => {
            const div = document.createElement('div');
            div.className = 'room-item';
            div.innerHTML = `
                <div class="room-info">
                    <strong>${r.name}</strong>
                    <span>${r.count} users</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="app.joinRoom('${r.name}')">Join</button>
            `;
            list.appendChild(div);
        });
    },

    // --- Audio Logic ---
    initAudio: async () => {
        app.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        await app.audioCtx.resume();

        const btn = document.getElementById('talk-btn');
        btn.onclick = app.toggleTalk;

        // Clear PTT listeners
        btn.onmousedown = null;
        btn.onmouseup = null;
        btn.ontouchstart = null;
        btn.ontouchend = null;
    },

    toggleTalk: async () => {
        if (!app.isSpeaking) {
            await app.startTalking();
        } else {
            app.stopTalking();
        }
    },

    isSpeaking: false,

    startTalking: async () => {
        if (!app.audioCtx) await app.initAudio();
        if (app.audioCtx.state === 'suspended') await app.audioCtx.resume();

        try {
            app.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = app.audioCtx.createMediaStreamSource(app.mediaStream);
            const processor = app.audioCtx.createScriptProcessor(4096, 1, 1);

            let lastNode = source;

            // Apply Enhancement Chain if enabled
            if (app.enhanceEnabled) {
                // 1. High Pass Filter (Removes background rumble/hum)
                const filter = app.audioCtx.createBiquadFilter();
                filter.type = "highpass";
                filter.frequency.setValueAtTime(100, app.audioCtx.currentTime);

                // 2. Compressor (Normalizes volume, prevents clipping)
                const compressor = app.audioCtx.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(-24, app.audioCtx.currentTime);
                compressor.knee.setValueAtTime(40, app.audioCtx.currentTime);
                compressor.ratio.setValueAtTime(12, app.audioCtx.currentTime);
                compressor.attack.setValueAtTime(0, app.audioCtx.currentTime);
                compressor.release.setValueAtTime(0.25, app.audioCtx.currentTime);

                lastNode.connect(filter);
                filter.connect(compressor);
                lastNode = compressor;

                app.filterNodes = { filter, compressor };
            }

            lastNode.connect(processor);
            // Critical: MUST connect to destination to trigger onaudioprocess on some browsers
            processor.connect(app.audioCtx.destination);

            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                if (app.socket) {
                    app.socket.emit('audio-chunk', {
                        room: app.currentRoom,
                        data: input.buffer
                    });
                }
                app.visualize(input);
            };

            app.worklet = { source, processor };
            app.isSpeaking = true;

            const btn = document.getElementById('talk-btn');
            btn.classList.add('btn-speaking');
            btn.querySelector('span').innerText = 'STOP SPEAKING';

        } catch (e) {
            console.error("Microphone Error:", e);
            alert("Mic Access Denied or Origin Insecure. Check TEST_GUIDE_LAN.md");
        }
    },

    stopTalking: () => {
        if (app.mediaStream) app.mediaStream.getTracks().forEach(t => t.stop());
        if (app.worklet) {
            app.worklet.processor.disconnect();
            app.worklet.source.disconnect();
        }
        if (app.filterNodes) {
            app.filterNodes.filter.disconnect();
            app.filterNodes.compressor.disconnect();
            app.filterNodes = null;
        }
        app.isSpeaking = false;

        const btn = document.getElementById('talk-btn');
        btn.classList.remove('btn-speaking');
        btn.querySelector('span').innerText = 'TAP TO SPEAK';
    },

    toggleEnhancement: () => {
        app.enhanceEnabled = document.getElementById('enhance-toggle').checked;
        console.log("Audio Enhancement:", app.enhanceEnabled);
        // If speaking, restart to apply filters
        if (app.isSpeaking) {
            app.stopTalking();
            app.startTalking();
        }
    },


    playAudio: (buffer) => {
        if (!app.audioCtx) return;
        const floatData = new Float32Array(buffer);
        const b = app.audioCtx.createBuffer(1, floatData.length, app.audioCtx.sampleRate);
        b.copyToChannel(floatData, 0);

        const source = app.audioCtx.createBufferSource();
        source.buffer = b;
        source.connect(app.audioCtx.destination);
        source.start(0);

        app.visualize(floatData);
    },

    showSpeaker: (id) => {
        const el = document.getElementById('speaking-display');
        const nameEl = document.getElementById('speaker-name');
        el.classList.remove('hidden');

        // Find username from participants list
        const user = app.participants.find(u => u.id === id);
        nameEl.innerText = user ? user.username : id.substr(0, 4);

        clearTimeout(app.speakerTimeout);
        app.speakerTimeout = setTimeout(() => {
            el.classList.add('hidden');
        }, 1000);
    },

    // --- Visuals ---
    setupVisualizer: () => {
        app.canvas = document.getElementById('visualizer');
        app.ctx = app.canvas.getContext('2d');
    },

    visualize: (data) => {
        const ctx = app.ctx;
        const w = app.canvas.width;
        const h = app.canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#00ff88';

        const space = 2; // px
        const barWidth = 4;
        const step = Math.floor(data.length / (w / (barWidth + space)));

        let x = 0;
        for (let i = 0; i < data.length; i += step) {
            const v = Math.abs(data[i]);
            const barH = v * h * 2;
            ctx.fillRect(x, h - barH, barWidth, barH);
            x += barWidth + space;
        }
    }
};

const params = {
    generateRoomName: () => "Room-" + Math.floor(Math.random() * 1000)
};

// Start
window.onload = app.init;
