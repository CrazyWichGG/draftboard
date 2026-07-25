import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Users, 
  ShieldCheck, 
  Grid, 
  Clock, 
  Play, 
  LogOut, 
  Crown,
  CheckCircle,
  Clock3,
  Settings
} from 'lucide-react';
import { getAvatarUrl } from '../services/mojangApi';
import { toggleReadySocket, startDraftSocket, updateRoomSettingsSocket } from '../services/socket';

export default function LobbyRoomView({ lobbyData, onLeaveLobby }) {
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const players = lobbyData.players || [];
  const currentClientPlayer = players.find(p => p.isCurrentClient) || players[0];
  const isHost = currentClientPlayer?.isHost || false;
  const isReady = currentClientPlayer?.isReady ?? true;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobbyData.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = () => {
    toggleReadySocket(lobbyData.roomCode);
  };

  const handleBoardSizeChange = (newSize) => {
    if (!isHost) return;
    updateRoomSettingsSocket(lobbyData.roomCode, {
      boardSize: newSize,
      turnTime: lobbyData.turnTime,
    });
  };

  const handleTurnTimeChange = (newTime) => {
    if (!isHost) return;
    updateRoomSettingsSocket(lobbyData.roomCode, {
      boardSize: lobbyData.boardSize,
      turnTime: newTime,
    });
  };

  const canStartDraft = players.length >= 2 && players.every(p => p.isReady);

  const handleLaunchDraft = async () => {
    setErrorMsg('');
    try {
      await startDraftSocket(lobbyData.roomCode);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const gridOptions = ['3x3', '4x4', '5x5', '6x6', '7x7'];
  const timeOptions = [10, 15, 30, 45, 60];

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6">
      {/* Room Code Header Bar with BORDERLESS Logo */}
      <div className="draftout-panel mc-bevel rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="Draftout Logo" 
            className="w-12 h-12 object-contain shrink-0 [image-rendering:pixelated]" 
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-sm font-title text-cyan-300 tracking-wide uppercase">DRAFT LOBBY ACTIVE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              ROOM CODE: <span className="font-mono text-cyan-300 font-bold bg-neutral-900 px-3 py-1 rounded-lg border border-cyan-400/30">{lobbyData.roomCode}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleCopyCode}
            className="flex-1 md:flex-none py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-cyan-300" />
                <span className="text-cyan-300 font-pixel text-[10px]">COPIED TO CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span className="font-pixel text-[10px]">COPY ROOM CODE</span>
              </>
            )}
          </button>

          <button
            onClick={onLeaveLobby}
            className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-pixel text-[10px]">LEAVE</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-xs px-4 py-3 rounded-xl text-center">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Connected Players List (Left 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-pixel text-cyan-300 tracking-wider">
                CONNECTED PLAYERS ({players.length} / 4)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {players.map((player) => (
              <div
                key={player.id || player.socketId}
                className={`draftout-panel mc-bevel rounded-xl p-4 border transition-all flex items-center gap-4 relative overflow-hidden ${
                  player.isCurrentClient
                    ? 'border-cyan-400/60 bg-cyan-950/20'
                    : 'border-neutral-800 bg-neutral-900/60'
                }`}
              >
                {/* Minecraft Bevel Player Head Slot */}
                <div className="mc-bevel-inset relative w-14 h-14 rounded-lg p-1 shrink-0 overflow-hidden shadow-inner">
                  <img
                    src={player.avatarUrl}
                    alt={player.username}
                    className="w-full h-full object-contain rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getAvatarUrl(player.username);
                    }}
                  />
                  {player.isHost && (
                    <div className="absolute top-0 right-0 bg-amber-400 text-neutral-950 p-1 rounded-bl-md shadow">
                      <Crown className="w-3 h-3 fill-neutral-950" />
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base truncate">
                      {player.username}
                    </span>
                    {player.isCurrentClient && (
                      <span className="text-[9px] font-pixel bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-400/30">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {player.isHost ? (
                      <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Host
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">Player</span>
                    )}

                    <span className="text-neutral-600">•</span>

                    {player.isReady ? (
                      <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-cyan-400" /> Ready
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                        <Clock3 className="w-3 h-3" /> Waiting
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="rounded-xl p-4 border border-dashed border-cyan-500/20 bg-neutral-950/40 flex items-center justify-center gap-2 text-neutral-600 text-xs font-medium min-h-[82px]"
              >
                <Users className="w-4 h-4 opacity-40 text-cyan-400" />
                <span className="font-mono">Waiting for slot #{players.length + index + 1}...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Settings Control Panel (Right 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="draftout-panel mc-bevel rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <h3 className="text-xs font-pixel text-cyan-300 tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                ROOM CONFIGURATION
              </h3>
              {isHost ? (
                <span className="text-[9px] font-pixel text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  EDITABLE (HOST)
                </span>
              ) : (
                <span className="text-[9px] font-pixel text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  LOCKED
                </span>
              )}
            </div>

            {/* Board Size Selector with DEFAULT badge */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-cyan-300/80 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-cyan-400" />
                  Board Size Grid
                </span>
                <span className="font-mono text-cyan-300 font-bold">{lobbyData.boardSize}</span>
              </label>

              <div className="grid grid-cols-5 gap-1.5">
                {gridOptions.map((size) => {
                  const isDefault = size === '5x5';
                  const isSelected = lobbyData.boardSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleBoardSizeChange(size)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-cyan-400/20 border-cyan-400 text-cyan-200 shadow-cyan-glow'
                          : isHost
                          ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-cyan-500/40 hover:text-neutral-200 cursor-pointer'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-600 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span>{size}</span>
                      {isDefault && (
                        <span className="text-[7px] font-pixel text-amber-300 bg-amber-400/20 px-1 rounded leading-none">
                          DEFAULT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Turn Timer Selector with DEFAULT badge */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-cyan-300/80 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Turn Time Limit
                </span>
                <span className="font-mono text-cyan-300 font-bold">{lobbyData.turnTime}s</span>
              </label>

              <div className="grid grid-cols-5 gap-1.5">
                {timeOptions.map((time) => {
                  const isDefault = time === 15;
                  const isSelected = Number(lobbyData.turnTime) === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleTurnTimeChange(time)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-cyan-400/20 border-cyan-400 text-cyan-200 shadow-cyan-glow'
                          : isHost
                          ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-cyan-500/40 hover:text-neutral-200 cursor-pointer'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-600 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span>{time}s</span>
                      {isDefault && (
                        <span className="text-[7px] font-pixel text-amber-300 bg-amber-400/20 px-1 rounded leading-none">
                          DEFAULT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total Goals Summary */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-cyan-500/20 flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Total Grid Goals:</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {parseInt(lobbyData.boardSize) * parseInt(lobbyData.boardSize)} Goals
              </span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-cyan-500/20 space-y-3">
              <button
                onClick={handleToggleReady}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                  isReady
                    ? 'bg-cyan-400/20 border-cyan-400 text-cyan-200 font-pixel'
                    : 'bg-amber-500/20 border-amber-400 text-amber-300 font-pixel'
                }`}
              >
                {isReady ? '✓ READY FOR DRAFT' : 'MARK AS READY'}
              </button>

              {isHost ? (
                <button
                  disabled={!canStartDraft}
                  onClick={handleLaunchDraft}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                    canStartDraft
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-pixel cursor-pointer shadow-cyan-glow'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span className="font-pixel">{players.length < 2 ? 'NEED 2+ PLAYERS TO START' : 'START DRAFT PHASE'}</span>
                </button>
              ) : (
                <div className="p-3 text-center text-xs text-neutral-400 bg-neutral-900 rounded-xl border border-cyan-500/15 font-mono">
                  Waiting for host to start the draft...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
