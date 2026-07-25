import React, { useState } from 'react';
import { Download, FileJson, CheckCircle2, RotateCcw, Copy, Check } from 'lucide-react';
import { generateFinalJsonPayload } from '../services/draftEngine';
import { getAvatarUrl } from '../services/mojangApi';

export default function ExportModal({ draftState, onResetLobby }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const finalPayload = generateFinalJsonPayload(draftState);
  const jsonString = JSON.stringify(finalPayload, null, 2);

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
    a.download = 'FINAL.json';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="draftout-panel mc-bevel rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-cyan-400/40">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-title text-cyan-300 tracking-wider">DRAFT COMPLETE!</h2>
              <p className="text-xs text-neutral-400">Board fully populated & ready for Minecraft export</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-neutral-900 text-cyan-300 px-3 py-1.5 rounded border border-cyan-500/30">
            {draftState.gridSize} Board ({draftState.totalSlots} Goals)
          </span>
        </div>

        {/* Stats Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {draftState.players.map((player) => (
            <div key={player.id} className="mc-bevel-inset p-3 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-neutral-950 border border-cyan-500/30">
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
                <p className="text-[11px] text-cyan-300 font-mono">
                  {draftState.claimedCounts[player.id] || 0} Goals
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* JSON Preview Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs font-semibold text-cyan-300/80 hover:text-cyan-200 flex items-center gap-1.5"
            >
              <FileJson className="w-4 h-4 text-cyan-400" />
              {showRaw ? 'Hide Raw FINAL.json Payload' : 'Preview Raw FINAL.json Payload'}
            </button>

            {showRaw && (
              <button
                onClick={handleCopyJson}
                className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-cyan-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            )}
          </div>

          {showRaw && (
            <pre className="mc-bevel-inset p-4 rounded-lg text-[11px] font-mono text-cyan-200 max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
              {jsonString}
            </pre>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleDownload}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Download className="w-5 h-5 text-neutral-950" />
            <span className="font-pixel text-xs">DOWNLOAD FINAL.JSON</span>
          </button>

          <button
            onClick={onResetLobby}
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="font-pixel text-xs">New Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
}
