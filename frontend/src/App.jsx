import React, { useEffect } from 'react';
import { useGame } from './context/GameContext';
import useSocketEvents from './hooks/useSocketEvents';

import EntryScreen from './components/entry/EntryScreen';
import LobbyScreen from './components/lobby/LobbyScreen';
import PrepBoard from './components/game/PrepBoard';
import PlayingBoard from './components/game/PlayingBoard';
import FinishScreen from './components/game/FinishScreen';
import Toast from './components/shared/Toast';
import TopNavBar from './components/shared/TopNavBar';

export default function App() {
  // Mount all socket listeners once at the root
  useSocketEvents();

  const { state, dispatch, clearError, clearNotification } = useGame();
  const { room, error, notification } = state;

  // Determine which screen to show
  const screen = !room
    ? 'entry'
    : room.state === 'lobby'
    ? 'lobby'
    : room.state === 'prep'
    ? 'prep'
    : room.state === 'playing'
    ? 'playing'
    : 'finish';

  // Sync screen navigation with real URL paths using window.history.pushState / popstate
  useEffect(() => {
    let targetPath = '/';
    if (room && room.roomId) {
      if (screen === 'lobby') targetPath = `/lobby/${room.roomId}`;
      else if (screen === 'prep') targetPath = `/prep/${room.roomId}`;
      else if (screen === 'playing') targetPath = `/game/${room.roomId}`;
      else if (screen === 'finish') targetPath = `/results/${room.roomId}`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({ screen, roomId: room?.roomId }, '', targetPath);
    }
  }, [screen, room?.roomId]);

  // Handle browser back button (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' && room) {
        dispatch({ type: 'RESET' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [room, dispatch]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 overflow-x-hidden overflow-y-auto">
      {/* Sleek Top Navigation Bar with Audio Toggle & Connection Status */}
      <TopNavBar />

      {/* Global error toast */}
      {error && (
        <Toast type="error" message={error} onClose={clearError} />
      )}
      {/* Global notification toast */}
      {notification && (
        <Toast type={notification.type} message={notification.message} onClose={clearNotification} />
      )}

      {/* Screen router */}
      <main className="flex-1 flex flex-col w-full overflow-y-auto">
        {screen === 'entry'   && <EntryScreen />}
        {screen === 'lobby'   && <LobbyScreen />}
        {screen === 'prep'    && <PrepBoard />}
        {screen === 'playing' && <PlayingBoard />}
        {screen === 'finish'  && <FinishScreen />}
      </main>
    </div>
  );
}
