import { initDraftSession, makePick, executeReroll, generateFinalJsonPayload } from './draftEngineServer.js';

// In-memory store for active rooms
const rooms = new Map();

// Helper to fetch Mojang UUID and avatar
export async function resolvePlayerIdentity(username) {
  const DEFAULT_STEVE_UUID = '8667da71-b8ad-4071-b04d-f4293260d732';
  if (!username || !username.trim()) {
    return {
      uuid: DEFAULT_STEVE_UUID,
      avatarUrl: `https://crafatar.com/avatars/${DEFAULT_STEVE_UUID}?size=64&overlay`,
    };
  }

  const cleanName = username.trim();
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(cleanName)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        return {
          uuid: data.id,
          avatarUrl: `https://crafatar.com/avatars/${data.id}?size=64&overlay`,
        };
      }
    }
  } catch (err) {
    console.warn(`[RoomManager] Mojang lookup error for ${cleanName}:`, err.message);
  }

  // Fallback deterministic mock UUID
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const mockUuid = `${hex}-0000-4000-8000-${hex}${hex}`;

  return {
    uuid: mockUuid,
    avatarUrl: `https://minotar.net/helm/${encodeURIComponent(cleanName)}/64.png`,
  };
}

export function generateRoomCode() {
  let code = '';
  do {
    code = `DF-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (rooms.has(code));
  return code;
}

export async function createRoom(socketId, hostData) {
  const roomCode = hostData.roomCode || generateRoomCode();
  const identity = await resolvePlayerIdentity(hostData.hostUsername);

  const hostPlayer = {
    id: socketId,
    socketId: socketId,
    username: hostData.hostUsername || 'HostSteve',
    uuid: identity.uuid,
    avatarUrl: identity.avatarUrl,
    isHost: true,
    isReady: true,
  };

  const newRoom = {
    roomCode,
    boardSize: hostData.boardSize || '5x5',
    turnTime: parseInt(hostData.turnTime, 10) || 15,
    players: [hostPlayer],
    inDraftPhase: false,
    draftState: null,
    turnTimer: null,
    remainingTime: 15,
  };

  rooms.set(roomCode, newRoom);
  return newRoom;
}

export async function joinRoom(socketId, joinData) {
  const roomCode = (joinData.roomCode || '').trim().toUpperCase();
  const room = rooms.get(roomCode);

  if (!room) {
    throw new Error(`Room '${roomCode}' does not exist.`);
  }

  if (room.players.length >= 4) {
    throw new Error(`Room '${roomCode}' is full (maximum 4 players).`);
  }

  if (room.inDraftPhase) {
    throw new Error(`Room '${roomCode}' has already started drafting.`);
  }

  const identity = await resolvePlayerIdentity(joinData.username);

  const newPlayer = {
    id: socketId,
    socketId: socketId,
    username: joinData.username || 'Player',
    uuid: identity.uuid,
    avatarUrl: identity.avatarUrl,
    isHost: false,
    isReady: true,
  };

  room.players.push(newPlayer);
  return room;
}

export function toggleReady(socketId, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const player = room.players.find(p => p.socketId === socketId);
  if (player) {
    player.isReady = !player.isReady;
  }
  return room;
}

export function updateRoomSettings(socketId, roomCode, { boardSize, turnTime }) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const hostPlayer = room.players.find(p => p.isHost);
  if (!hostPlayer || hostPlayer.socketId !== socketId) {
    return null;
  }

  if (room.inDraftPhase) {
    return null;
  }

  if (boardSize) {
    room.boardSize = boardSize;
  }
  if (turnTime) {
    room.turnTime = parseInt(turnTime, 10);
    room.remainingTime = room.turnTime;
  }

  return room;
}

export function leaveRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    const playerIndex = room.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== -1) {
      const [removedPlayer] = room.players.splice(playerIndex, 1);

      // CRITICAL: Destroy room when there's no player remaining
      if (room.players.length === 0) {
        destroyRoom(code);
        return { roomCode: code, destroyed: true, removedPlayer };
      }

      // Reassign host if the host left
      if (removedPlayer.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
      }

      return { roomCode: code, destroyed: false, room, removedPlayer };
    }
  }
  return null;
}

export function startDraft(socketId, roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found.');

  const hostPlayer = room.players.find(p => p.isHost);
  if (!hostPlayer || hostPlayer.socketId !== socketId) {
    throw new Error('Only the room host can start the draft.');
  }

  // Randomize picking order among connected players
  const randomizedPlayers = [...room.players].sort(() => 0.5 - Math.random());
  room.players = randomizedPlayers;
  room.draftState = initDraftSession(room.boardSize, randomizedPlayers);
  room.inDraftPhase = true;

  startTurnTimer(roomCode, io);
  return room;
}

export function handleMakePick(socketId, roomCode, selectedGoal, io) {
  const room = rooms.get(roomCode);
  if (!room || !room.inDraftPhase || !room.draftState) return null;

  const activePlayer = room.draftState.players[room.draftState.turnIndex];
  if (!activePlayer || activePlayer.socketId !== socketId) {
    return null; // Not active player's turn
  }

  room.draftState = makePick(room.draftState, selectedGoal);

  if (room.draftState.isComplete) {
    clearTurnTimer(room);
  } else {
    resetTurnTimer(roomCode, io);
  }

  return room;
}

export function handleExecuteReroll(socketId, roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room || !room.inDraftPhase || !room.draftState) return null;

  const activePlayer = room.draftState.players[room.draftState.turnIndex];
  if (!activePlayer || activePlayer.socketId !== socketId) {
    return null;
  }

  room.draftState = executeReroll(room.draftState, activePlayer.id);
  return room;
}

export function startTurnTimer(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearTurnTimer(room);
  room.remainingTime = room.turnTime;

  room.turnTimer = setInterval(() => {
    room.remainingTime -= 1;

    const activePlayer = room.draftState ? room.draftState.players[room.draftState.turnIndex] : null;

    io.to(roomCode).emit('turn_timer_tick', {
      remainingTime: room.remainingTime,
      activePlayerId: activePlayer ? activePlayer.id : null,
    });

    if (room.remainingTime <= 0) {
      // Time expired: Auto-pick first presented goal option
      if (room.draftState && room.draftState.currentOptions && room.draftState.currentOptions.length > 0) {
        const defaultGoal = room.draftState.currentOptions[0];
        room.draftState = makePick(room.draftState, defaultGoal);

        if (room.draftState.isComplete) {
          clearTurnTimer(room);
        } else {
          room.remainingTime = room.turnTime;
        }

        io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));
      }
    }
  }, 1000);
}

export function resetTurnTimer(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.remainingTime = room.turnTime;
}

export function clearTurnTimer(room) {
  if (room && room.turnTimer) {
    clearInterval(room.turnTimer);
    room.turnTimer = null;
  }
}

export function destroyRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (room) {
    clearTurnTimer(room);
    rooms.delete(roomCode);
    console.log(`[RoomManager] Room '${roomCode}' has no remaining players and was destroyed.`);
  }
}

export function getRoom(roomCode) {
  return rooms.get(roomCode);
}

export function sanitizeRoomState(room) {
  if (!room) return null;
  const { turnTimer, ...cleanRoom } = room;
  return cleanRoom;
}
