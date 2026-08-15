import React, { useState, useEffect } from 'react';
import { getMinecraftUuid, getAvatarUrl } from '../services/mojangApi';
import { User, Loader2, CheckCircle2 } from 'lucide-react';

export default function CreateRoomCard({ onCreateRoom }) {
  const [username, setUsername] = useState(() => localStorage.getItem('draftboard_username') || 'Steve');
  const [avatarUrl, setAvatarUrl] = useState(() => getAvatarUrl('Steve'));
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [uuid, setUuid] = useState('');

  useEffect(() => {
    let active = true;
    const cleanName = username.trim();
    if (!cleanName) {
      setAvatarUrl(getAvatarUrl('Steve'));
      return;
    }

    setLoadingAvatar(true);
    const timer = setTimeout(async () => {
      const { uuid: resolvedUuid, avatarUrl: resolvedAvatar } = await getMinecraftUuid(cleanName);
      if (active) {
        setUuid(resolvedUuid);
        setAvatarUrl(resolvedAvatar || getAvatarUrl(cleanName));
        setLoadingAvatar(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = username.trim();
    if (!cleanName) return;

    try {
      localStorage.setItem('draftboard_username', cleanName);
    } catch (err) {
      console.warn('[LocalStorage] Could not save username:', err);
    }

    onCreateRoom({
      hostUsername: cleanName,
      hostUuid: uuid,
      hostAvatar: avatarUrl,
      boardSize: '5x5',
      turnTime: 10,
      goalPool: 'queue',
    });
  };

  return (
    <div className="draftout-card p-6 sm:p-8 max-w-lg w-full transition-all">
      {/* Header Bar with BORDERLESS Logo */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
        <img
          src="/logo.svg"
          alt="Draftout Logo"
          className="w-10 h-10 object-contain shrink-0 [image-rendering:pixelated]"
        />
        <div>
          <h2 className="text-2xl font-title text-white tracking-wider">
            CREATE ROOM
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">Enter your username to host a custom lobby</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username & Dynamic Avatar Preview */}
        <div>
          <label className="block text-xs font-semibold font-pixel text-white uppercase tracking-wider mb-2">
            Host Minecraft Username
          </label>
          <div className="flex items-center gap-3">
            <div className="mc-bevel-inset relative w-14 h-14 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              {loadingAvatar ? (
                <Loader2 className="w-6 h-6 text-cyan-300 animate-spin" />
              ) : (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full object-contain transition-all"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://minotar.net/helm/${encodeURIComponent(username.trim() || 'Steve')}/64.png`;
                  }}
                />
              )}
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400/50">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter MC Username..."
                maxLength={16}
                required
                className="mc-bevel-inset w-full pl-9 pr-4 py-3 text-white text-sm placeholder-neutral-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Info Note */}
        <p className="text-[11px] text-cyan-400/70 bg-cyan-950/30 p-3 border border-cyan-500/20 leading-relaxed font-mono">
          💡 You can customize Board Size and Picking Time Limit directly inside your lobby room!
        </p>

        {/* Action Button using font-pixel (MinecraftSeven) */}
        <button
          type="submit"
          className="w-full py-3.5 px-6 bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-bold text-sm shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.75)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-neutral-950 group-hover:scale-110 transition-transform" />
          <span className="font-pixel text-xs">CREATE ROOM & GENERATE CODE</span>
        </button>
      </form>
    </div>
  );
}
