import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  updateRoomSettings,
  startDraft,
  handleMakeBan,
  handleMakePick,
  handleExecuteReroll,
  resolvePlayerIdentity,
  sanitizeRoomState,
  getRoom
} from './roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets and production build from dist folder if present
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// REST API for Mojang Username Resolution
app.get('/api/mojang/uuid/:username', async (req, res) => {
  try {
    const identity = await resolvePlayerIdentity(req.params.username);
    res.json(identity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io Real-time Event Handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Create Room Event
  socket.on('create_room', async (data, callback) => {
    try {
      const room = await createRoom(socket.id, data || {});
      socket.join(room.roomCode);

      const cleanState = sanitizeRoomState(room);
      io.to(room.roomCode).emit('room_state_updated', cleanState);

      if (typeof callback === 'function') {
        callback({ success: true, room: cleanState });
      }
    } catch (err) {
      console.error('[Socket] create_room error:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Join Room Event
  socket.on('join_room', async (data, callback) => {
    try {
      const room = await joinRoom(socket.id, data || {});
      socket.join(room.roomCode);

      const cleanState = sanitizeRoomState(room);
      io.to(room.roomCode).emit('room_state_updated', cleanState);

      if (typeof callback === 'function') {
        callback({ success: true, room: cleanState });
      }
    } catch (err) {
      console.error('[Socket] join_room error:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Toggle Ready Event
  socket.on('toggle_ready', ({ roomCode }) => {
    const room = toggleReady(socket.id, roomCode);
    if (room) {
      io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));
    }
  });

  // Update Room Settings Event (Host Only)
  socket.on('update_room_settings', ({ roomCode, boardSize, turnTime, goalPool, enableBanPhase, bansPerPlayer }) => {
    const room = updateRoomSettings(socket.id, roomCode, { boardSize, turnTime, goalPool, enableBanPhase, bansPerPlayer });
    if (room) {
      io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));
    }
  });

  // Start Draft / Match Event
  socket.on('start_draft', ({ roomCode }, callback) => {
    try {
      const room = startDraft(socket.id, roomCode, io);
      const cleanState = sanitizeRoomState(room);
      io.to(roomCode).emit('draft_started', cleanState);
      io.to(roomCode).emit('room_state_updated', cleanState);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('[Socket] start_draft error:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Make Goal Ban Event
  socket.on('make_ban', ({ roomCode, categoryId }) => {
    const room = handleMakeBan(socket.id, roomCode, categoryId, io);
    if (room) {
      io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));
    }
  });

  // Make Goal Pick Event
  socket.on('make_pick', ({ roomCode, selectedGoal }) => {
    const room = handleMakePick(socket.id, roomCode, selectedGoal, io);
    if (room) {
      io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));
    }
  });

  // Execute Reroll Event
  socket.on('execute_reroll', ({ roomCode }) => {
    const room = handleExecuteReroll(socket.id, roomCode, io);
    if (room) {
      io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));
    }
  });

  // Leave Room Explicitly
  socket.on('leave_room', () => {
    handlePlayerDisconnect(socket);
  });

  // Disconnect Event
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    handlePlayerDisconnect(socket);
  });
});

function handlePlayerDisconnect(socket) {
  const result = leaveRoom(socket.id);
  if (result) {
    const { roomCode, destroyed, room } = result;
    if (destroyed) {
      console.log(`[Server] Room '${roomCode}' destroyed after all players disconnected.`);
    } else if (room) {
      socket.leave(roomCode);
      io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));
    }
  }
}

// SPA Fallback for Client Routing in Production
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`[DraftBoard Server] Listening on http://localhost:${PORT}`);
});
