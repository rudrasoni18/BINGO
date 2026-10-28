import { useState, useEffect } from 'react';

/**
 * usePrepTimer — returns seconds remaining in the prep phase.
 * prepTimerEnd is a server epoch ms timestamp.
 */
export default function usePrepTimer(prepTimerEnd) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!prepTimerEnd) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((prepTimerEnd - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 250); // 250ms for smooth countdown
    return () => clearInterval(interval);
  }, [prepTimerEnd]);

  return secondsLeft;
}
