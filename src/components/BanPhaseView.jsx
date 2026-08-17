import React, { useState, useEffect, useRef } from 'react';
import { socket, makeBanSocket } from '../services/socket';
import { getAvatarUrl } from '../services/mojangApi';
import GoalIcon from './GoalIcon';
import {
  playYourTurnSound,
  playOpponentTurnSound,
  playTimerTickSound,
  playBanSound,
  playIntermissionSound
} from '../services/soundEffects';
import {
  Clock,
  Ban,
  Search,
  Layers,
  Sparkles,
  UserCheck,
  XCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function BanPhaseView({ lobbyData, serverTimer, onResetLobby }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, placeAbove: true });

  const banState = lobbyData.banState || {
    enabled: true,
    bansPerPlayer: 2,
    turnIndex: 0,
    players: lobbyData.players || [],
    bannedGoals: [],
    bannedGoalIds: [],
    isIntermission: false,
    isComplete: false,
    totalBanTurns: (lobbyData.players?.length || 2) * 2,
    categories: [],
  };

  const isIntermission = banState.isIntermission || false;
  const maxTimer = isIntermission ? 30 : 60;
  const timeLeft = serverTimer !== undefined ? serverTimer : (lobbyData.remainingTime || maxTimer);
  const currentSocketId = socket.id;

  const activePlayer = banState.players
    ? banState.players[banState.turnIndex % banState.players.length]
    : null;

  const isCurrentClientTurn = !isIntermission && activePlayer
    ? (activePlayer.socketId === currentSocketId || activePlayer.id === currentSocketId || activePlayer.isCurrentClient === true)
    : false;

  const clientPlayer = (banState.players || []).find(
    p => p.socketId === currentSocketId || p.id === currentSocketId || p.isCurrentClient
  ) || (banState.players || [])[0];

  const opponentPlayers = (banState.players || []).filter(
    p => p.id !== clientPlayer?.id && p.socketId !== clientPlayer?.socketId
  );

  const prevActivePlayerId = useRef(null);
  const prevIsIntermission = useRef(false);
  const prevBannedCount = useRef(banState.bannedGoals?.length || 0);

  // Sound Effect 1: Turn Transition Sound
  useEffect(() => {
    if (isIntermission || banState.isComplete) return;
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
  }, [activePlayer, isCurrentClientTurn, isIntermission, banState.isComplete]);

  // Sound Effect 2: 5 Seconds Remaining Warning Ticks
  useEffect(() => {
    if (!banState.isComplete && timeLeft <= 5 && timeLeft > 0) {
      playTimerTickSound();
    }
  }, [timeLeft, banState.isComplete]);

  // Sound Effect 3: Ban Sound on new ban pick
  useEffect(() => {
    const currentBannedCount = banState.bannedGoals?.length || 0;
    if (currentBannedCount > prevBannedCount.current) {
      const latestBan = banState.bannedGoals[currentBannedCount - 1];
      if (latestBan && !latestBan.isSkipped) {
        playBanSound();
      }
      prevBannedCount.current = currentBannedCount;
    }
  }, [banState.bannedGoals]);

  // Sound Effect 4: Intermission Transition Chime
  useEffect(() => {
    if (isIntermission && !prevIsIntermission.current) {
      playIntermissionSound();
      prevIsIntermission.current = true;
    }
  }, [isIntermission]);

  const handleCategoryHover = (cat, e) => {
    if (!cat) {
      setHoveredCategory(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const placeAbove = rect.top > 180;
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: placeAbove ? rect.top - 8 : rect.bottom + 8,
      placeAbove,
    });
    setHoveredCategory(cat);
  };

  const handleBanClick = (categoryId) => {
    if (!isCurrentClientTurn || isIntermission || banState.isComplete) return;
    if (banState.bannedGoalIds?.includes(categoryId)) return;
    makeBanSocket(lobbyData.roomCode, categoryId);
    setHoveredCategory(null);
  };

  const getPlayerAvatar = (player) => {
    if (!player) return getAvatarUrl('Steve');
    if (player.avatarUrl && !player.avatarUrl.includes('undefined')) {
      return player.avatarUrl;
    }
    return getAvatarUrl(player.uuid || player.username);
  };

  const timerPercentage = Math.max(0, (timeLeft / maxTimer) * 100);

  // Group banned goals by player
  const getPlayerBans = (playerId) => {
    return (banState.bannedGoals || []).filter(b => b.bannedBy?.id === playerId || b.bannedBy?.socketId === playerId);
  };

  const bansPerPlayer = banState.bansPerPlayer || 2;

  // Filter categories by search query
  const filteredCategories = (banState.categories || []).filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = cat.text?.toLowerCase().includes(q);
    const matchId = cat.id?.toLowerCase().includes(q);
    const matchVariant = cat.variantLabels?.some(v => String(v).toLowerCase().includes(q));
    return matchTitle || matchId || matchVariant;
  });

  return (
    <div className="max-w-6xl w-full mx-auto flex flex-col justify-between space-y-1.5 sm:space-y-2 h-full flex-1 min-h-0 overflow-hidden">

      {/* 1. TOP CONTROL & TIMER STATUS BAR */}
      <div className="draftout-panel mc-bevel p-2 sm:p-2.5 border-rose-500/40 space-y-1.5 shrink-0 shadow-lg">
        <div className="flex items-center justify-between gap-2.5">
          
          {/* Active Turn Message */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
              isIntermission 
                ? 'bg-amber-400' 
                : isCurrentClientTurn 
                  ? 'bg-emerald-400' 
                  : 'bg-rose-500'
            }`}></span>
            <h2 className={`text-xs sm:text-sm font-pixel tracking-wider truncate ${
              isIntermission 
                ? 'text-amber-300' 
                : isCurrentClientTurn 
                  ? 'text-emerald-400' 
                  : 'text-rose-400'
            }`}>
              {isIntermission
                ? `BAN PHASE INTERMISSION - DRAFT STARTS IN ${timeLeft}s`
                : isCurrentClientTurn
                  ? 'YOUR TURN - SELECT A GOAL CATEGORY TO BAN'
                  : `${activePlayer?.username || 'Opponent'}'s TURN - BANNING...`}
            </h2>
          </div>

          {/* Turn Progress & Countdown Timer */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="mc-bevel-inset px-2 py-0.5 flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`} />
              <span className={`text-xs font-mono font-bold ${timeLeft <= 5 ? 'text-rose-400' : 'text-cyan-300'}`}>
                {timeLeft}s
              </span>
            </div>

            {!isIntermission && (
              <span className="font-mono text-[10px] text-neutral-400 bg-neutral-950 px-2 py-0.5 border border-neutral-800 hidden sm:inline-block">
                Ban Turn {Math.min(banState.turnIndex + 1, banState.totalBanTurns)} / {banState.totalBanTurns}
              </span>
            )}
          </div>
        </div>

        {/* 1s Smooth Linear Progress Bar */}
        <div className="w-full bg-neutral-950 h-1 overflow-hidden border border-neutral-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isIntermission 
                ? 'bg-amber-400' 
                : isCurrentClientTurn 
                  ? 'bg-emerald-400' 
                  : 'bg-rose-500'
            }`}
            style={{ width: `${timerPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 2. MAIN VIEW AREA */}
      {isIntermission ? (
        /* INTERMISSION SUMMARY VIEW */
        <div className="flex-1 flex flex-col justify-between items-center min-h-0 draftout-panel mc-bevel p-4 border-amber-400/40 space-y-4 overflow-hidden">
          <div className="w-full text-center shrink-0 border-b border-amber-500/20 pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
              <h3 className="text-sm sm:text-base font-pixel text-amber-300 uppercase tracking-wider">
                BAN PHASE COMPLETE - INTERMISSION
              </h3>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              The following goal categories have been excluded from this match:
            </p>
          </div>

          {/* 2-Column Summary Grid of Banned Categories */}
          <div className="flex-1 w-full max-w-3xl min-h-0 overflow-y-auto p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(banState.bannedGoals || []).map((banItem, idx) => {
                if (banItem.isSkipped) {
                  return (
                    <div
                      key={`skipped-${idx}`}
                      className="mc-bevel p-3 border border-neutral-800 bg-neutral-950/80 flex items-center gap-3"
                    >
                      <div className="mc-bevel-inset w-10 h-10 flex items-center justify-center bg-neutral-900 shrink-0">
                        <XCircle className="w-5 h-5 text-rose-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-pixel text-[9px] text-neutral-500">BAN SLOT #{idx + 1}</span>
                        <h4 className="font-bold text-neutral-400 text-xs truncate">SKIPPED BAN (TIMEOUT)</h4>
                        <p className="text-[10px] text-neutral-500 font-mono">
                          Skipped by <strong className="text-neutral-300">{banItem.bannedBy?.username || 'Player'}</strong>
                        </p>
                      </div>
                    </div>
                  );
                }

                const cat = banItem.goal;
                return (
                  <div
                    key={`ban-${cat?.id}-${idx}`}
                    className="mc-bevel p-3 border border-rose-500/40 bg-neutral-950 flex items-center gap-3 relative overflow-hidden"
                  >
                    {/* Goal Texture with Forbidden Overlay */}
                    <div className="mc-bevel-inset w-11 h-11 p-1 shrink-0 bg-neutral-900 relative flex items-center justify-center overflow-hidden">
                      <GoalIcon goal={cat} className="w-full h-full text-neutral-400 grayscale opacity-60" />
                      <Ban className="w-7 h-7 text-rose-500/60 stroke-[2.5] absolute inset-0 m-auto pointer-events-none" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="font-pixel text-[8px] text-rose-400 bg-rose-500/10 px-1 py-0.5 border border-rose-500/20">
                        BANNED CATEGORY
                      </span>
                      <h4 className="font-bold text-white text-xs truncate mt-0.5 leading-snug">{cat?.text}</h4>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        Banned by <strong className="text-cyan-300">{banItem.bannedBy?.username || 'Player'}</strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Animated Footer */}
          <div className="shrink-0 text-center pt-2 border-t border-amber-500/20 w-full">
            <span className="font-pixel text-xs text-amber-300 animate-pulse flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Drafting will start shortly... ({timeLeft}s)
            </span>
          </div>
        </div>
      ) : (
        /* 3-COLUMN BAN SELECTION LAYOUT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 flex-1 min-h-0 items-stretch overflow-hidden">

          {/* LEFT SIDEBAR: Anchored Client Player (3 Cols) */}
          <div className="lg:col-span-3 flex flex-col justify-start relative z-10 min-h-0">
            <div className="draftout-panel mc-bevel p-2.5 border border-cyan-400/30 bg-neutral-900 space-y-2.5">
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
                    {getPlayerBans(clientPlayer?.id).length} / {bansPerPlayer} Bans Used
                  </p>
                </div>
              </div>

              {/* Turn Status */}
              <div className="p-1.5 bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400 text-[10px]">Status:</span>
                {isCurrentClientTurn ? (
                  <span className="font-pixel text-[8px] text-emerald-400 bg-emerald-400/20 px-1.5 py-0.5 border border-emerald-400/40 animate-pulse">
                    YOUR TURN TO BAN
                  </span>
                ) : (
                  <span className="text-rose-400 text-[10px] font-semibold">WAITING...</span>
                )}
              </div>

              {/* 2 Mini Ban Slots */}
              <div className="space-y-1 pt-1 border-t border-neutral-800">
                <span className="text-[9px] font-pixel text-neutral-400 block mb-1">YOUR BAN SLOTS</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: bansPerPlayer }).map((_, slotIdx) => {
                    const banItem = getPlayerBans(clientPlayer?.id)[slotIdx];
                    if (!banItem) {
                      return (
                        <div
                          key={`client-slot-empty-${slotIdx}`}
                          className="h-14 border border-dashed border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center gap-0.5 text-neutral-600 font-mono text-[9px]"
                        >
                          <Ban className="w-3.5 h-3.5 opacity-30" />
                          <span>#{slotIdx + 1} Empty</span>
                        </div>
                      );
                    }

                    if (banItem.isSkipped) {
                      return (
                        <div
                          key={`client-slot-skip-${slotIdx}`}
                          className="h-14 mc-bevel-inset bg-neutral-950 p-1 flex flex-col items-center justify-center text-center border border-rose-500/30"
                        >
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span className="text-[7px] font-pixel text-rose-400 mt-0.5 leading-none">SKIPPED</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`client-slot-${slotIdx}`}
                        className="h-14 mc-bevel-inset bg-neutral-950 p-1 relative flex items-center justify-center border border-rose-500/40"
                        title={banItem.goal?.text}
                      >
                        <GoalIcon goal={banItem.goal} className="w-8 h-8 text-neutral-400 grayscale opacity-60" />
                        <Ban className="w-5 h-5 text-rose-500/70 stroke-[2.5] absolute inset-0 m-auto pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Goal Category Grid & Live Search (6 Cols) */}
          <div className="lg:col-span-6 flex flex-col justify-start h-full min-h-0 relative z-20 overflow-hidden">
            <div className="draftout-panel mc-bevel p-2 flex flex-col justify-start shadow-lg h-full min-h-0 space-y-2">
              
              {/* Header & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 px-1">
                <div className="text-[10px] font-pixel text-cyan-300 flex items-center gap-1.5 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CATEGORIES POOL ({filteredCategories.length})</span>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search goal categories..."
                    className="mc-bevel-inset w-full pl-8 pr-2.5 py-1 text-xs text-white placeholder-neutral-600 focus:border-rose-400 focus:outline-none font-sans"
                  />
                </div>
              </div>

              {/* Scrollable Square Category Cards Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto p-1 border border-neutral-850 bg-neutral-950/60">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
                  {filteredCategories.map((category) => {
                    const isBanned = banState.bannedGoalIds?.includes(category.id);
                    const banInfo = isBanned ? (banState.bannedGoals || []).find(b => b.categoryId === category.id) : null;

                    return (
                      <div
                        key={category.id}
                        onClick={() => handleBanClick(category.id)}
                        onMouseEnter={(e) => handleCategoryHover(category, e)}
                        onMouseLeave={() => handleCategoryHover(null)}
                        className={`aspect-square p-1 relative group flex items-center justify-center transition-all ${
                          isBanned
                            ? 'mc-bevel-inset bg-neutral-950 border border-neutral-850 opacity-40 cursor-not-allowed'
                            : isCurrentClientTurn
                              ? 'mc-bevel bg-neutral-900 border-rose-500/40 hover:border-rose-400 hover:bg-neutral-850 cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.25)] hover:shadow-[0_0_18px_rgba(244,63,94,0.65)] active:scale-95'
                              : 'mc-bevel bg-neutral-900 border-neutral-800 opacity-75 cursor-not-allowed'
                        }`}
                      >
                        {/* Goal Texture */}
                        <div className="w-full h-full p-0.5 flex items-center justify-center overflow-hidden">
                          <GoalIcon
                            goal={category}
                            className={`w-full h-full object-contain ${
                              isBanned ? 'grayscale opacity-50' : 'text-cyan-300'
                            }`}
                          />
                        </div>

                        {/* Red Forbidden Ban Overlay for Banned Categories */}
                        {isBanned && (
                          <Ban className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500/60 stroke-[2.5] absolute inset-0 m-auto pointer-events-none" />
                        )}

                        {/* Variant Count Tag if multi-variant */}
                        {category.variantCount > 1 && !isBanned && (
                          <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono font-bold bg-neutral-950/90 text-amber-300 px-1 border border-neutral-700 pointer-events-none">
                            x{category.variantCount}
                          </span>
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

              <div className="space-y-2">
                {opponentPlayers.map((player) => {
                  const isTurn = activePlayer?.id === player.id || activePlayer?.socketId === player.socketId;
                  const opponentBans = getPlayerBans(player.id || player.socketId);

                  return (
                    <div
                      key={player.id || player.socketId}
                      className={`mc-bevel p-2 border transition-all space-y-1.5 ${
                        isTurn
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
                                BANNING
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            {opponentBans.length} / {bansPerPlayer} Bans Used
                          </p>
                        </div>
                      </div>

                      {/* Opponent Ban Slots */}
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-neutral-850">
                        {Array.from({ length: bansPerPlayer }).map((_, slotIdx) => {
                          const banItem = opponentBans[slotIdx];
                          if (!banItem) {
                            return (
                              <div
                                key={`opp-${player.id}-slot-${slotIdx}`}
                                className="h-10 border border-dashed border-neutral-800 bg-neutral-900/50 flex items-center justify-center text-neutral-600 font-mono text-[8px]"
                              >
                                #{slotIdx + 1} Empty
                              </div>
                            );
                          }

                          if (banItem.isSkipped) {
                            return (
                              <div
                                key={`opp-${player.id}-skip-${slotIdx}`}
                                className="h-10 mc-bevel-inset bg-neutral-950 p-0.5 flex flex-col items-center justify-center text-center border border-rose-500/30"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-[6px] font-pixel text-rose-400 leading-none">SKIPPED</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`opp-${player.id}-ban-${slotIdx}`}
                              className="h-10 mc-bevel-inset bg-neutral-950 p-0.5 relative flex items-center justify-center border border-rose-500/40"
                              title={banItem.goal?.text}
                            >
                              <GoalIcon goal={banItem.goal} className="w-6 h-6 text-neutral-400 grayscale opacity-60" />
                              <Ban className="w-4 h-4 text-rose-500/70 stroke-[2.5] absolute inset-0 m-auto pointer-events-none" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. VIEWPORT FLOATING FIXED TOOLTIP (Escapes scroll containers) */}
      {hoveredCategory && (
        <div
          className="fixed z-[999999] pointer-events-none flex flex-col w-56 sm:w-64 p-3 bg-neutral-950/95 border border-rose-500/70 shadow-2xl backdrop-blur-md text-left transition-opacity duration-150 animate-fadeIn"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: tooltipPos.placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)',
          }}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[9px] font-mono text-cyan-300 uppercase">CATEGORY DETAILS</span>
            {banState.bannedGoalIds?.includes(hoveredCategory.id) ? (
              <span className="font-pixel text-[8px] text-rose-400 bg-rose-500/20 px-1 py-0.5 border border-rose-500/40">
                BANNED
              </span>
            ) : isCurrentClientTurn ? (
              <span className="font-pixel text-[8px] text-rose-300 bg-rose-500/20 px-1 py-0.5 border border-rose-500/40 animate-pulse">
                CLICK TO BAN
              </span>
            ) : (
              <span className="font-mono text-[8px] text-neutral-400 bg-neutral-900 px-1 py-0.5 border border-neutral-800">
                AVAILABLE
              </span>
            )}
          </div>

          <h4 className="font-bold text-white text-xs leading-snug mb-1.5">
            {hoveredCategory.text}
          </h4>

          {/* Child Variants List / Explanation */}
          {hoveredCategory.variantCount > 1 && (
            <div className="pt-1.5 border-t border-neutral-800 space-y-1">
              <span className="text-[9px] font-mono text-amber-300 font-bold block">
                Excludes All {hoveredCategory.variantCount} Variants:
              </span>
              <p className="text-[10px] text-neutral-400 leading-tight break-words font-mono line-clamp-3">
                {hoveredCategory.variantLabels?.join(', ')}
              </p>
            </div>
          )}

          {/* Banned By Attribution if already banned */}
          {banState.bannedGoalIds?.includes(hoveredCategory.id) && (
            <div className="pt-1.5 mt-1 border-t border-neutral-800 text-[10px] text-rose-300 font-mono">
              Banned by {(banState.bannedGoals || []).find(b => b.categoryId === hoveredCategory.id)?.bannedBy?.username || 'Player'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
