import React, { useState, useEffect, useRef } from 'react';
import { getAvatarUrl } from '../services/mojangApi';
import { socket, makePickSocket, executeRerollSocket } from '../services/socket';
import GoalIcon from './GoalIcon';
import ExportModal from './ExportModal';
import {
  playYourTurnSound,
  playOpponentTurnSound,
  playTimerTickSound,
  playDraftCompleteSound
} from '../services/soundEffects';
import {
  Clock,
  RefreshCw,
  Crown,
  Layers,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function DraftingPhaseView({ lobbyData, serverTimer, onResetLobby }) {
  const [showExportModal, setShowExportModal] = useState(false);

  // Sync draftState from server lobbyData
  const draftState = lobbyData.draftState || {
    gridSize: lobbyData.boardSize || '5x5',
    rows: 5,
    cols: 5,
    totalSlots: 25,
    board: Array(25).fill(null),
    currentSlotIndex: 0,
    turnIndex: 0,
    players: lobbyData.players || [],
    usedGoalIds: [],
    currentOptions: [],
    usedRerolls: {},
    claimedCounts: {},
    isComplete: false,
    history: [],
  };

  const timeLeft = serverTimer !== undefined ? serverTimer : (lobbyData.remainingTime || 15);
  const currentSocketId = socket.id;

  const activePlayer = draftState.players ? draftState.players[draftState.turnIndex] : null;

  const isCurrentClientTurn = activePlayer
    ? (activePlayer.socketId === currentSocketId || activePlayer.id === currentSocketId || activePlayer.isCurrentClient === true)
    : false;

  const clientPlayer = (draftState.players || []).find(
    p => p.socketId === currentSocketId || p.id === currentSocketId || p.isCurrentClient
  ) || (draftState.players || [])[0];

  const opponentPlayers = (draftState.players || []).filter(
    p => p.id !== clientPlayer?.id && p.socketId !== clientPlayer?.socketId
  );

  const prevActivePlayerId = useRef(null);
  const prevIsComplete = useRef(false);

  // Sound Effect 1: Turn Transition Sound
  useEffect(() => {
    if (draftState.isComplete) return;
    const currentActiveId = activePlayer?.id || activePlayer?.socketId;
    if (currentActiveId && prevActivePlayerId.current !== currentActiveId) {
      if (prevActivePlayerId.current !== null) {
        if (isCurrentClientTurn) {
          playYourTurnSound();
        } else {
          playOpponentTurnSound();
        }
      }
      prevActivePlayerId.current = currentActiveId;
    }
  }, [activePlayer, isCurrentClientTurn, draftState.isComplete]);

  // Sound Effect 2: 5 Seconds Remaining Warning Ticks
  useEffect(() => {
    if (!draftState.isComplete && timeLeft <= 5 && timeLeft > 0) {
      playTimerTickSound();
    }
  }, [timeLeft, draftState.isComplete]);

  // Sound Effect 3 & Modal: Draft Completion Fanfare
  useEffect(() => {
    if (draftState.isComplete) {
      setShowExportModal(true);
      if (!prevIsComplete.current) {
        playDraftCompleteSound();
        prevIsComplete.current = true;
      }
    }
  }, [draftState.isComplete]);

  const handleUserPick = (goal) => {
    if (!isCurrentClientTurn || draftState.isComplete) return;
    makePickSocket(lobbyData.roomCode, goal);
  };

  const handleReroll = (e) => {
    e.stopPropagation();
    if (!isCurrentClientTurn || draftState.usedRerolls[activePlayer?.id] || draftState.isComplete) return;
    executeRerollSocket(lobbyData.roomCode);
  };

  const timerPercentage = Math.max(0, (timeLeft / (lobbyData.turnTime || 10)) * 100);

  const getPlayerAvatar = (player) => {
    if (!player) return getAvatarUrl('Steve');
    if (player.avatarUrl && !player.avatarUrl.includes('undefined')) {
      return player.avatarUrl;
    }
    return getAvatarUrl(player.uuid || player.username);
  };

  return (
    <div className="max-w-6xl w-full mx-auto flex flex-col justify-between space-y-1.5 sm:space-y-2 h-full flex-1 min-h-0 overflow-hidden">

      {/* 1. TOP GOAL SELECTION & CONTROL BAR */}
      {!draftState.isComplete && (
        <div className="draftout-panel mc-bevel p-2 sm:p-2.5 border-cyan-400/40 space-y-1.5 shrink-0 shadow-lg">

          {/* Top Status & Controls Row */}
          <div className="flex items-center justify-between gap-2.5">

            {/* Active Turn Message - GREEN on Client Turn, RED on Opponent Turn */}
            <div className="flex items-center gap-2 min-w-0">
              <span className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${isCurrentClientTurn ? 'bg-emerald-400' : 'bg-rose-500'
                }`}></span>
              <h2 className={`text-xs sm:text-sm font-pixel tracking-wider truncate ${isCurrentClientTurn ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                {isCurrentClientTurn
                  ? 'YOUR TURN - SELECT A GOAL FOR THE BOARD'
                  : `${activePlayer?.username || 'Opponent'}'s TURN - PICKING...`}
              </h2>
            </div>

            {/* Timer Badge & Reroll Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="mc-bevel-inset px-2 py-0.5 flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`} />
                <span className={`text-xs font-mono font-bold ${timeLeft <= 5 ? 'text-rose-400' : 'text-cyan-300'}`}>
                  {timeLeft}s
                </span>
              </div>

              {/* Reroll Button (Client Only) */}
              {isCurrentClientTurn && (
                <button
                  onClick={handleReroll}
                  disabled={draftState.usedRerolls?.[activePlayer?.id]}
                  className={`py-0.5 px-2 font-pixel text-[9px] flex items-center gap-1 transition-all border ${!draftState.usedRerolls?.[activePlayer?.id]
                    ? 'bg-neutral-900 hover:bg-neutral-800 border-cyan-400/50 text-cyan-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.4)] cursor-pointer'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
                    }`}
                >
                  <RefreshCw className={`w-3 h-3 ${!draftState.usedRerolls?.[activePlayer?.id] ? 'text-cyan-400' : ''}`} />
                  <span>
                    {draftState.usedRerolls?.[activePlayer?.id] ? 'REROLL USED' : 'REROLL (1 LEFT)'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Timer Progress Bar */}
          <div className="w-full bg-neutral-950 h-1 overflow-hidden border border-neutral-800">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${isCurrentClientTurn ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              style={{ width: `${timerPercentage}%` }}
            ></div>
          </div>

          {/* 2 WHOLE-BLOCK CLICKABLE GOAL CHOICE CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {draftState.currentOptions?.map((goal, optionIdx) => {
              const isLeftOption = optionIdx === 0;

              return (
                <div
                  key={`${goal.id}-${optionIdx}`}
                  onClick={() => handleUserPick(goal)}
                  className={`mc-bevel p-2 sm:p-2.5 flex items-center gap-2.5 transition-all ${isLeftOption ? 'flex-row-reverse text-right' : 'flex-row text-left'
                    } ${isCurrentClientTurn
                      ? 'bg-neutral-900 border-cyan-400/40 hover:border-cyan-300 hover:bg-neutral-850 cursor-pointer shadow-[0_0_14px_rgba(34,211,238,0.3)] hover:shadow-[0_0_22px_rgba(34,211,238,0.6)] active:scale-[0.99]'
                      : 'bg-neutral-950 border-neutral-800 opacity-75 cursor-not-allowed'
                    }`}
                >
                  {/* Thematic Icon Container */}
                  <div className="mc-bevel-inset w-11 h-11 sm:w-12 sm:h-12 p-1 shrink-0 flex items-center justify-center bg-neutral-950 border border-cyan-500/40 overflow-hidden">
                    <GoalIcon goal={goal} className="w-full h-full text-cyan-300" />
                  </div>

                  {/* Goal Option Text */}
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center justify-between ${isLeftOption ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[9px] font-mono text-cyan-300/70 uppercase">OPTION #{optionIdx + 1}</span>
                      {isCurrentClientTurn && (
                        <span className="text-[9px] font-pixel text-cyan-300 bg-cyan-400/10 px-1.5 py-0.5 border border-cyan-400/30">
                          CLICK TO PICK
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate leading-tight mt-0.5">{goal.text}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. MAIN 3-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 flex-1 min-h-0 items-stretch overflow-hidden">

        {/* LEFT SIDEBAR: Anchored Client Player (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col justify-start relative z-10 min-h-0">
          <div className="draftout-panel mc-bevel p-2.5 border border-cyan-400/30 bg-neutral-900 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-pixel text-cyan-300 border-b border-cyan-500/20 pb-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> YOU
            </div>

            <div className="flex items-center gap-2.5">
              <div className="mc-bevel-inset w-9 h-9 p-0.5 shrink-0 overflow-hidden relative">
                <img
                  src={getPlayerAvatar(clientPlayer)}
                  alt={clientPlayer?.username}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://minotar.net/helm/${encodeURIComponent(clientPlayer?.username || 'Steve')}/64.png`;
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white text-xs sm:text-sm truncate">{clientPlayer?.username}</h3>
                <p className="text-[11px] text-cyan-300 font-mono">
                  {draftState.claimedCounts[clientPlayer?.id] || 0} Goals Claimed
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs pt-0.5">
              <div className="flex items-center justify-between p-1 bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Turn Status:</span>
                {isCurrentClientTurn ? (
                  <span className="font-pixel text-[8px] text-emerald-400 bg-emerald-400/20 px-1 py-0.5 border border-emerald-400/40">
                    YOUR TURN
                  </span>
                ) : (
                  <span className="text-rose-400 text-[10px] font-semibold">WAITING...</span>
                )}
              </div>

              <div className="flex items-center justify-between p-1 bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Reroll:</span>
                {draftState.usedRerolls?.[clientPlayer?.id] ? (
                  <span className="text-rose-400 font-semibold text-[10px]">USED</span>
                ) : (
                  <span className="text-cyan-300 font-semibold text-[10px]">READY (1)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: Interactive Minecraft Drafting Board Grid (6 Cols - High Z-Index for Tooltips) */}
        <div className="lg:col-span-6 flex flex-col justify-start h-full min-h-0 relative z-20 overflow-visible">
          <div className="draftout-panel mc-bevel p-2 flex flex-col justify-start shadow-lg min-h-0 overflow-visible relative z-30 h-auto">
            <div className="flex items-center justify-between mb-1 px-1 shrink-0">
              <div className="text-[10px] font-pixel text-cyan-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> BOARD ({draftState.gridSize})
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {draftState.currentSlotIndex}/{draftState.totalSlots} Filled
              </span>
            </div>

            {/* STRICT 1:1 SQUARE BOARD GRID CONTAINER ALIGNED TO TOP */}
            <div className="w-full flex items-start justify-center p-0.5 overflow-visible">
              <div
                className="grid gap-1 mx-auto overflow-visible"
                style={{
                  width: 'min(100%, calc(100dvh - 19.5rem))',
                  height: 'min(100%, calc(100dvh - 19.5rem))',
                  aspectRatio: '1 / 1',
                  gridTemplateColumns: `repeat(${draftState.cols || 5}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${draftState.rows || 5}, minmax(0, 1fr))`,
                }}
              >
                {draftState.board.map((slotItem, index) => {
                  const isActiveSlot = index === draftState.currentSlotIndex && !draftState.isComplete;
                  const isClaimed = !!slotItem;
                  const totalCols = draftState.cols || 5;
                  const isTopHalf = index < totalCols * 2;

                  return (
                    <div
                      key={index}
                      className={`aspect-square w-full h-full p-0.5 flex flex-col justify-between items-center relative group transition-all ${isClaimed
                        ? 'mc-bevel-inset bg-neutral-900 border-cyan-500/40 hover:border-cyan-300 cursor-pointer z-10 hover:z-50'
                        : isActiveSlot
                          ? 'mc-slot-active bg-neutral-950 animate-pulse'
                          : 'mc-slot bg-neutral-950/60'
                        }`}
                    >
                      {/* Slot Number Tag */}
                      <span className="text-[8px] font-mono font-bold text-neutral-500/70 absolute top-0.5 left-1 z-10 pointer-events-none">
                        {index + 1}
                      </span>

                      {/* Slot Content - FULL ICON IN GRID CELL */}
                      {isClaimed ? (
                        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center overflow-hidden">
                          <GoalIcon goal={slotItem} className="w-full h-full text-cyan-300 object-contain" />
                        </div>
                      ) : isActiveSlot ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-300 animate-bounce" />
                          <span className="font-pixel text-[7px] text-cyan-300">NEXT</span>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-neutral-700 font-mono text-[8px]">Empty</span>
                        </div>
                      )}

                      {/* Claimed Player Avatar Badge */}
                      {isClaimed && slotItem.claimedBy && (
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 overflow-hidden bg-neutral-950 z-10">
                          <img
                            src={getPlayerAvatar(slotItem.claimedBy)}
                            alt={slotItem.claimedBy.username}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://minotar.net/helm/${encodeURIComponent(slotItem.claimedBy.username)}/64.png`;
                            }}
                          />
                        </div>
                      )}

                      {/* RICH HOVER TOOLTIP FOR CLAIMED GOALS */}
                      {isClaimed && (
                        <div className={`absolute z-[100] left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col w-52 p-2.5 bg-neutral-950/95 border border-cyan-400/60 shadow-2xl pointer-events-none text-left backdrop-blur-md ${isTopHalf ? 'top-full mt-2' : 'bottom-full mb-2'
                          }`}>
                          <p className="text-[10px] font-mono text-cyan-300 font-bold uppercase mb-1">
                            Slot {index + 1}
                          </p>
                          <p className="text-xs font-bold text-white leading-snug mb-2">
                            {slotItem.text}
                          </p>
                          {slotItem.claimedBy && (
                            <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-800">
                              <div className="w-5 h-5 overflow-hidden p-0.5 shrink-0 bg-neutral-900 flex items-center justify-center">
                                <img
                                  src={getPlayerAvatar(slotItem.claimedBy)}
                                  alt={slotItem.claimedBy?.username || 'Player'}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://minotar.net/helm/${encodeURIComponent(slotItem.claimedBy?.username || 'Steve')}/64.png`;
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-neutral-300 font-semibold truncate">
                                Drafted by <strong className="text-cyan-300">{slotItem.claimedBy?.username || 'Player'}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Vertical Opponents List (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col justify-start relative z-10 min-h-0">
          <div className="draftout-panel mc-bevel p-2.5 border border-neutral-800 space-y-2 overflow-y-auto max-h-full">
            <div className="flex items-center gap-2 text-[10px] font-pixel text-cyan-300 border-b border-cyan-500/20 pb-1">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> OPPONENTS ({opponentPlayers.length})
            </div>

            <div className="space-y-1.5">
              {opponentPlayers.map((player) => {
                const isTurn = activePlayer?.id === player.id || activePlayer?.socketId === player.socketId;
                return (
                  <div
                    key={player.id || player.socketId}
                    className={`mc-bevel p-2 border transition-all ${isTurn
                      ? 'border-rose-500/80 bg-neutral-900 shadow-rose-950'
                      : 'border-neutral-800 bg-neutral-950'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="mc-bevel-inset w-8 h-8 p-0.5 shrink-0 overflow-hidden relative">
                        <img
                          src={getPlayerAvatar(player)}
                          alt={player.username}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://minotar.net/helm/${encodeURIComponent(player.username)}/64.png`;
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-xs truncate">{player.username}</h4>
                          {isTurn && (
                            <span className="text-[7px] font-pixel text-rose-300 bg-rose-500/20 px-1 py-0.5 border border-rose-500/30 animate-pulse">
                              PICKING
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {draftState.claimedCounts[player.id] || 0} Goals
                          </p>
                          {draftState.usedRerolls?.[player.id] ? (
                            <span className="text-[7px] font-pixel text-rose-400 bg-rose-500/10 px-1 py-0.5 border border-rose-500/20">
                              REROLL USED
                            </span>
                          ) : (
                            <span className="text-[7px] font-pixel text-cyan-300 bg-cyan-400/10 px-1 py-0.5 border border-cyan-400/20">
                              1 REROLL
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal draftState={draftState} onResetLobby={onResetLobby} />
      )}
    </div>
  );
}
