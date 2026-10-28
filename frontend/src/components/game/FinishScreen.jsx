import React, { useState, useEffect } from 'react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';
import soundEngine from '../../soundEngine';
import { fireConfettiExplosion } from '../../confetti';
import { Trophy, RotateCcw, Eye, Home } from 'lucide-react';
import PostMatchModal from './PostMatchModal';

export default function FinishScreen() {
  const { state, dispatch } = useGame();
  const { room, myId, myNickname, gameOverData, winnerId: stateWinnerId } = state;
  const [showModal, setShowModal] = useState(true);

  const winner = room?.winner;
  const winnerId = stateWinnerId || room?.winnerId || winner?.id;
  const isWinner = winnerId === myId;
  const isBotGame = room?.isBotGame || room?.players?.some((p) => p.isBot);

  const winnerName = gameOverData?.winnerName || winner?.nickname;
  const allBoards = gameOverData?.allBoards || room?.players?.map((p) => ({
    name: p.nickname,
    board: p.board || [],
    linesCompleted: p.linesCompleted || 0,
    id: p.id,
    isWinner: p.id === winnerId,
    isBot: !!p.isBot,
  })) || [];

  useEffect(() => {
    fireConfettiExplosion();
  }, []);

  const handlePlayAgain = () => {
    soundEngine.playButtonClickSound();
    setShowModal(false);
    socket.emit('play_again');
  };

  const handleMainMenu = () => {
    soundEngine.playButtonClickSound();
    setShowModal(false);
    socket.emit('leave_room');
    dispatch({ type: 'RESET' });
    window.history.pushState(null, '', '/');
  };

  const handleOpenModal = () => {
    soundEngine.playButtonClickSound();
    setShowModal(true);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full px-4 py-8 gap-6 text-center">
      {/* Post-Match All-Players Board Inspection Modal */}
      {showModal && (
        <PostMatchModal
          winnerName={winnerName}
          winnerId={winnerId}
          allBoards={allBoards}
          calledNumbers={room?.calledNumbers || []}
          gridSize={room?.gridSize || 5}
          targetLines={room?.targetLines || 3}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
          onClose={() => setShowModal(false)}
          myNickname={myNickname}
          isBotGame={isBotGame}
        />
      )}

      {/* Confetti-style header */}
      <div className="animate-bounce-in">
        <div className="text-6xl mb-3">{isWinner ? '🏆' : '🎮'}</div>
        <h1
          className="text-4xl font-black tracking-widest"
          style={{
            color: isWinner ? '#ffff00' : '#94a3b8',
            textShadow: isWinner ? '0 0 20px #ffff00, 0 0 40px #ffff00' : 'none',
          }}
        >
          {isWinner ? 'YOU WIN!' : 'GAME OVER'}
        </h1>
      </div>

      {/* Winner info */}
      {winner && (
        <div className="glass-card border-2 border-yellow-500/70 rounded-2xl px-6 py-4 shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-bounce-in">
          <div className="flex items-center gap-3 justify-center">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Winner</p>
              <p className="text-2xl font-black text-yellow-300">{winner.nickname}</p>
              <p className="text-sm text-slate-400">{winner.linesCount} lines completed</p>
            </div>
          </div>
        </div>
      )}

      {/* All players final scores */}
      <div className="w-full max-w-xs glass-card border border-slate-700/80 rounded-2xl p-4 shadow-xl">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-3">Final Standings</p>
        <div className="flex flex-col gap-2">
          {room?.players
            ?.slice()
            ?.sort((a, b) => b.linesCompleted - a.linesCompleted)
            ?.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                  p.id === winnerId
                    ? 'bg-yellow-950/60 border-yellow-600/80'
                    : 'bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <span className="font-black text-slate-400 w-5">{i + 1}.</span>
                <span className="font-semibold text-sm flex-1 text-left truncate">
                  {p.nickname}
                  {p.id === myId && <span className="text-xs text-cyan-400 ml-1 font-bold">(you)</span>}
                </span>
                <span className="font-bold text-sm text-emerald-400">
                  {p.linesCompleted} lines
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          onClick={handleOpenModal}
          type="button"
          className="btn-3d btn-3d-purple w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm tracking-wide"
        >
          <Eye className="w-4 h-4" />
          <span>Inspect Boards</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleMainMenu}
            type="button"
            className="btn-3d btn-3d-slate flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm tracking-wide"
          >
            <Home className="w-4 h-4 text-slate-300" />
            <span>Main Menu</span>
          </button>

          <button
            onClick={handlePlayAgain}
            type="button"
            className="btn-3d btn-3d-cyan flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm tracking-wide"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isBotGame ? 'Play Again' : 'Lobby'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
