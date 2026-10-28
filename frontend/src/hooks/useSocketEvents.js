import { useEffect, useRef } from 'react';
import socket from '../socket';
import { useGame } from '../context/GameContext';
import soundEngine from '../soundEngine';
import { fireConfettiExplosion } from '../confetti';

/**
 * useSocketEvents — mounts all socket.io listeners exactly once.
 * Integrates Web Audio API sound synthesizers & celebratory confetti triggers.
 */
export default function useSocketEvents() {
  const { dispatch } = useGame();
  const prevLinesRef = useRef(0);

  useEffect(() => {
    // ── Connection lifecycle ──────────────────────────────────────────────
    const onConnect = () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'SET_MY_ID', payload: socket.id });
    };
    const onDisconnect = () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
    };

    // ── Room events ───────────────────────────────────────────────────────
    const onRoomCreated = (data) => dispatch({ type: 'ROOM_CREATED', payload: data });
    const onRoomJoined  = (data) => dispatch({ type: 'ROOM_JOINED',  payload: data });
    const onRoomUpdated = (data) => dispatch({ type: 'ROOM_UPDATED', payload: data });
    const onYourBoard   = (data) => dispatch({ type: 'YOUR_BOARD',   payload: data });

    // ── Game phase events ─────────────────────────────────────────────────
    const onPrepStarted = (data) => {
      prevLinesRef.current = 0;
      dispatch({ type: 'PREP_STARTED', payload: data });
    };

    const onGameStarted = (data) => {
      prevLinesRef.current = 0;
      dispatch({ type: 'GAME_STARTED', payload: data });
    };

    const onNumberCalled = (data) => {
      dispatch({ type: 'NUMBER_CALLED', payload: data });

      // Determine if local player completed a new line
      const myPlayer = data.room?.players?.find((p) => p.id === socket.id);
      const newLines = myPlayer?.linesCompleted || 0;

      if (newLines > prevLinesRef.current) {
        prevLinesRef.current = newLines;
        // Play pencil scratch cut immediately, followed by upbeat ascending chord chime
        soundEngine.playCutSound();
        setTimeout(() => {
          soundEngine.playLineCompleteSound();
        }, 130);
      } else {
        // Standard number cut sound
        soundEngine.playCutSound();
      }
    };

    const onBingoClaimed = (data) => {
      dispatch({ type: 'BINGO_CLAIMED', payload: data });
      soundEngine.playVictorySound();
      fireConfettiExplosion();
    };

    const onGameOver = (data) => {
      dispatch({ type: 'GAME_OVER', payload: data });
      soundEngine.playVictorySound();
      fireConfettiExplosion();
    };

    // ── Penalty ───────────────────────────────────────────────────────────
    const onFalseCallPenalty = (data) => {
      soundEngine.playFalseCallBuzzer();
      dispatch({ type: 'FALSE_CALL_PENALTY', payload: data });
      setTimeout(() => dispatch({ type: 'CLEAR_FALSE_CALL' }), 3000);
    };

    // ── Disconnect / error ────────────────────────────────────────────────
    const onPlayerDisconnected = (data) => {
      dispatch({ type: 'PLAYER_DISCONNECTED', payload: data });
      dispatch({
        type: 'SET_NOTIFICATION',
        payload: { type: 'warning', message: `${data.nickname} disconnected.` },
      });
      setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 3000);
    };

    const onError = (data) => {
      dispatch({ type: 'SET_ERROR', payload: data.message });
      setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 4000);
    };

    // ── Register ──────────────────────────────────────────────────────────
    socket.on('connect',            onConnect);
    socket.on('disconnect',         onDisconnect);
    socket.on('room_created',       onRoomCreated);
    socket.on('room_joined',        onRoomJoined);
    socket.on('room_updated',       onRoomUpdated);
    socket.on('your_board',         onYourBoard);
    socket.on('prep_started',       onPrepStarted);
    socket.on('game_started',       onGameStarted);
    socket.on('number_called',      onNumberCalled);
    socket.on('bingo_claimed',      onBingoClaimed);
    socket.on('game_over',          onGameOver);
    socket.on('false_call_penalty', onFalseCallPenalty);
    socket.on('player_disconnected',onPlayerDisconnected);
    socket.on('error',              onError);

    // If already connected when this mounts (e.g. hot reload)
    if (socket.connected) {
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'SET_MY_ID', payload: socket.id });
    }

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      socket.off('connect',            onConnect);
      socket.off('disconnect',         onDisconnect);
      socket.off('room_created',       onRoomCreated);
      socket.off('room_joined',        onRoomJoined);
      socket.off('room_updated',       onRoomUpdated);
      socket.off('your_board',         onYourBoard);
      socket.off('prep_started',       onPrepStarted);
      socket.off('game_started',       onGameStarted);
      socket.off('number_called',      onNumberCalled);
      socket.off('bingo_claimed',      onBingoClaimed);
      socket.off('game_over',          onGameOver);
      socket.off('false_call_penalty', onFalseCallPenalty);
      socket.off('player_disconnected',onPlayerDisconnected);
      socket.off('error',              onError);
    };
  }, [dispatch]);
}
