import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionBadge({ connected }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${
        connected
          ? 'border-green-500 text-green-400 bg-green-950'
          : 'border-red-500 text-red-400 bg-red-950 animate-pulse'
      }`}
    >
      {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {connected ? 'Live' : 'Reconnecting…'}
    </div>
  );
}
