import React, { useEffect } from 'react';
import { Crown, Trophy, RotateCcw, Bot, User, X, Home } from 'lucide-react';
import soundEngine from '../../soundEngine';
import { fireConfettiExplosion } from '../../confetti';

/**
 * PostMatchModal — All-Players Board Inspection Modal
 */
export default function PostMatchModal({
  winnerName,
  winnerId,
  allBoards = [],
  calledNumbers = [],
  gridSize = 5,
  targetLines = 3,
  onPlayAgain,
  onMainMenu,
  onClose,
  myNickname,
  isBotGame = false,
}) {
  const calledSet = new Set(calledNumbers);

  useEffect(() => {
    fireConfettiExplosion();
  }, []);

  const getCellSize = (N) => {
    if (N <= 5) return 'text-xs sm:text-sm h-6 sm:h-7';
    if (N <= 7) return 'text-[10px] sm:text-xs h-5 sm:h-6';
    return 'text-[9px] h-4 sm:h-5';
  };

  const cellSizeClass = getCellSize(gridSize);

  const handlePlayAgainClick = () => {
    soundEngine.playButtonClickSound();
    if (onPlayAgain) onPlayAgain();
  };

  const handleMainMenuClick = () => {
    soundEngine.playButtonClickSound();
    if (onMainMenu) onMainMenu();
  };

  const handleCloseClick = () => {
    soundEngine.playButtonClickSound();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] glass-card border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(0,245,255,0.25)] flex flex-col overflow-hidden animate-bounce-in">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              <Crown className="w-7 h-7 animate-pulse-fast" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
                  Match Complete
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {calledNumbers.length} numbers called
                </span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-black tracking-wide text-white mt-0.5"
                style={{ textShadow: '0 0 15px rgba(0,245,255,0.4)' }}
              >
                {winnerName ? `${winnerName} Wins!` : 'BINGO VICTORY!'}
              </h2>
            </div>
          </div>

          {/* Quick Winner Badge & Close Button */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-yellow-950/60 border border-yellow-600/50">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-300">Target: {targetLines} Lines</span>
            </div>
            {onClose && (
              <button
                onClick={handleCloseClick}
                type="button"
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close inspection"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body: All-Board Viewer */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              All Players Board Inspection ({allBoards.length})
            </h3>
            <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f5ff] inline-block"></span> Cut Numbers
            </span>
          </div>

          {/* Boards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBoards.map((participant, pIdx) => {
              // STRICTLY ONE WINNER: Match by player.id === winnerId (never by name)
              const isWinner = winnerId ? participant.id === winnerId : participant.isWinner;
              const isYou = participant.name === myNickname;
              const isBot = participant.isBot || participant.name.startsWith('Bot');

              return (
                <div
                  key={participant.id || pIdx}
                  className={`flex flex-col rounded-2xl p-3.5 transition-all ${
                    isWinner
                      ? 'bg-gradient-to-b from-yellow-950/40 to-slate-900 border-2 border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                      : 'bg-slate-850/80 border border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {/* Participant Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {isBot ? (
                        <div className="p-1 rounded-md bg-purple-950 border border-purple-700 text-purple-300">
                          <Bot className="w-3.5 h-3.5 shrink-0" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-md bg-cyan-950 border border-cyan-700 text-cyan-300">
                          <User className="w-3.5 h-3.5 shrink-0" />
                        </div>
                      )}
                      <span className="font-bold text-sm text-white truncate">
                        {participant.name}
                        {isYou && <span className="text-xs text-cyan-400 ml-1">(you)</span>}
                      </span>
                    </div>

                    {/* Lines completed badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isWinner ? (
                        <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-yellow-400 text-slate-950 uppercase shadow-sm">
                          <Crown className="w-3 h-3" /> Winner
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-md">
                          {participant.linesCompleted}/{targetLines} lines
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Participant Mini-Grid */}
                  <div
                    className="grid gap-1 w-full bg-slate-950/60 p-1.5 rounded-xl border border-slate-800"
                    style={{
                      gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.isArray(participant.board) &&
                      participant.board.map((val, cellIdx) => {
                        const isCut = calledSet.has(val);
                        return (
                          <div
                            key={cellIdx}
                            className={`flex items-center justify-center rounded-lg font-mono font-bold select-none aspect-square transition-all ${cellSizeClass} ${
                              isCut
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_6px_rgba(0,245,255,0.6)] scale-[0.98]'
                                : 'bg-slate-800/90 text-slate-400 border border-slate-700/50'
                            }`}
                            title={`Cell ${val} ${isCut ? '(Cut)' : ''}`}
                          >
                            {val}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="px-5 py-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            Inspect opponent grids to analyze cut lines and compare board strategies.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleMainMenuClick}
              type="button"
              className="btn-3d btn-3d-slate flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm tracking-wide"
            >
              <Home className="w-4 h-4 text-slate-300" />
              <span>Main Menu</span>
            </button>

            <button
              onClick={handlePlayAgainClick}
              type="button"
              className="btn-3d btn-3d-cyan flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wide"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isBotGame ? 'Play Again' : 'Play Again / Return to Lobby'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
