import React, { memo } from 'react';
import { Radio, Activity } from 'lucide-react';

/**
 * OpponentRadar — top-right panel showing:
 *  - Whose turn it is
 *  - Last 3 numbers called
 *  - Live line count for each player (no board numbers revealed)
 */
const OpponentRadar = memo(function OpponentRadar({ room, myId, lastCalled }) {
  const currentPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const isMyTurn = room.currentTurnPlayerId === myId;

  return (
    <div className="flex flex-col gap-1.5 text-xs min-w-0">
      {/* Current turn indicator */}
      <div
        className={`px-2 py-1 rounded-lg border font-semibold text-center ${
          isMyTurn
            ? 'border-cyan-500 bg-cyan-950 text-cyan-300'
            : 'border-slate-700 bg-slate-900 text-slate-400'
        }`}
      >
        {isMyTurn ? '👆 Your Turn' : `${currentPlayer?.nickname || '?'}'s Turn`}
      </div>

      {/* Last called numbers */}
      {lastCalled.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {lastCalled.map((entry, i) => (
            <div
              key={`${entry.number}-${i}`}
              className={`px-2 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5 ${i === 0 ? 'opacity-100' : 'opacity-50'}`}
            >
              <span
                className="font-black"
                style={{ color: '#00f5ff' }}
              >
                {entry.number}
              </span>
              <span className="text-slate-500 truncate">by {entry.calledBy}</span>
            </div>
          ))}
        </div>
      )}

      {/* Player progress radar */}
      <div className="flex flex-col gap-0.5 mt-0.5">
        <div className="flex items-center gap-1 text-slate-500 mb-0.5">
          <Activity className="w-3 h-3" />
          <span className="uppercase tracking-wider text-[10px]">Progress</span>
        </div>
        <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto custom-scroll pr-0.5">
          {room.players.map((p) => (
            <div key={p.id} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${p.id === myId ? 'bg-slate-800' : ''}`}>
              <span
                className="truncate max-w-[70px] font-medium"
                style={{ color: p.id === myId ? '#00f5ff' : '#94a3b8' }}
              >
                {p.nickname}
              </span>
              <span className="ml-auto font-bold whitespace-nowrap" style={{ color: '#39ff14' }}>
                {p.linesCompleted}/{room.targetLines}
              </span>
              {!p.connected && <span className="text-red-400">✗</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default OpponentRadar;
