import React, { useState, useCallback, useMemo } from 'react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';
import BingoCell from './BingoCell';
import soundEngine from '../../soundEngine';
import { Zap, Bot, AlertTriangle } from 'lucide-react';

export default function PlayingBoard() {
  const { state } = useGame();
  const {
    room,
    myBoard,
    myId,
    lastMyPick,
    lastOpponentPick,
    myPicks = [],
    opponentPicks = [],
    numberCallerMap = {},
    falseCallInfo,
    isShaking,
  } = state;

  const gridSize = room?.gridSize || 5;
  const N2 = gridSize * gridSize;
  const isMyTurn = room?.currentTurnPlayerId === myId;
  const calledSet = useMemo(() => new Set(room?.calledNumbers || []), [room?.calledNumbers]);

  const currentTurnPlayer = room?.players?.find((p) => p.id === room.currentTurnPlayerId);
  const isBotGame = room?.isBotGame || room?.players?.some((p) => p.isBot);

  // Compute completed lines and completed cell set for myBoard
  const { completedRows, completedCols, completedMainDiag, completedAntiDiag, completedCells, myLines } = useMemo(() => {
    const rows = [];
    const cols = [];
    const compCells = new Set();

    if (!Array.isArray(myBoard) || myBoard.length !== N2) {
      return { completedRows: [], completedCols: [], completedMainDiag: false, completedAntiDiag: false, completedCells: compCells, myLines: 0 };
    }

    // Rows
    for (let r = 0; r < gridSize; r++) {
      let full = true;
      for (let c = 0; c < gridSize; c++) {
        if (!calledSet.has(myBoard[r * gridSize + c])) { full = false; break; }
      }
      if (full) {
        rows.push(r);
        for (let c = 0; c < gridSize; c++) compCells.add(r * gridSize + c);
      }
    }

    // Cols
    for (let c = 0; c < gridSize; c++) {
      let full = true;
      for (let r = 0; r < gridSize; r++) {
        if (!calledSet.has(myBoard[r * gridSize + c])) { full = false; break; }
      }
      if (full) {
        cols.push(c);
        for (let r = 0; r < gridSize; r++) compCells.add(r * gridSize + c);
      }
    }

    // Main Diag (top-left -> bottom-right)
    let mainDiag = true;
    for (let i = 0; i < gridSize; i++) {
      if (!calledSet.has(myBoard[i * gridSize + i])) { mainDiag = false; break; }
    }
    if (mainDiag) {
      for (let i = 0; i < gridSize; i++) compCells.add(i * gridSize + i);
    }

    // Anti Diag (top-right -> bottom-left)
    let antiDiag = true;
    for (let i = 0; i < gridSize; i++) {
      if (!calledSet.has(myBoard[i * gridSize + (gridSize - 1 - i)])) { antiDiag = false; break; }
    }
    if (antiDiag) {
      for (let i = 0; i < gridSize; i++) compCells.add(i * gridSize + (gridSize - 1 - i));
    }

    const totalLines = rows.length + cols.length + (mainDiag ? 1 : 0) + (antiDiag ? 1 : 0);
    return {
      completedRows: rows,
      completedCols: cols,
      completedMainDiag: mainDiag,
      completedAntiDiag: antiDiag,
      completedCells: compCells,
      myLines: totalLines,
    };
  }, [myBoard, calledSet, gridSize, N2]);

  const hasEnoughLines = myLines >= (room?.targetLines || 3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCellClick = useCallback((idx) => {
    if (!isMyTurn || isSubmitting) return;
    const num = myBoard[idx];
    if (!num || calledSet.has(num)) return;
    setIsSubmitting(true);
    soundEngine.playButtonClickSound();
    socket.emit('pick_number', { number: num });
    setTimeout(() => {
      setIsSubmitting(false);
    }, 400);
  }, [isMyTurn, isSubmitting, myBoard, calledSet]);

  const handleClaimBingo = useCallback(() => {
    soundEngine.init();
    if (!hasEnoughLines) {
      soundEngine.playFalseCallBuzzer();
    } else {
      soundEngine.playButtonClickSound();
    }
    socket.emit('claim_bingo');
  }, [hasEnoughLines]);

  return (
    <div className={`flex flex-col min-h-full w-full max-w-xl mx-auto px-3 py-3 gap-3 ${isShaking ? 'animate-shake' : ''}`}>
      {/* ── PART 1: Top Row — 2 Side-by-Side Call Cards in a 2-column grid ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
        
        {/* Top-Left Card ("1. YOUR CALL" / "TUMHARA NO.") */}
        <div
          className={`glass-card border-l-4 border-cyan-400 p-3 rounded-2xl flex flex-col justify-between transition-all ${
            isMyTurn ? 'ring-2 ring-cyan-400 animate-pulse' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300">
                1. YOUR CALL
              </span>
              {isMyTurn && (
                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-current" /> PICK
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-tight">
                  Clicked & Cut:
                </p>
                <p className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                  {isMyTurn ? 'Your Turn Now' : 'Waiting...'}
                </p>
              </div>

              {/* Large rounded square box displaying last number YOU clicked */}
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl border-2 border-cyan-400 bg-cyan-950/70 flex items-center justify-center font-mono font-black text-xl sm:text-2xl text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)] shrink-0">
                {lastMyPick ? (
                  <span key={lastMyPick} className="pop-anim">
                    {lastMyPick}
                  </span>
                ) : (
                  <span className="text-slate-600 font-normal text-base">-</span>
                )}
              </div>
            </div>
          </div>

          {/* History pills at bottom showing last 3 picks */}
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 overflow-hidden">
            <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">History:</span>
            <div className="flex gap-1 overflow-x-auto custom-scroll">
              {myPicks.length > 0 ? (
                myPicks.map((pick, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-700/60 text-cyan-300"
                  >
                    {pick}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-600 italic">None</span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Card ("2. AI CALL" or "2. OPPONENT CALL") */}
        <div
          className={`glass-card border-r-4 border-amber-400 p-3 rounded-2xl flex flex-col justify-between transition-all ${
            !isMyTurn ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
                {isBotGame ? '2. AI CALL' : '2. OPPONENT CALL'}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 flex items-center gap-1 truncate max-w-[90px]">
                {currentTurnPlayer?.isBot ? (
                  <>
                    <Bot className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <span>{currentTurnPlayer?.nickname || 'Wait'}</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-tight">
                  {lastOpponentPick?.calledBy ? `${lastOpponentPick.calledBy}:` : 'Last Called:'}
                </p>
                <p className="text-[10px] text-amber-400/80 font-mono mt-0.5">
                  {!isMyTurn ? 'Their Move' : 'Pondering...'}
                </p>
              </div>

              {/* Large rounded square box displaying last number they picked */}
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl border-2 border-amber-400 bg-amber-950/70 flex items-center justify-center font-mono font-black text-xl sm:text-2xl text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)] shrink-0">
                {lastOpponentPick?.number ? (
                  <span key={lastOpponentPick.number} className="pop-anim">
                    {lastOpponentPick.number}
                  </span>
                ) : (
                  <span className="text-slate-600 font-normal text-base">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Picks pills at bottom showing last 3 opponent calls with caller names */}
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 overflow-hidden">
            <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">Picks:</span>
            <div className="flex gap-1 overflow-x-auto custom-scroll">
              {opponentPicks.length > 0 ? (
                opponentPicks.map((entry, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60 text-amber-300 truncate"
                    title={`${entry.calledBy}: ${entry.number}`}
                  >
                    {entry.number}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-600 italic">None</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* False Call Penalty Alert */}
      {falseCallInfo && (
        <div className="px-3.5 py-2 rounded-xl border border-red-500/80 bg-red-950/80 text-red-300 text-xs text-center flex items-center justify-center gap-2 animate-bounce-in shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>
            False Call! You have <strong>{falseCallInfo.linesCount}</strong> of <strong>{falseCallInfo.targetLines}</strong> required lines.
          </span>
        </div>
      )}

      {/* ── PART 2: Center — N×N Matrix with Uniform Square Cells & SVG Strike-Through Overlay ── */}
      <div className="w-full flex items-center justify-center py-1 flex-1">
        <div
          className="relative w-full max-w-[390px] sm:max-w-[430px] aspect-square p-2.5 rounded-2xl glass-card mx-auto"
        >
          {/* N×N Matrix Grid */}
          <div
            className="w-full h-full grid gap-1.5 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: N2 }).map((_, idx) => {
              const val = myBoard[idx];
              const isCalled = val ? calledSet.has(val) : false;
              const callerInfo = val ? numberCallerMap[val] : null;
              const isCutByMe = callerInfo?.isMe ?? false;
              const callerLabel = isCutByMe
                ? 'YOU'
                : (callerInfo?.calledBy?.startsWith('Bot') ? 'AI' : callerInfo?.calledBy?.slice(0, 4) || 'AI');

              return (
                <BingoCell
                  key={idx}
                  value={val}
                  index={idx}
                  isCalled={isCalled}
                  isCutByMe={isCutByMe}
                  callerLabel={callerLabel}
                  isInCompletedLine={completedCells.has(idx)}
                  isSelected={false}
                  isMyTurn={isMyTurn && !isSubmitting}
                  mode="playing"
                  gridSize={gridSize}
                  onClick={() => handleCellClick(idx)}
                />
              );
            })}
          </div>

          {/* Absolute SVG Overlay (#strike-svg) drawing emerald strike-through lines */}
          <svg
            id="strike-svg"
            className="absolute inset-0 w-full h-full pointer-events-none z-20 p-2.5"
            viewBox="0 0 100 100"
          >
            {/* Completed Horizontal Rows */}
            {completedRows.map((r) => {
              const y = ((r + 0.5) / gridSize) * 100;
              return (
                <line
                  key={`row-${r}`}
                  x1="3"
                  y1={y}
                  x2="97"
                  y2={y}
                  stroke="#10b981"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                />
              );
            })}

            {/* Completed Vertical Columns */}
            {completedCols.map((c) => {
              const x = ((c + 0.5) / gridSize) * 100;
              return (
                <line
                  key={`col-${c}`}
                  x1={x}
                  y1="3"
                  x2={x}
                  y2="97"
                  stroke="#10b981"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                />
              );
            })}

            {/* Completed Main Diagonal (top-left -> bottom-right) */}
            {completedMainDiag && (
              <line
                x1="4"
                y1="4"
                x2="96"
                y2="96"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]"
              />
            )}

            {/* Completed Anti Diagonal (top-right -> bottom-left) */}
            {completedAntiDiag && (
              <line
                x1="96"
                y1="4"
                x2="4"
                y2="96"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]"
              />
            )}
          </svg>
        </div>
      </div>

      {/* ── PART 3: Bottom — Big Red "BINGO!" Claim Button ── */}
      <div className="w-full mt-auto pt-1 shrink-0">
        <button
          onClick={handleClaimBingo}
          type="button"
          className={`w-full bg-gradient-to-b from-red-500 via-red-600 to-rose-800 border-2 border-red-300/80 text-white rounded-2xl py-3.5 px-5 flex items-center justify-between cursor-pointer btn-3d shadow-xl transition-all ${
            hasEnoughLines ? 'red-btn-ready' : ''
          }`}
        >
          <span className="font-black text-base sm:text-lg tracking-wider flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span>BINGO! CLAIM WIN</span>
          </span>

          <span className="font-mono font-extrabold text-xs sm:text-sm px-3 py-1 rounded-xl bg-black/40 border border-white/20 tracking-wide text-white">
            {myLines} / {room?.targetLines || 3} LINES
          </span>
        </button>
      </div>
    </div>
  );
}
