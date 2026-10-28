import React, { useState, useEffect, useCallback, useMemo } from 'react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';
import BingoCell from './BingoCell';
import soundEngine from '../../soundEngine';
import { Shuffle, Lock, Check, RotateCcw, Sparkles, Layers } from 'lucide-react';
import usePrepTimer from '../../hooks/usePrepTimer';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PrepBoard() {
  const { state, dispatch } = useGame();
  const { room, myBoard, myId } = state;
  const gridSize = room?.gridSize || 5;
  const N2 = gridSize * gridSize;
  const secondsLeft = usePrepTimer(room?.prepTimerEnd);

  const myPlayer = room?.players?.find((p) => p.id === myId);
  const isLockedIn = myPlayer?.lockedIn || false;

  // Board local state (array of size N2, with numbers 1..N2 or 0 for empty)
  const [board, setBoard] = useState(() => {
    if (Array.isArray(myBoard) && myBoard.length === N2 && !myBoard.includes(0) && !myBoard.includes(null)) {
      return myBoard;
    }
    const nums = Array.from({ length: N2 }, (_, i) => i + 1);
    return shuffleArray(nums);
  });

  // Track placement history for Undo in manual mode
  const [placementHistory, setPlacementHistory] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isManualMode, setIsManualMode] = useState(false);

  // Synchronize initial board to context and socket if needed
  useEffect(() => {
    if (myBoard && myBoard.length === N2) {
      setBoard(myBoard);
    }
  }, [myBoard, N2]);

  // Next number to place (smallest number 1..N2 not yet in board)
  const nextNumber = useMemo(() => {
    const placed = new Set(board.filter((n) => n && n > 0));
    for (let i = 1; i <= N2; i++) {
      if (!placed.has(i)) return i;
    }
    return null; // All numbers placed
  }, [board, N2]);

  // Helper to auto-fill remaining numbers
  const autoFillRemaining = useCallback((currentBoard) => {
    const placed = new Set(currentBoard.filter((n) => n && n > 0));
    const remaining = [];
    for (let i = 1; i <= N2; i++) {
      if (!placed.has(i)) remaining.push(i);
    }
    const shuffled = shuffleArray(remaining);
    let r = 0;
    const filled = currentBoard.map((val) => (val && val > 0 ? val : shuffled[r++]));
    return filled;
  }, [N2]);

  // Auto-fill and lock when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && !isLockedIn) {
      const finalBoard = autoFillRemaining(board);
      setBoard(finalBoard);
      dispatch({ type: 'YOUR_BOARD', payload: { board: finalBoard } });
      socket.emit('board_update', { board: finalBoard });
      socket.emit('lock_ready');
    }
  }, [secondsLeft, isLockedIn, board, autoFillRemaining, dispatch]);

  // 1. "Random Fill 1–N²" button handler
  const handleRandomFill = useCallback(() => {
    if (isLockedIn) return;
    soundEngine.playCutSound();
    const nums = Array.from({ length: N2 }, (_, i) => i + 1);
    const shuffled = shuffleArray(nums);
    setBoard(shuffled);
    setPlacementHistory([]);
    setSelectedIndex(null);
    setIsManualMode(false);
    dispatch({ type: 'YOUR_BOARD', payload: { board: shuffled } });
    socket.emit('board_update', { board: shuffled });
  }, [N2, isLockedIn, dispatch]);

  // 2. "Clear & Fill 1→N²" button handler
  const handleClearAndFill = useCallback(() => {
    if (isLockedIn) return;
    soundEngine.playCutSound();
    const emptyBoard = new Array(N2).fill(0);
    setBoard(emptyBoard);
    setPlacementHistory([]);
    setSelectedIndex(null);
    setIsManualMode(true);
    dispatch({ type: 'YOUR_BOARD', payload: { board: emptyBoard } });
  }, [N2, isLockedIn, dispatch]);

  // Undo last manual placement
  const handleUndo = useCallback(() => {
    if (isLockedIn || placementHistory.length === 0) return;
    soundEngine.playButtonClickSound();
    const newHistory = [...placementHistory];
    const lastIdx = newHistory.pop();
    const newBoard = [...board];
    newBoard[lastIdx] = 0;
    setBoard(newBoard);
    setPlacementHistory(newHistory);
    setSelectedIndex(null);
    dispatch({ type: 'YOUR_BOARD', payload: { board: newBoard } });
  }, [isLockedIn, placementHistory, board, dispatch]);

  // Fill Rest of remaining empty cells
  const handleFillRest = useCallback(() => {
    if (isLockedIn) return;
    soundEngine.playCutSound();
    const filled = autoFillRemaining(board);
    setBoard(filled);
    setPlacementHistory([]);
    setSelectedIndex(null);
    setIsManualMode(false);
    dispatch({ type: 'YOUR_BOARD', payload: { board: filled } });
    socket.emit('board_update', { board: filled });
  }, [isLockedIn, board, autoFillRemaining, dispatch]);

  // Cell Click Handler: Handles both manual placement and swap mode
  const handleCellClick = useCallback((idx) => {
    if (isLockedIn) return;
    const currentVal = board[idx];

    // If cell is empty and we have a nextNumber to place
    if ((!currentVal || currentVal === 0) && nextNumber !== null) {
      soundEngine.playButtonClickSound();
      const newBoard = [...board];
      newBoard[idx] = nextNumber;
      const newHistory = [...placementHistory, idx];
      setBoard(newBoard);
      setPlacementHistory(newHistory);
      setSelectedIndex(null);

      // If this was the last number, send update to server
      const placedSet = new Set(newBoard.filter((n) => n && n > 0));
      if (placedSet.size === N2) {
        dispatch({ type: 'YOUR_BOARD', payload: { board: newBoard } });
        socket.emit('board_update', { board: newBoard });
      }
      return;
    }

    // If cell is filled, allow swapping
    soundEngine.playButtonClickSound();
    if (selectedIndex === null) {
      if (currentVal && currentVal > 0) {
        setSelectedIndex(idx);
      }
    } else if (selectedIndex === idx) {
      setSelectedIndex(null); // deselect
    } else {
      // Swap cell at selectedIndex and idx
      soundEngine.playCutSound();
      const newBoard = [...board];
      [newBoard[selectedIndex], newBoard[idx]] = [newBoard[idx], newBoard[selectedIndex]];
      setSelectedIndex(null);
      setBoard(newBoard);

      const placedSet = new Set(newBoard.filter((n) => n && n > 0));
      if (placedSet.size === N2) {
        dispatch({ type: 'YOUR_BOARD', payload: { board: newBoard } });
        socket.emit('board_update', { board: newBoard });
      }
    }
  }, [isLockedIn, board, nextNumber, placementHistory, selectedIndex, N2, dispatch]);

  // Lock & Ready Click
  const handleLockReady = useCallback(() => {
    if (isLockedIn) return;
    soundEngine.playButtonClickSound();
    const finalBoard = autoFillRemaining(board);
    setBoard(finalBoard);
    dispatch({ type: 'YOUR_BOARD', payload: { board: finalBoard } });
    socket.emit('board_update', { board: finalBoard });
    socket.emit('lock_ready');
  }, [isLockedIn, board, autoFillRemaining, dispatch]);

  const timerColor = secondsLeft > 15 ? 'text-emerald-400' : secondsLeft > 7 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col min-h-full w-full max-w-xl mx-auto px-3 py-3 gap-3">
      {/* Top Header Card */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl glass-card shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
              Board Prep
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {gridSize}×{gridSize} ({N2} cells)
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {nextNumber !== null
              ? 'Tap empty boxes to place numbers, or swap filled boxes.'
              : 'Tap any two cells to swap their positions.'}
          </p>
        </div>

        {/* Dynamic Prep Timer Display */}
        <div className="text-right pl-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Time Left</p>
          <p className={`text-2xl sm:text-3xl font-black font-mono leading-tight ${timerColor}`}>
            {secondsLeft}s
          </p>
        </div>
      </div>

      {/* Players Ready Status Badges */}
      <div className="flex gap-1.5 flex-wrap px-1">
        {room?.players?.map((p) => (
          <span
            key={p.id}
            className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
              p.lockedIn
                ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            <span>{p.nickname}</span>
            <span>{p.lockedIn ? '✓' : '…'}</span>
          </span>
        ))}
      </div>

      {/* Two Fill Mode Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={handleRandomFill}
          disabled={isLockedIn}
          type="button"
          className="btn-3d btn-3d-slate py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-slate-700 hover:border-cyan-400"
        >
          <Shuffle className="w-4 h-4 text-cyan-400" />
          <span>Random Fill 1–N²</span>
        </button>

        <button
          onClick={handleClearAndFill}
          disabled={isLockedIn}
          type="button"
          className="btn-3d btn-3d-slate py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-slate-700 hover:border-purple-400"
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Clear & Fill 1→N²</span>
        </button>
      </div>

      {/* Helper Bar when in manual 1->N2 placing or incomplete state */}
      {nextNumber !== null ? (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 text-xs sm:text-sm shadow-md animate-fade-in">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            <span>Tap any empty box to place: <strong className="text-white text-base">#{nextNumber}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={placementHistory.length === 0 || isLockedIn}
              type="button"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold border border-slate-600 text-slate-200 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
            <button
              onClick={handleFillRest}
              disabled={isLockedIn}
              type="button"
              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Fill Rest
            </button>
          </div>
        </div>
      ) : isManualMode && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold animate-fade-in">
          <span>All {N2} numbers placed! Tap two cells to swap if desired.</span>
          <button
            onClick={handleUndo}
            disabled={placementHistory.length === 0 || isLockedIn}
            type="button"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold border border-slate-600 text-slate-200"
          >
            Undo
          </button>
        </div>
      )}

      {/* Center N×N Board Grid */}
      <div className="w-full flex items-center justify-center py-1">
        <div
          className="relative w-full max-w-[390px] sm:max-w-[430px] aspect-square p-2.5 rounded-2xl glass-card mx-auto"
        >
          <div
            className="w-full h-full grid gap-1.5 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: N2 }).map((_, idx) => (
              <BingoCell
                key={idx}
                value={board[idx] ?? 0}
                index={idx}
                isCalled={false}
                isSelected={selectedIndex === idx}
                isMyTurn={false}
                mode="prep"
                gridSize={gridSize}
                onClick={() => handleCellClick(idx)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Lock & Ready Action Button */}
      <div className="w-full mt-auto pt-1">
        <button
          onClick={handleLockReady}
          disabled={isLockedIn}
          type="button"
          className={`w-full btn-3d py-3.5 rounded-2xl font-black text-base tracking-wider flex items-center justify-center gap-2 ${
            isLockedIn
              ? 'btn-3d-locked cursor-default'
              : 'btn-3d-cyan'
          }`}
        >
          {isLockedIn ? (
            <>
              <Check className="w-5 h-5 text-emerald-300" />
              <span>LOCKED IN ✓ (WAITING FOR OTHERS)</span>
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              <span>LOCK & READY</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
