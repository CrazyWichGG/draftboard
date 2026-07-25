import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load static master GOALS.json
const goalsPath = path.resolve(__dirname, '../GOALS.json');
let masterGoals = [];

export function loadMasterGoals() {
  try {
    const fileData = fs.readFileSync(goalsPath, 'utf8');
    masterGoals = JSON.parse(fileData);
  } catch (err) {
    console.error('[DraftEngineServer] Error loading GOALS.json:', err.message);
  }
  return masterGoals;
}

loadMasterGoals();

export function getMasterGoals() {
  if (!masterGoals || masterGoals.length === 0) {
    loadMasterGoals();
  }
  return masterGoals;
}

export function drawRandomGoals(count = 2, usedGoalIds = new Set()) {
  const goalsList = getMasterGoals();
  const usedSet = usedGoalIds instanceof Set ? usedGoalIds : new Set(usedGoalIds);

  // 1. Group master goals by base category ID (e.g. KILL_COLORED_SHEEP -> [variants...])
  const categoryMap = new Map();
  for (const g of goalsList) {
    if (!categoryMap.has(g.id)) {
      categoryMap.set(g.id, []);
    }
    categoryMap.get(g.id).push(g);
  }

  // 2. Filter available categories (excluding categories already used)
  let availableCategories = Array.from(categoryMap.keys()).filter(catId => !usedSet.has(catId));

  // Fallback: If available categories are fewer than requested count, reset pool
  if (availableCategories.length < count) {
    availableCategories = Array.from(categoryMap.keys());
  }

  // 3. Uniformly pick 'count' distinct categories & select 1 random variant per category
  const chosenGoals = [];
  const pool = [...availableCategories];

  while (chosenGoals.length < count && pool.length > 0) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const catId = pool[randomIndex];
    pool.splice(randomIndex, 1); // Avoid duplicate category selection

    const variants = categoryMap.get(catId) || [];
    const varIndex = Math.floor(Math.random() * variants.length);
    chosenGoals.push(variants[varIndex]);
  }

  return chosenGoals;
}

export function parseGridDimensions(gridSizeStr = '5x5') {
  const match = String(gridSizeStr).match(/(\d+)x?(\d+)?/i);
  if (match && match[1]) {
    const dim = parseInt(match[1], 10);
    return { rows: dim, cols: dim, total: dim * dim };
  }
  return { rows: 5, cols: 5, total: 25 };
}

export function initDraftSession(gridSizeStr = '5x5', players = []) {
  const { rows, cols, total } = parseGridDimensions(gridSizeStr);
  const usedIds = new Set();
  const initialOptions = drawRandomGoals(2, usedIds);
  // Mark all initial options as seen in usedIds
  initialOptions.forEach(opt => {
    if (opt && opt.id) usedIds.add(opt.id);
  });

  const rerolls = {};
  const claimed = {};
  players.forEach(p => {
    rerolls[p.id] = false;
    claimed[p.id] = 0;
  });

  return {
    gridSize: gridSizeStr,
    rows,
    cols,
    totalSlots: total,
    board: Array(total).fill(null),
    currentSlotIndex: 0,
    turnIndex: 0,
    players: players,
    usedGoalIds: Array.from(usedIds),
    currentOptions: initialOptions,
    usedRerolls: rerolls,
    claimedCounts: claimed,
    isComplete: false,
    history: [],
  };
}

export function makePick(draftState, selectedGoal) {
  if (!draftState || draftState.isComplete || draftState.currentSlotIndex >= draftState.totalSlots) {
    return draftState;
  }

  if (!draftState.players || draftState.players.length === 0) {
    return { ...draftState, isComplete: true };
  }

  const validTurnIndex = (draftState.turnIndex || 0) % draftState.players.length;
  const activePlayer = draftState.players[validTurnIndex];

  if (!activePlayer || !activePlayer.id) {
    console.warn('[DraftEngineServer] makePick called with invalid activePlayer');
    return draftState;
  }

  const newBoard = [...draftState.board];
  newBoard[draftState.currentSlotIndex] = {
    ...selectedGoal,
    claimedBy: activePlayer,
    slotIndex: draftState.currentSlotIndex,
  };

  const nextSlotIndex = draftState.currentSlotIndex + 1;
  const isComplete = nextSlotIndex >= draftState.totalSlots;
  const nextTurnIndex = (validTurnIndex + 1) % draftState.players.length;

  // Add ALL presented options from current turn to newUsedIds
  const currentOptionIds = (draftState.currentOptions || []).map(g => g.id);
  const newUsedIds = new Set([...(draftState.usedGoalIds || []), selectedGoal.id, ...currentOptionIds]);

  const nextOptions = isComplete ? [] : drawRandomGoals(2, newUsedIds);
  // Mark new options as seen
  nextOptions.forEach(opt => {
    if (opt && opt.id) newUsedIds.add(opt.id);
  });

  const updatedClaimed = {
    ...draftState.claimedCounts,
    [activePlayer.id]: ((draftState.claimedCounts && draftState.claimedCounts[activePlayer.id]) || 0) + 1,
  };

  const historyEntry = {
    player: activePlayer,
    goal: selectedGoal,
    slot: draftState.currentSlotIndex,
  };

  return {
    ...draftState,
    board: newBoard,
    currentSlotIndex: nextSlotIndex,
    turnIndex: nextTurnIndex,
    usedGoalIds: Array.from(newUsedIds),
    currentOptions: nextOptions,
    claimedCounts: updatedClaimed,
    isComplete,
    history: [historyEntry, ...(draftState.history || [])],
  };
}

export function executeReroll(draftState, playerId) {
  if (!draftState || !draftState.players || draftState.players.length === 0) return draftState;

  const validTurnIndex = (draftState.turnIndex || 0) % draftState.players.length;
  const activePlayer = draftState.players[validTurnIndex];

  if (!activePlayer || activePlayer.id !== playerId) return draftState;
  if (draftState.usedRerolls && draftState.usedRerolls[playerId]) return draftState;

  const currentOptionIds = (draftState.currentOptions || []).map(o => o.id);
  const newUsedIds = new Set([...(draftState.usedGoalIds || []), ...currentOptionIds]);
  const newOptions = drawRandomGoals(2, newUsedIds);
  newOptions.forEach(opt => {
    if (opt && opt.id) newUsedIds.add(opt.id);
  });

  return {
    ...draftState,
    usedGoalIds: Array.from(newUsedIds),
    currentOptions: newOptions,
    usedRerolls: {
      ...draftState.usedRerolls,
      [playerId]: true,
    },
  };
}

export function generateFinalJsonPayload(draftState) {
  const { rows } = parseGridDimensions(draftState.gridSize);
  const goalsList = getMasterGoals();

  const formattedGoals = (draftState.board || []).map((item) => {
    if (!item || !item.id) {
      return { id: 'UNKNOWN_GOAL' };
    }
    const goalObj = { id: item.id };
    
    let dataVal = item.data;
    if (!dataVal && goalsList.length > 0) {
      const match = goalsList.find(g => {
        if (g.id !== item.id) return false;
        if (item.text && g.text) return g.text === item.text;
        if (item.texture && g.texture) return g.texture === item.texture;
        return true;
      });
      if (match && match.data) {
        dataVal = match.data;
      }
    }

    if (dataVal) {
      goalObj.data = dataVal;
    }
    return goalObj;
  });

  return {
    size: rows,
    goals: formattedGoals,
  };
}
