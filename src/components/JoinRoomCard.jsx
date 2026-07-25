import React, { useState, useEffect } from 'react';
import { getMinecraftUuid, getAvatarUrl } from '../services/mojangApi';
import { User, KeyRound, LogIn, Loader2, AlertCircle } from 'lucide-react';

export default function JoinRoomCard({ onJoinRoom, defaultCode = '', errorMessage = '' }) {
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
            JOIN ROOM
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">Enter room code & your Minecraft username</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Code Input */}
        <div>
          <label className="block text-xs font-semibold font-pixel text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. X7K9P2"
            maxLength={6}
            required
            className="mc-bevel-inset w-full px-4 py-3 text-cyan-300 text-lg font-mono font-bold tracking-widest placeholder-neutral-600 text-center uppercase focus:border-cyan-400 focus:outline-none"
          />
          {errorMessage && (
            <p className="text-xs text-rose-400 font-pixel mt-2 flex items-center justify-center gap-1.5 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>

        {/* Username & Dynamic Avatar Preview */}
        <div>
          <label className="block text-xs font-semibold font-pixel text-white uppercase tracking-wider mb-2">
            Your Minecraft Username
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
                className="mc-bevel-inset w-full pl-9 pr-4 py-3 text-white text-sm placeholder-neutral-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button using font-pixel (MinecraftSeven) */}
        <button
          type="submit"
          className="w-full py-3.5 px-6 bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-bold text-sm shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.75)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-neutral-950 group-hover:translate-x-1 transition-transform" />
          <span className="font-pixel text-xs">JOIN LOBBY ROOM</span>
        </button>
      </form>
    </div>
  );
}
