import React, { useState, useEffect } from 'react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';
import soundEngine from '../../soundEngine';
import { Zap, LogIn, Plus, Bot } from 'lucide-react';

export default function EntryScreen() {
  const { state, dispatch } = useGame();
  const { connected } = state;

  const [tab, setTab] = useState('host'); // 'host' | 'join' | 'bot'
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [botDifficulty, setBotDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [gridSize, setGridSize] = useState(5);
  const [targetLines, setTargetLines] = useState(3);

  // Check URL if user entered via a direct link e.g. /lobby/:roomId
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/(?:lobby|prep|game)\/([A-Za-z0-9]+)/);
    if (match && match[1]) {
      setRoomId(match[1].toUpperCase());
      setTab('join');
    }
  }, []);

  const handleGridSizeChange = (val) => {
    const newSize = Number(val);
    setGridSize(newSize);
    if (targetLines > newSize) {
      setTargetLines(newSize);
    }
  };

  const handleTabChange = (newTab) => {
    soundEngine.playButtonClickSound();
    setTab(newTab);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    soundEngine.playButtonClickSound();
    dispatch({ type: 'SET_MY_NICKNAME', payload: nickname.trim() });
    socket.emit('create_room', { nickname: nickname.trim(), gridSize, targetLines });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nickname.trim() || !roomId.trim()) return;
    soundEngine.playButtonClickSound();
    dispatch({ type: 'SET_MY_NICKNAME', payload: nickname.trim() });
    socket.emit('join_room', { nickname: nickname.trim(), roomId: roomId.trim().toUpperCase() });
  };

  const handleCreateBotGame = (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    soundEngine.playButtonClickSound();
    dispatch({ type: 'SET_MY_NICKNAME', payload: nickname.trim() });
    // Starts match vs bot and transitions directly to /prep/:roomId
    socket.emit('create_bot_room', {
      nickname: nickname.trim(),
      difficulty: botDifficulty,
      gridSize,
      targetLines: Math.min(gridSize, targetLines || 3),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-8 gap-7">
      {/* Hero Logo */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
          <h1
            className="text-5xl font-black tracking-widest"
            style={{ color: '#00f5ff', textShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff55' }}
          >
            BINGO
          </h1>
          <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
        </div>
        <h2
          className="text-2xl font-black text-purple-400 tracking-[0.3em]"
          style={{ textShadow: '0 0 10px #ff00ff55' }}
        >
          BATTLE
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 font-medium">
          Real-time multiplayer & AI Bot bingo — up to 15 players
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-sm">
        {/* Tab switcher */}
        <div className="flex rounded-2xl overflow-hidden border border-slate-700/80 mb-4 bg-slate-900/90 p-1.5 gap-1.5 shadow-xl glass-card">
          <button
            type="button"
            onClick={() => handleTabChange('host')}
            className={`btn-3d flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all ${
              tab === 'host'
                ? 'btn-3d-cyan'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <Plus className="inline w-3.5 h-3.5 mb-0.5 mr-1" />
            Host
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('join')}
            className={`btn-3d flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all ${
              tab === 'join'
                ? 'btn-3d-purple'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <LogIn className="inline w-3.5 h-3.5 mb-0.5 mr-1" />
            Join
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('bot')}
            className={`btn-3d flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all ${
              tab === 'bot'
                ? 'btn-3d-emerald'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            <Bot className="inline w-3.5 h-3.5 mb-0.5 mr-1" />
            VS Bot
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={
            tab === 'host' ? handleCreate : tab === 'join' ? handleJoin : handleCreateBotGame
          }
          className="flex flex-col gap-4 p-5 rounded-2xl shadow-2xl glass-card"
        >
          <div>
            <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              maxLength={16}
              placeholder="e.g. Maverick"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 font-semibold transition-all"
              autoComplete="off"
              autoFocus
            />
          </div>

          {tab === 'join' && (
            <div>
              <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-1.5">
                Room Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. BGO7X9"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 font-mono font-bold tracking-widest text-lg uppercase transition-all"
                autoComplete="off"
              />
            </div>
          )}

          {tab === 'bot' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-1.5">
                  AI Difficulty
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'easy', label: 'Easy', sub: 'Noob Bot', border: 'border-emerald-500 text-emerald-300' },
                    { id: 'medium', label: 'Medium', sub: 'Balanced', border: 'border-cyan-500 text-cyan-300' },
                    { id: 'hard', label: 'Hard', sub: 'Mastermind', border: 'border-purple-500 text-purple-300' },
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playButtonClickSound();
                        setBotDifficulty(diff.id);
                      }}
                      className={`btn-3d py-2 px-1.5 rounded-xl text-center border transition-all ${
                        botDifficulty === diff.id
                          ? `bg-slate-800 ${diff.border} shadow-lg font-black scale-102`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{diff.label}</div>
                      <div className="text-[10px] opacity-75 leading-tight">{diff.sub}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 italic">
                  {botDifficulty === 'easy' && '• Randomly selects from remaining numbers.'}
                  {botDifficulty === 'medium' && '• Greedily completes lines with highest cuts.'}
                  {botDifficulty === 'hard' && '• 2-Ply Minimax lookahead & grandmaster evaluation.'}
                </p>
              </div>

              {/* Grid Size Slider (5x5 to 10x10) */}
              <div>
                <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5">
                  <span className="font-bold uppercase tracking-wider">Grid Size</span>
                  <span className="font-mono font-black text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-800">
                    {gridSize}×{gridSize} ({gridSize * gridSize} cells)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="1"
                  value={gridSize}
                  onChange={(e) => handleGridSizeChange(e.target.value)}
                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 px-0.5">
                  <span>5×5</span>
                  <span>6×6</span>
                  <span>7×7</span>
                  <span>8×8</span>
                  <span>9×9</span>
                  <span>10×10</span>
                </div>
              </div>

              {/* Target Lines to Win Slider */}
              <div>
                <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5">
                  <span className="font-bold uppercase tracking-wider">Lines to Win</span>
                  <span className="font-mono font-black text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-lg border border-purple-800">
                    {targetLines} {targetLines === 1 ? 'Line' : 'Lines'}
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max={gridSize}
                  step="1"
                  value={targetLines}
                  onChange={(e) => setTargetLines(Number(e.target.value))}
                  className="w-full accent-purple-400 h-2 bg-slate-800 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 px-0.5">
                  <span>3</span>
                  <span>{gridSize}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tactile 3D Action Submit Button */}
          <button
            type="submit"
            disabled={!connected}
            className={`btn-3d py-3.5 rounded-xl font-black text-base tracking-widest mt-1 ${
              tab === 'host'
                ? 'btn-3d-cyan'
                : tab === 'join'
                ? 'btn-3d-purple'
                : 'btn-3d-emerald'
            }`}
          >
            {tab === 'host' && '⚡ CREATE ROOM'}
            {tab === 'join' && '🎮 JOIN ROOM'}
            {tab === 'bot' && '🤖 START MATCH VS BOT'}
          </button>
        </form>
      </div>

      <p className="text-slate-400 text-xs text-center max-w-xs leading-relaxed">
        {tab === 'bot'
          ? 'Single-player match against computer bot. Jumps directly into board prep.'
          : 'Share your Room Code with friends. Up to 15 players. Grid size and rules configurable.'}
      </p>
    </div>
  );
}
