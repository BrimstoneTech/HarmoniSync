
const app = {
    socket: null,
    audioCtx: null,
    role: null,
    username: 'Guest',
    currentRoom: null,
    mediaStream: null,
    worklet: null,

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
        app.nav('view-room');

        // Start Audio Context
        app.initAudio();
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

            source.connect(processor);
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
        app.isSpeaking = false;

        const btn = document.getElementById('talk-btn');
        btn.classList.remove('btn-speaking');
        btn.querySelector('span').innerText = 'TAP TO SPEAK';
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
        nameEl.innerText = id.substr(0, 4); // Use logic to map ID to Name later

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
