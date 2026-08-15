import { io } from 'socket.io-client';

// Socket connection URL (defaults to window.location.origin during Vite proxy development)
const SOCKET_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : '';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export function createRoomSocket(hostData) {
  return new Promise((resolve, reject) => {
    socket.emit('create_room', hostData, (response) => {
      if (response && response.success) {
        resolve(response.room);
      } else {
        reject(new Error(response?.error || 'Failed to create room'));
      }
    });
  });
}

export function joinRoomSocket(joinData) {
  return new Promise((resolve, reject) => {
    socket.emit('join_room', joinData, (response) => {
      if (response && response.success) {
        resolve(response.room);
      } else {
        reject(new Error(response?.error || 'Failed to join room'));
      }
    });
  });
}

export function toggleReadySocket(roomCode) {
  socket.emit('toggle_ready', { roomCode });
}

export function updateRoomSettingsSocket(roomCode, { boardSize, turnTime, goalPool }) {
  socket.emit('update_room_settings', { roomCode, boardSize, turnTime, goalPool });
}

export function startDraftSocket(roomCode) {
  return new Promise((resolve, reject) => {
    socket.emit('start_draft', { roomCode }, (response) => {
      if (response && response.success) {
        resolve();
      } else {
        reject(new Error(response?.error || 'Failed to start draft'));
      }
    });
  });
}

export function makePickSocket(roomCode, selectedGoal) {
  socket.emit('make_pick', { roomCode, selectedGoal });
}

export function executeRerollSocket(roomCode) {
  socket.emit('execute_reroll', { roomCode });
}

export function leaveRoomSocket() {
  socket.emit('leave_room');
}
