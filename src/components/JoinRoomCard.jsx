import React, { useState, useEffect } from 'react';
import { getMinecraftUuid, getAvatarUrl } from '../services/mojangApi';
import { User, KeyRound, LogIn, Loader2 } from 'lucide-react';

export default function JoinRoomCard({ onJoinRoom, defaultCode = '' }) {
  const [roomCode, setRoomCode] = useState(defaultCode);
  const [username, setUsername] = useState(() => localStorage.getItem('draftboard_username') || 'Alex');
  const [avatarUrl, setAvatarUrl] = useState(() => getAvatarUrl('Alex'));
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [uuid, setUuid] = useState('');

  useEffect(() => {
    if (defaultCode) {
      setRoomCode(defaultCode.toUpperCase());
    }
  }, [defaultCode]);

  useEffect(() => {
    let active = true;
    const cleanName = username.trim();
    if (!cleanName) {
      setAvatarUrl(getAvatarUrl('Alex'));
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
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanName || !cleanCode) return;

    try {
      localStorage.setItem('draftboard_username', cleanName);
    } catch (err) {
      console.warn('[LocalStorage] Could not save username:', err);
    }

    onJoinRoom({
      roomCode: cleanCode,
      username: cleanName,
      uuid: uuid,
      avatarUrl: avatarUrl,
    });
  };

  return (
    <div className="draftout-card rounded-2xl p-6 sm:p-8 shadow-cyan-glow max-w-lg w-full transition-all">
      {/* Header Bar with BORDERLESS Logo */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
        <img 
          src="/logo.svg" 
          alt="Draftout Logo" 
          className="w-10 h-10 object-contain shrink-0 [image-rendering:pixelated]" 
        />
        <div>
          <h2 className="text-2xl font-title text-cyan-300 tracking-wider">
            JOIN ROOM
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">Enter room code & your Minecraft username</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Code Input */}
        <div>
          <label className="block text-xs font-semibold font-pixel text-cyan-300/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. DF-8921"
            maxLength={10}
            required
            className="mc-bevel-inset w-full px-4 py-3 rounded-lg text-cyan-300 text-lg font-mono font-bold tracking-widest placeholder-neutral-600 text-center uppercase focus:border-cyan-400 focus:outline-none"
          />
        </div>

        {/* Username & Dynamic Avatar Preview */}
        <div>
          <label className="block text-xs font-semibold font-pixel text-cyan-300/80 uppercase tracking-wider mb-2">
            Your Minecraft Username
          </label>
          <div className="flex items-center gap-3">
            <div className="mc-bevel-inset relative w-14 h-14 rounded-lg p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              {loadingAvatar ? (
                <Loader2 className="w-6 h-6 text-cyan-300 animate-spin" />
              ) : (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full object-contain rounded transition-all"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://minotar.net/helm/${encodeURIComponent(username.trim() || 'Alex')}/64.png`;
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
                className="mc-bevel-inset w-full pl-9 pr-4 py-3 rounded-lg text-white text-sm placeholder-neutral-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button using font-pixel (MinecraftSeven) */}
        <button
          type="submit"
          className="w-full py-3.5 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-bold text-sm shadow-cyan-glow hover:shadow-cyan-glow-strong transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-neutral-950 group-hover:translate-x-1 transition-transform" />
          <span className="font-pixel text-xs">JOIN LOBBY ROOM</span>
        </button>
      </form>
    </div>
  );
}
