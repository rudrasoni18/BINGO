import React, { memo } from 'react';

/**
 * BingoCell — Uniform tactile square cell with diagonal cuts and caller attribution.
 */
const BingoCell = memo(function BingoCell({
  value,            // number | 0 | null
  index,            // flat index
  isCalled,         // boolean
  isCutByMe,        // boolean (true if YOU called it, false if opponent/AI called it)
  callerLabel,      // 'YOU' | 'AI' | player short name
  isInCompletedLine,// boolean
  isSelected,       // boolean (for prep swap)
  isMyTurn,         // boolean (in playing mode)
  mode,             // 'prep' | 'playing'
  gridSize = 5,
  onClick,
}) {
  const hasValue = value !== null && value !== 0 && value !== undefined;

  // Dynamic text size based on grid size
  const textSize =
    gridSize <= 5 ? 'text-base sm:text-lg' :
    gridSize <= 7 ? 'text-xs sm:text-sm' :
    gridSize <= 9 ? 'text-[11px] sm:text-xs' :
                    'text-[9px] sm:text-[10px]';

  const baseClasses =
    'bingo-cell flex items-center justify-center font-mono font-extrabold select-none rounded-xl cursor-pointer relative';

  let cellClasses = '';

  if (mode === 'prep') {
    if (!hasValue) {
      cellClasses = 'bg-slate-900/60 border-2 border-dashed border-slate-700 text-slate-500 hover:border-cyan-400 hover:bg-slate-800/80';
    } else if (isSelected) {
      cellClasses = 'bg-cyan-500 border-2 border-white text-slate-950 scale-105 z-10 shadow-[0_0_15px_rgba(34,211,238,0.8)] ring-2 ring-cyan-300';
    } else {
      cellClasses = 'bg-slate-900/95 border-2 border-slate-700 text-white hover:border-cyan-400 hover:bg-slate-800 active:scale-95';
    }
  } else {
    // playing mode
    if (isCalled) {
      const cutTheme = isCutByMe ? 'cell-cut-player' : 'cell-cut-ai';
      const lineClass = isInCompletedLine ? 'cell-in-completed-line' : '';
      cellClasses = `${cutTheme} ${lineClass} border-2 cursor-default`;
    } else {
      const lineClass = isInCompletedLine ? 'cell-in-completed-line' : '';
      if (isMyTurn) {
        cellClasses = `bg-slate-900/95 border-2 border-slate-700 text-white hover:border-cyan-400 hover:bg-slate-850 hover:scale-105 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] ${lineClass}`;
      } else {
        cellClasses = `bg-slate-900/95 border-2 border-slate-700/80 text-white ${lineClass} cursor-default`;
      }
    }
  }

  return (
    <div
      className={`${baseClasses} ${cellClasses} ${textSize}`}
      onClick={onClick}
      role="button"
      aria-label={hasValue ? `Cell ${value}` : 'Empty cell'}
    >
      {/* Cut Visuals for Playing Mode */}
      {isCalled && mode === 'playing' && (
        <>
          {/* Two absolute centered diagonal bars */}
          {isCutByMe ? (
            <>
              <span className="absolute w-4/5 h-0.5 bg-cyan-300 rotate-[-35deg] pointer-events-none z-10 rounded-full shadow-[0_0_6px_#22d3ee]" />
              <span className="absolute w-4/5 h-0.5 bg-cyan-300 rotate-[35deg] pointer-events-none z-10 rounded-full shadow-[0_0_6px_#22d3ee]" />
              <span className="absolute bottom-0.5 right-1 text-[8px] font-extrabold text-cyan-300 tracking-tighter pointer-events-none z-10">
                YOU
              </span>
            </>
          ) : (
            <>
              <span className="absolute w-4/5 h-0.5 bg-amber-400 rotate-[-35deg] pointer-events-none z-10 rounded-full shadow-[0_0_6px_#f59e0b]" />
              <span className="absolute w-4/5 h-0.5 bg-amber-400 rotate-[35deg] pointer-events-none z-10 rounded-full shadow-[0_0_6px_#f59e0b]" />
              <span className="absolute bottom-0.5 right-1 text-[8px] font-extrabold text-amber-300 tracking-tighter pointer-events-none z-10 truncate max-w-[80%]">
                {callerLabel || 'AI'}
              </span>
            </>
          )}
        </>
      )}

      {/* Cell Value */}
      <span className={`relative z-0 ${isCalled ? 'opacity-85 font-black' : ''}`}>
        {hasValue ? value : mode === 'prep' ? '+' : ''}
      </span>
    </div>
  );
});

export default BingoCell;
