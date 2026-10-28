import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

const STYLES = {
  error:   'bg-red-950 border-red-500 text-red-200',
  warning: 'bg-yellow-950 border-yellow-500 text-yellow-200',
  success: 'bg-green-950 border-green-500 text-green-200',
  info:    'bg-cyan-950 border-cyan-500 text-cyan-200',
};
const ICONS = {
  error:   <XCircle className="w-4 h-4 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
  success: <CheckCircle className="w-4 h-4 shrink-0" />,
  info:    <Info className="w-4 h-4 shrink-0" />,
};

export default function Toast({ type = 'info', message, onClose }) {
  if (!message) return null;
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium shadow-xl animate-bounce-in ${STYLES[type]}`}
    >
      {ICONS[type]}
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
