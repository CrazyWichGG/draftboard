import masterGoals from '../../GOALS.json';

/**
 * DraftEngine Service
 * Manages goal selection from GOALS.json, turn ordering, rerolls, and BOARD.json export payload.
 */

export function getMasterGoals() {
  return masterGoals || [];
}

/**
 * Draw N random available goals from master GOALS.json
 */
export function drawRandomGoals(count = 2, usedGoalIds = new Set()) {
  const usedSet = usedGoalIds instanceof Set ? usedGoalIds : new Set(usedGoalIds);

  // 1. Group master goals by base category ID
  const categoryMap = new Map();
  for (const g of (masterGoals || [])) {
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
    pool.splice(randomIndex, 1);

    const variants = categoryMap.get(catId) || [];
    const varIndex = Math.floor(Math.random() * variants.length);
    chosenGoals.push(variants[varIndex]);
  }

  return chosenGoals;
}

/**
 * Parse grid size string (e.g. "5x5") to numeric rows and cols
 */
export function parseGridDimensions(gridSizeStr = '5x5') {
  const match = String(gridSizeStr).match(/(\d+)x?(\d+)?/i);
  if (match && match[1]) {
    const dim = parseInt(match[1], 10);
    return { rows: dim, cols: dim, total: dim * dim };
  }
  return { rows: 5, cols: 5, total: 25 };
}

/**
 * Initialize a new draft session
 */
export function initDraftSession(gridSizeStr = '5x5', players = []) {
  const { rows, cols, total } = parseGridDimensions(gridSizeStr);
  const usedIds = new Set();
  const initialOptions = drawRandomGoals(2, usedIds);

  const rerolls = {};
  const claimed = {};
  players.forEach(p => {
    rerolls[p.id] = false; // Has NOT used reroll yet
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

/**
 * Execute a goal pick for the active turn
 */
export function makePick(draftState, selectedGoal) {
  if (draftState.isComplete || draftState.currentSlotIndex >= draftState.totalSlots) {
    return draftState;
  }

  const activePlayer = draftState.players[draftState.turnIndex];
  const newBoard = [...draftState.board];
  newBoard[draftState.currentSlotIndex] = {
    ...selectedGoal,
    claimedBy: activePlayer,
    slotIndex: draftState.currentSlotIndex,
  };

  const nextSlotIndex = draftState.currentSlotIndex + 1;
  const isComplete = nextSlotIndex >= draftState.totalSlots;
  const nextTurnIndex = (draftState.turnIndex + 1) % draftState.players.length;

  const newUsedIds = new Set([...draftState.usedGoalIds, selectedGoal.id]);
  const nextOptions = isComplete ? [] : drawRandomGoals(2, newUsedIds);

  const updatedClaimed = {
    ...draftState.claimedCounts,
    [activePlayer.id]: (draftState.claimedCounts[activePlayer.id] || 0) + 1,
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
    history: [historyEntry, ...draftState.history],
  };
}

/**
 * Execute a reroll for the active player (1-use only)
 */
export function executeReroll(draftState) {
  const activePlayer = draftState.players[draftState.turnIndex];
  if (draftState.usedRerolls[activePlayer.id]) {
    return draftState; // Already used
  }

  const currentOptionIds = new Set(draftState.currentOptions.map(o => o.id));
  const usedIds = new Set([...draftState.usedGoalIds, ...currentOptionIds]);
  const newOptions = drawRandomGoals(2, usedIds);

  return {
    ...draftState,
    currentOptions: newOptions,
    usedRerolls: {
      ...draftState.usedRerolls,
      [activePlayer.id]: true,
    },
  };
}

/**
 * Export BOARD.json strictly formatted for the Draftout Minecraft mod
 * Schema requirement:
 * {
 *   "size": 5,
 *   "goals": [
 *     { "id": "UPPERCASE_ID" }
 *   ]
 * }
 */
export function generateFinalJsonPayload(draftState) {
  const { rows } = parseGridDimensions(draftState.gridSize);

  const formattedGoals = draftState.board.map((item) => {
    if (!item || !item.id) {
      return { id: 'UNKNOWN_GOAL' };
    }
    const goalObj = { id: item.id };

    let dataVal = item.data;
    if (!dataVal && masterGoals && masterGoals.length > 0) {
      const match = masterGoals.find(g => {
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
