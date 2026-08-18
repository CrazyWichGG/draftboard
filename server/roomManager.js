import {
  initDraftSession,
  makePick,
  executeReroll,
  generateFinalJsonPayload,
  getGoalCategories
} from './draftEngineServer.js';

// In-memory store for active rooms
const rooms = new Map();

const BAN_TURN_TIME = 60;
const INTERMISSION_TIME = 15;

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
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export async function createRoom(socketId, hostData) {
  const roomCode = (hostData.roomCode ? String(hostData.roomCode).toUpperCase().trim() : generateRoomCode());
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
    turnTime: parseInt(hostData.turnTime, 10) || 10,
    goalPool: hostData.goalPool || 'queue',
    enableBanPhase: hostData.enableBanPhase === true || hostData.enableBanPhase === 'true' || false,
    bansPerPlayer: parseInt(hostData.bansPerPlayer, 10) || 2,
    players: [hostPlayer],
    inBanPhase: false,
    banState: null,
    inDraftPhase: false,
    draftState: null,
    turnTimer: null,
    remainingTime: parseInt(hostData.turnTime, 10) || 10,
  };

  rooms.set(roomCode, newRoom);
  console.log(`[RoomManager] Room '${roomCode}' created. Active rooms: ${rooms.size}`);
  return newRoom;
}

export async function joinRoom(socketId, joinData) {
  const roomCode = (joinData.roomCode || '').trim().toUpperCase();
  const room = rooms.get(roomCode);

  if (!room) {
    throw new Error(`Room '${roomCode}' does not exist.`);
  }

  const cleanUsername = (joinData.username || '').trim();
  if (!cleanUsername) {
    throw new Error('Username is required.');
  }

  const existingPlayer = room.players.find(p => p.username.toLowerCase() === cleanUsername.toLowerCase());
  if (existingPlayer) {
    throw new Error(`A player with the name '${cleanUsername}' already exists in this room.`);
  }

  if (room.players.length >= 4) {
    throw new Error(`Room '${roomCode}' is full (maximum 4 players).`);
  }

  if (room.inDraftPhase || room.inBanPhase) {
    throw new Error(`Room '${roomCode}' has already started the match.`);
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

export function updateRoomSettings(socketId, roomCode, { boardSize, turnTime, goalPool, enableBanPhase, bansPerPlayer }) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const hostPlayer = room.players.find(p => p.isHost);
  if (!hostPlayer || hostPlayer.socketId !== socketId) {
    return null;
  }

  if (room.inDraftPhase || room.inBanPhase) {
    return null;
  }

  if (boardSize) {
    room.boardSize = boardSize;
  }
  if (turnTime) {
    room.turnTime = parseInt(turnTime, 10);
    room.remainingTime = room.turnTime;
  }
  if (goalPool) {
    room.goalPool = goalPool;
  }
  if (enableBanPhase !== undefined) {
    room.enableBanPhase = Boolean(enableBanPhase);
  }
  if (bansPerPlayer !== undefined) {
    room.bansPerPlayer = parseInt(bansPerPlayer, 10) || 2;
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

      // Sync banState.players if in ban phase
      if (room.inBanPhase && room.banState && room.banState.players) {
        const banPlayerIdx = room.banState.players.findIndex(p => p.socketId === socketId);
        if (banPlayerIdx !== -1) {
          room.banState.players.splice(banPlayerIdx, 1);
        }
        if (room.banState.players.length === 0) {
          destroyRoom(code);
          return { roomCode: code, destroyed: true, removedPlayer };
        }
        room.banState.totalBanTurns = room.banState.players.length * (room.banState.bansPerPlayer || 2);
        if (room.banState.turnIndex >= room.banState.totalBanTurns && !room.banState.isIntermission) {
          room.banState.isIntermission = true;
        }
      }

      // Sync draftState.players if in draft phase
      if (room.inDraftPhase && room.draftState && room.draftState.players) {
        const draftPlayerIdx = room.draftState.players.findIndex(p => p.socketId === socketId);
        if (draftPlayerIdx !== -1) {
          room.draftState.players.splice(draftPlayerIdx, 1);
        }
        if (room.draftState.players.length === 0) {
          destroyRoom(code);
          return { roomCode: code, destroyed: true, removedPlayer };
        }
        room.draftState.turnIndex = room.draftState.turnIndex % room.draftState.players.length;
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
    throw new Error('Only the room host can start the match.');
  }

  // Randomize picking order once among connected players (preserved across ban and draft)
  const randomizedPlayers = [...room.players].sort(() => 0.5 - Math.random());
  room.players = randomizedPlayers;

  if (room.enableBanPhase) {
    // Start Ban Phase
    room.inBanPhase = true;
    room.inDraftPhase = false;
    const categories = getGoalCategories(room.goalPool || 'queue');
    const bansPerPlayer = room.bansPerPlayer || 2;

    room.banState = {
      enabled: true,
      bansPerPlayer,
      turnIndex: 0,
      players: randomizedPlayers,
      bannedGoals: [],
      bannedGoalIds: [],
      isIntermission: false,
      isComplete: false,
      totalBanTurns: randomizedPlayers.length * bansPerPlayer,
      categories,
    };

    startBanTimer(roomCode, io);
    return room;
  }

  // Direct Draft Phase Start
  room.inBanPhase = false;
  room.inDraftPhase = true;
  room.draftState = initDraftSession(room.boardSize, randomizedPlayers, room.goalPool || 'queue');

  startTurnTimer(roomCode, io);
  return room;
}

export function handleMakeBan(socketId, roomCode, categoryId, io) {
  const room = rooms.get(roomCode);
  if (!room || !room.inBanPhase || !room.banState || room.banState.isIntermission || room.banState.isComplete) {
    return null;
  }

  const activePlayer = (room.banState.players && room.banState.players.length > 0)
    ? room.banState.players[room.banState.turnIndex % room.banState.players.length]
    : null;

  if (!activePlayer || activePlayer.socketId !== socketId) {
    return null; // Not active player's turn
  }

  if (room.banState.bannedGoalIds.includes(categoryId)) {
    return null; // Already banned
  }

  const category = (room.banState.categories || []).find(c => c.id === categoryId) || {
    id: categoryId,
    text: categoryId,
    texture: '',
  };

  room.banState.bannedGoals.push({
    categoryId,
    goal: category,
    bannedBy: activePlayer,
    isSkipped: false,
  });
  room.banState.bannedGoalIds.push(categoryId);

  room.banState.turnIndex += 1;

  if (room.banState.turnIndex >= room.banState.totalBanTurns) {
    // All ban turns completed -> enter Intermission Phase
    room.banState.isIntermission = true;
    startIntermissionTimer(roomCode, io);
  } else {
    resetBanTurnTimer(roomCode, io);
  }

  return room;
}

export function startBanTimer(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearTurnTimer(room);
  room.remainingTime = BAN_TURN_TIME;

  room.turnTimer = setInterval(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.players.length === 0) {
      clearTurnTimer(room);
      return;
    }

    currentRoom.remainingTime -= 1;

    const activePlayer = (currentRoom.banState && currentRoom.banState.players && currentRoom.banState.players.length > 0)
      ? currentRoom.banState.players[currentRoom.banState.turnIndex % currentRoom.banState.players.length]
      : null;

    io.to(roomCode).emit('turn_timer_tick', {
      remainingTime: currentRoom.remainingTime,
      activePlayerId: activePlayer ? activePlayer.id : null,
    });

    if (currentRoom.remainingTime <= 0) {
      // Time expired: Auto-timeout skips ban pick
      if (currentRoom.banState && activePlayer) {
        currentRoom.banState.bannedGoals.push({
          categoryId: null,
          goal: null,
          bannedBy: activePlayer,
          isSkipped: true,
        });

        currentRoom.banState.turnIndex += 1;

        if (currentRoom.banState.turnIndex >= currentRoom.banState.totalBanTurns) {
          currentRoom.banState.isIntermission = true;
          startIntermissionTimer(roomCode, io);
        } else {
          currentRoom.remainingTime = BAN_TURN_TIME;
        }

        io.to(roomCode).emit('room_state_updated', sanitizeRoomState(currentRoom));
      }
    }
  }, 1000);
}

export function resetBanTurnTimer(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.remainingTime = BAN_TURN_TIME;
}

export function startIntermissionTimer(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearTurnTimer(room);
  room.remainingTime = INTERMISSION_TIME;
  io.to(roomCode).emit('room_state_updated', sanitizeRoomState(room));

  room.turnTimer = setInterval(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.players.length === 0) {
      clearTurnTimer(room);
      return;
    }

    currentRoom.remainingTime -= 1;

    io.to(roomCode).emit('turn_timer_tick', {
      remainingTime: currentRoom.remainingTime,
      activePlayerId: null,
    });

    if (currentRoom.remainingTime <= 0) {
      // Intermission complete: Transition to Drafting Phase
      clearTurnTimer(currentRoom);
      currentRoom.banState.isComplete = true;
      currentRoom.inBanPhase = false;
      currentRoom.inDraftPhase = true;

      // Seed usedGoalIds with banned categories so they never appear
      currentRoom.draftState = initDraftSession(
        currentRoom.boardSize,
        currentRoom.players,
        currentRoom.goalPool || 'queue',
        currentRoom.banState.bannedGoalIds
      );

      const cleanState = sanitizeRoomState(currentRoom);
      io.to(roomCode).emit('draft_started', cleanState);
      io.to(roomCode).emit('room_state_updated', cleanState);

      startTurnTimer(roomCode, io);
    }
  }, 1000);
}

export function handleMakePick(socketId, roomCode, selectedGoal, io) {
  const room = rooms.get(roomCode);
  if (!room || !room.inDraftPhase || !room.draftState) return null;

  const activePlayer = (room.draftState.players && room.draftState.players.length > 0)
    ? room.draftState.players[room.draftState.turnIndex % room.draftState.players.length]
    : null;

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

  const activePlayer = (room.draftState.players && room.draftState.players.length > 0)
    ? room.draftState.players[room.draftState.turnIndex % room.draftState.players.length]
    : null;

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
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.players.length === 0) {
      clearTurnTimer(room);
      return;
    }

    currentRoom.remainingTime -= 1;

    const activePlayer = (currentRoom.draftState && currentRoom.draftState.players && currentRoom.draftState.players.length > 0)
      ? currentRoom.draftState.players[currentRoom.draftState.turnIndex % currentRoom.draftState.players.length]
      : null;

    io.to(roomCode).emit('turn_timer_tick', {
      remainingTime: currentRoom.remainingTime,
      activePlayerId: activePlayer ? activePlayer.id : null,
    });

    if (currentRoom.remainingTime <= 0) {
      // Time expired: Auto-pick first presented goal option
      if (currentRoom.draftState && currentRoom.draftState.currentOptions && currentRoom.draftState.currentOptions.length > 0 && activePlayer) {
        const defaultGoal = currentRoom.draftState.currentOptions[0];
        currentRoom.draftState = makePick(currentRoom.draftState, defaultGoal);

        if (currentRoom.draftState && currentRoom.draftState.isComplete) {
          clearTurnTimer(currentRoom);
        } else {
          currentRoom.remainingTime = currentRoom.turnTime;
        }

        io.to(roomCode).emit('room_state_updated', sanitizeRoomState(currentRoom));
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
    console.log(`[RoomManager] Room '${roomCode}' has no remaining players and was destroyed. Active rooms: ${rooms.size}`);
  }
}

export function getActiveRoomCount() {
  return rooms.size;
}

export function getRoom(roomCode) {
  return rooms.get(roomCode);
}

export function sanitizeRoomState(room) {
  if (!room) return null;
  const { turnTimer, ...cleanRoom } = room;
  return cleanRoom;
}

