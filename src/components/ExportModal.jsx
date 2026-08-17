import React, { useState } from 'react';
import { Download, FileJson, CheckCircle2, RotateCcw, Copy, Check, Layers, Ban, XCircle } from 'lucide-react';
import { generateFinalJsonPayload } from '../services/draftEngine';
import { getAvatarUrl } from '../services/mojangApi';
import GoalIcon from './GoalIcon';

export default function ExportModal({ draftState, lobbyData, onResetLobby }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const banState = lobbyData?.banState || null;
  const hasBanPhase = Boolean(lobbyData?.enableBanPhase || banState?.bannedGoals?.length > 0);

  const getPlayerBans = (playerId) => {
    if (!banState || !banState.bannedGoals) return [];
    return banState.bannedGoals.filter(b => b.bannedBy?.id === playerId || b.bannedBy?.socketId === playerId);
  };

  const finalPayload = generateFinalJsonPayload(draftState);
  const jsonString = JSON.stringify(finalPayload, null, 2);

  const cols = draftState.cols || 5;
  const rows = draftState.rows || 5;
  const board = draftState.board || [];

  const getPlayerAvatar = (player) => {
    if (player && player.avatarUrl && !player.avatarUrl.includes('undefined')) {
      return player.avatarUrl;
    }
    return getAvatarUrl(player?.uuid || player?.username);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BOARD.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="draftout-panel mc-bevel max-w-3xl w-full p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 shadow-2xl border border-cyan-400/40 my-auto max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-cyan-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-title text-white tracking-wider">DRAFT COMPLETE!</h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Board fully drafted and ready for export</p>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-mono font-bold bg-neutral-900 text-cyan-300 px-2.5 py-1 border border-cyan-500/30 shrink-0">
            {draftState.gridSize} Board ({draftState.totalSlots} Goals)
          </span>
        </div>

        {/* Stats Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {(draftState.players || []).map((player) => {
            const playerBans = getPlayerBans(player.id || player.socketId);
            return (
              <div key={player.id} className="mc-bevel-inset p-2.5 flex flex-col justify-between gap-1.5 bg-neutral-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 overflow-hidden bg-neutral-900 border border-cyan-500/30">
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
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{player.username}</p>
                    <p className="text-[10px] sm:text-[11px] text-cyan-300 font-mono">
                      {draftState.claimedCounts?.[player.id] || 0} Goals
                    </p>
                  </div>
                </div>

                {/* Banned Goals mini row if Ban Phase was on */}
                {hasBanPhase && playerBans.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-850">
                    <span className="text-[8px] font-pixel text-neutral-500">BANS:</span>
                    <div className="flex items-center gap-1">
                      {playerBans.map((bItem, bIdx) => (
                        bItem.isSkipped ? (
                          <div key={`export-ban-skip-${bIdx}`} className="w-5 h-5 mc-bevel-inset bg-neutral-900 p-0.5 relative flex items-center justify-center border border-neutral-800" title="Ban Skipped (Timeout)">
                            <XCircle className="w-3 h-3 text-neutral-500" />
                          </div>
                        ) : (
                          <div key={`export-ban-${bIdx}`} className="w-5 h-5 mc-bevel-inset bg-neutral-900 p-0.5 relative flex items-center justify-center border border-rose-500/30" title={bItem.goal?.text}>
                            <GoalIcon goal={bItem.goal} className="w-full h-full text-neutral-400 grayscale opacity-60" />
                            <Ban className="w-3 h-3 text-rose-500 stroke-[2.5] absolute inset-0 m-auto pointer-events-none" />
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Visual Final Board Grid Section */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-pixel text-cyan-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> FINAL BOARD
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              Hover slots to inspect details
            </span>
          </div>

          <div className="mc-bevel-inset bg-neutral-950 p-2 sm:p-3 overflow-visible">
            <div
              className="grid gap-1 sm:gap-1.5 mx-auto overflow-visible"
              style={{
                maxWidth: '420px',
                aspectRatio: '1 / 1',
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              }}
            >
              {board.map((slotItem, index) => {
                const isClaimed = !!slotItem;
                const isTopHalf = index < cols * 2;

                return (
                  <div
                    key={index}
                    className={`aspect-square w-full h-full p-0.5 flex flex-col justify-between items-center relative group transition-all ${
                      isClaimed
                        ? 'mc-bevel-inset bg-neutral-900 border border-cyan-500/40 hover:border-cyan-300 cursor-pointer z-10 hover:z-50'
                        : 'mc-slot bg-neutral-950/60 border border-neutral-800'
                    }`}
                  >
                    {/* Slot Number Tag */}
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-neutral-500/80 absolute top-0.5 left-1 z-10 pointer-events-none">
                      {index + 1}
                    </span>

                    {/* Slot Icon */}
                    {isClaimed ? (
                      <div className="w-full h-full p-1 flex items-center justify-center overflow-hidden">
                        <GoalIcon goal={slotItem} className="w-full h-full text-cyan-300 object-contain" />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-neutral-700 font-mono text-[8px]">Empty</span>
                      </div>
                    )}

                    {/* Hover Tooltip */}
                    {isClaimed && (
                      <div
                        className={`absolute z-[100] left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col w-48 sm:w-52 p-2.5 bg-neutral-950/95 border border-cyan-400/60 shadow-2xl pointer-events-none text-left backdrop-blur-md ${
                          isTopHalf ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}
                      >
                        <p className="text-[9px] font-mono text-cyan-300 font-bold uppercase mb-0.5">
                          Slot {index + 1}
                        </p>
                        <p className="text-xs font-bold text-white leading-snug mb-1.5">
                          {slotItem.text}
                        </p>
                        {slotItem.claimedBy && (
                          <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-800">
                            <div className="w-4 h-4 overflow-hidden p-0.1 shrink-0 bg-neutral-900 flex items-center justify-center">
                              <img
                                src={getPlayerAvatar(slotItem.claimedBy)}
                                alt={slotItem.claimedBy?.username || 'Player'}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://minotar.net/helm/${encodeURIComponent(
                                    slotItem.claimedBy?.username || 'Steve'
                                  )}/64.png`;
                                }}
                              />
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-neutral-300 font-semibold truncate">
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

        {/* JSON Preview Toggle */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs font-semibold text-white hover:text-cyan-200 flex items-center gap-1.5 cursor-pointer"
            >
              <FileJson className="w-4 h-4 text-cyan-400" />
              {showRaw ? 'Hide Raw BOARD.json Payload' : 'Preview Raw BOARD.json Payload'}
            </button>

            {showRaw && (
              <button
                onClick={handleCopyJson}
                className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-cyan-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            )}
          </div>

          {showRaw && (
            <pre className="mc-bevel-inset p-3 sm:p-4 text-[11px] font-mono text-cyan-200 max-h-40 sm:max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
              {jsonString}
            </pre>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 sm:pt-2 shrink-0">
          <button
            onClick={handleDownload}
            className="w-full sm:flex-1 py-3 px-6 bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.75)] active:scale-98 cursor-pointer"
          >
            <Download className="w-5 h-5 text-neutral-950" />
            <span className="font-pixel text-xs">DOWNLOAD BOARD.JSON</span>
          </button>

          <button
            onClick={onResetLobby}
            className="w-full sm:w-auto py-3 px-6 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-400/40 text-neutral-300 text-xs font-bold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.35)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="font-pixel text-xs">New Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
}

