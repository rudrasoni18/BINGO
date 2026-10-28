import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Zap, Copy, Check } from 'lucide-react';
import soundEngine from '../../soundEngine';
import ConnectionBadge from './ConnectionBadge';
import { useGame } from '../../context/GameContext';

export default function TopNavBar() {
  const { state } = useGame();
  const { connected, room } = state;
  const [muted, setMuted] = useState(soundEngine.isMuted());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return soundEngine.subscribe((newMuted) => {
      setMuted(newMuted);
    });
  }, []);

  const handleToggleSound = () => {
    soundEngine.init();
    const nextMuted = soundEngine.toggleMute();
    if (!nextMuted) {
      soundEngine.playCutSound();
    }
  };

  const handleCopyCode = () => {
    if (!room?.roomId) return;
    navigator.clipboard.writeText(room.roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="h-12 w-full bg-slate-900/90 border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between z-40 shrink-0 backdrop-blur-md">
      {/* Brand logo */}
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-lg bg-cyan-950/80 border border-cyan-700/60 shadow-[0_0_10px_rgba(0,245,255,0.2)]">
          <Zap className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1.5 select-none">
          <span
            className="text-base sm:text-lg font-black tracking-wider text-cyan-400"
            style={{ textShadow: '0 0 10px rgba(0, 245, 255, 0.4)' }}
          >
            BINGO
          </span>
          <span className="text-xs sm:text-sm font-black tracking-widest text-purple-400">
            BATTLE
          </span>
        </div>
      </div>

      {/* Middle: Room code & state info if active */}
      {room?.roomId && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            title="Click to copy Room Code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold tracking-wider text-cyan-300 transition-colors"
          >
            <span>ROOM: {room.roomId}</span>
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </button>
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
            {room.state}
          </span>
        </div>
      )}

      {/* Right controls: Connection + Audio Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ConnectionBadge connected={connected} />

        {/* Sleek 3D Mute/Unmute Button */}
        <button
          onClick={handleToggleSound}
          type="button"
          aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
          className={`btn-3d flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all ${
            muted
              ? 'btn-3d-slate text-slate-400 border-red-900/60'
              : 'bg-cyan-950/90 border border-cyan-500/70 text-cyan-300 shadow-[0_3px_0_#0e7490,0_0_12px_rgba(6,182,212,0.3)] hover:bg-cyan-900 active:translate-y-1 active:shadow-[0_1px_0_#0e7490]'
          }`}
        >
          {muted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden xs:inline text-red-400 font-semibold">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden xs:inline font-semibold">Audio On</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
