import React, { memo } from 'react';

/**
 * BingoHeader — shows B-I-N-G-O letters lighting up as lines are completed.
 * For target <= 5: one letter per line (B=1st line, I=2nd, etc.)
 * For target > 5:  shows all 5 letters + extra star badges / progress tracker
 */
const BingoHeader = memo(function BingoHeader({ linesCompleted, targetLines }) {
  const LETTERS = ['B', 'I', 'N', 'G', 'O'];

  if (targetLines <= 5) {
    return (
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {LETTERS.map((letter, i) => {
          const lit = i < linesCompleted;
          return (
            <span
              key={letter}
              className={`font-black text-2xl sm:text-3xl md:text-4xl transition-all duration-300 ${
                lit
                  ? 'animate-glow'
                  : 'text-slate-700'
              }`}
              style={lit ? { color: '#00f5ff', textShadow: '0 0 15px #00f5ff, 0 0 30px #00f5ff' } : {}}
            >
              {letter}
            </span>
          );
        })}
      </div>
    );
  }

  // Extended mode: all 5 letters lit at full bingo, plus numeric tracker
  const allLit = linesCompleted >= 5;
  return (
    <div className="flex items-center justify-center gap-2">
      {LETTERS.map((letter) => (
        <span
          key={letter}
          className={`font-black text-xl sm:text-2xl transition-all duration-300 ${allLit ? 'animate-glow' : 'text-slate-600'}`}
          style={allLit ? { color: '#00f5ff', textShadow: '0 0 12px #00f5ff' } : {}}
        >
          {letter}
        </span>
      ))}
      <div className="flex items-center gap-1 ml-2">
        {/* Star badges for extra lines beyond 5 */}
        {Array.from({ length: Math.max(0, targetLines - 5) }).map((_, i) => {
          const lineNum = i + 6;
          const lit = linesCompleted >= lineNum;
          return (
            <span
              key={lineNum}
              className={`text-sm font-bold px-1.5 py-0.5 rounded-full border transition-all ${
                lit
                  ? 'border-yellow-400 text-yellow-300 bg-yellow-950'
                  : 'border-slate-700 text-slate-600 bg-slate-900'
              }`}
              style={lit ? { boxShadow: '0 0 6px #ffff00' } : {}}
            >
              ★
            </span>
          );
        })}
        {/* Numeric progress */}
        <span
          className="ml-1 font-black text-base"
          style={{
            color: linesCompleted >= targetLines ? '#39ff14' : '#94a3b8',
            textShadow: linesCompleted >= targetLines ? '0 0 10px #39ff14' : 'none',
          }}
        >
          {linesCompleted}/{targetLines}
        </span>
      </div>
    </div>
  );
});

export default BingoHeader;
