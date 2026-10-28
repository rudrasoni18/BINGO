import React, { useState } from 'react';
import { Copy, Check, Users, Play, Settings, Crown, Zap, Bot, X, Plus } from 'lucide-react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';
import soundEngine from '../../soundEngine';

export default function LobbyScreen() {
  const { state } = useGame();
  const { room, myId } = state;
  const [copied, setCopied] = useState(false);
  const [showBotPicker, setShowBotPicker] = useState(false);

  if (!room) return null;

  const isHost = room.hostId === myId;
  const canStart = room.players.length >= 2 && isHost;
  const isRoomFull = room.players.length >= (room.maxPlayers || 15);

  const handleCopy = () => {
    soundEngine.playButtonClickSound();
    navigator.clipboard.writeText(room.roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSettingsChange = (key, value) => {
    if (!isHost) return;
    soundEngine.playButtonClickSound();
    const updates = {
      gridSize: room.gridSize,
      targetLines: room.targetLines,
      maxPlayers: room.maxPlayers || 15,
      [key]: value,
    };
    // Clamp targetLines when gridSize changes
    if (key === 'gridSize') {
      updates.targetLines = Math.min(updates.targetLines, value);
    }
    socket.emit('update_settings', updates);
  };

  const handleAddBot = (difficulty) => {
    if (!isHost || isRoomFull) return;
    soundEngine.playButtonClickSound();
    socket.emit('add_bot', { difficulty });
    setShowBotPicker(false);
  };

  const handleRemoveBot = (botId) => {
    if (!isHost) return;
    soundEngine.playButtonClickSound();
    socket.emit('remove_bot', { botId });
  };

  const handleStart = () => {
    if (canStart) {
      soundEngine.playButtonClickSound();
      socket.emit('start_game');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-6 gap-6">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-4xl font-black tracking-widest text-shadow-neon-cyan"
          style={{ color: '#00f5ff' }}
        >
          ⚡ BINGO BATTLE
        </h1>
        <p className="text-slate-400 text-sm mt-1">Waiting for players…</p>
      </div>

      {/* Room ID card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Room Code</p>
        <div className="flex items-center gap-3">
          <span
            className="text-4xl font-black tracking-[0.2em] font-mono"
            style={{ color: '#00f5ff', textShadow: '0 0 20px #00f5ff' }}
          >
            {room.roomId}
          </span>
          <button
            onClick={handleCopy}
            className="btn-3d btn-3d-slate ml-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span className="text-slate-300">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Settings badges */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold">
            {room.gridSize}×{room.gridSize} Grid
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-semibold">
            {room.targetLines} Lines to Win
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-300 font-semibold">
            {room.players.length}/{room.maxPlayers || 15} Players
          </span>
        </div>
      </div>

      {/* Host settings (only visible to host) */}
      {isHost && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-cyan-400" />
            <p className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Host Settings</p>
          </div>

          {/* Grid size slider */}
          <label className="block mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Grid Size</span>
              <span className="font-bold text-white">
                {room.gridSize}×{room.gridSize} ({room.gridSize * room.gridSize} numbers)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="10"
              value={room.gridSize}
              onChange={(e) => handleSettingsChange('gridSize', Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>5×5</span>
              <span>10×10</span>
            </div>
          </label>

          {/* Target lines slider */}
          <label className="block mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Lines to Win</span>
              <span className="font-bold text-white">{room.targetLines} lines</span>
            </div>
            <input
              type="range"
              min="3"
              max={room.gridSize}
              value={room.targetLines}
              onChange={(e) => handleSettingsChange('targetLines', Number(e.target.value))}
              className="w-full accent-purple-400 h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>3</span>
              <span>{room.gridSize}</span>
            </div>
          </label>

          {/* Max players slider */}
          <label className="block">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Max Players</span>
              <span className="font-bold text-white">{room.maxPlayers || 15} players</span>
            </div>
            <input
              type="range"
              min="2"
              max="15"
              value={room.maxPlayers || 15}
              onChange={(e) => handleSettingsChange('maxPlayers', Number(e.target.value))}
              className="w-full accent-orange-400 h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>2</span>
              <span>15</span>
            </div>
          </label>
        </div>
      )}

      {/* Player list */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Players ({room.players.length}/{room.maxPlayers || 15})
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scroll pr-1">
          {room.players.map((p) => {
            const isBot = p.isBot || p.id.startsWith('bot_');

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  p.id === myId
                    ? 'bg-slate-800 border border-cyan-800'
                    : isBot
                    ? 'bg-purple-950/30 border border-purple-900/60'
                    : 'bg-slate-850'
                }`}
              >
                {p.isHost ? (
                  <Crown className="w-4 h-4 text-yellow-400 shrink-0" />
                ) : isBot ? (
                  <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <Zap className="w-4 h-4 text-slate-500 shrink-0" />
                )}

                <span
                  className={`font-semibold text-sm truncate ${
                    p.id === myId ? 'text-cyan-300' : isBot ? 'text-purple-200' : 'text-white'
                  }`}
                >
                  {p.nickname}
                  {p.id === myId && <span className="text-xs text-slate-500 ml-1">(you)</span>}
                </span>

                {isBot && p.difficulty && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/60">
                    {p.difficulty}
                  </span>
                )}

                {p.isHost && (
                  <span className="ml-auto text-xs text-yellow-400 font-bold">HOST</span>
                )}

                {isHost && isBot && (
                  <button
                    onClick={() => handleRemoveBot(p.id)}
                    title="Remove Bot"
                    className="ml-auto p-1 rounded hover:bg-red-950/80 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Start button */}
      {isHost && (
        <button
          onClick={handleStart}
          disabled={!canStart}
          type="button"
          className={`btn-3d w-full max-w-md py-4 rounded-2xl font-black text-xl tracking-widest ${
            canStart
              ? 'btn-3d-cyan'
              : 'btn-3d-slate opacity-50 cursor-not-allowed'
          }`}
        >
          <Play className="inline w-5 h-5 mb-0.5 mr-2" />
          {canStart
            ? '⚡ START GAME'
            : `Need ${2 - room.players.length} more player${2 - room.players.length !== 1 ? 's' : ''}`}
        </button>
      )}
      {!isHost && (
        <p className="text-slate-400 text-sm animate-pulse">Waiting for host to start…</p>
      )}
    </div>
  );
}
