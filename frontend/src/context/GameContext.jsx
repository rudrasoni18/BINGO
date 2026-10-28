import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ─── Initial State ───────────────────────────────────────────────────────────
const initialState = {
  // Connection
  connected: false,

  // Player identity
  myId: null,          // socket.id
  myNickname: '',

  // Room
  room: null,          // PublicRoomState from server
  myBoard: [],         // my private board (flat array)
  winnerId: null,
  gameOverData: null,  // { winnerName, winnerId, allBoards: [{ name, id, board, linesCompleted, isWinner, isBot }] }

  // Call Tracking for HUD & Cells
  lastCalled: [],           // list of { number, calledBy, isMe }
  numberCallerMap: {},      // { [number]: { calledBy, isMe } }
  lastMyPick: null,         // number
  lastOpponentPick: null,   // { number, calledBy }
  myPicks: [],              // last 3 numbers picked by me
  opponentPicks: [],        // last 3 numbers picked by opponents/AI: [{ number, calledBy }]

  // UI feedback
  error: null,
  notification: null,  // { type: 'info'|'success'|'warning'|'error', message }
  falseCallInfo: null, // { linesCount, targetLines }
  isShaking: false,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };

    case 'SET_MY_ID':
      return { ...state, myId: action.payload };

    case 'SET_MY_NICKNAME':
      return { ...state, myNickname: action.payload };

    case 'ROOM_CREATED':
    case 'ROOM_JOINED':
      return {
        ...state,
        room: action.payload.room,
        myBoard: action.payload.yourBoard || [],
        winnerId: action.payload.room?.winnerId || null,
        error: null,
      };

    case 'ROOM_UPDATED':
      return {
        ...state,
        room: action.payload.room,
        winnerId: action.payload.room?.winnerId || state.winnerId,
        gameOverData: action.payload.room?.state === 'lobby' || action.payload.room?.state === 'prep' ? null : state.gameOverData,
      };

    case 'YOUR_BOARD':
      return { ...state, myBoard: action.payload.board };

    case 'PREP_STARTED':
      return {
        ...state,
        room: action.payload.room,
        myBoard: action.payload.yourBoard || state.myBoard,
        winnerId: null,
        gameOverData: null,
        lastCalled: [],
        numberCallerMap: {},
        lastMyPick: null,
        lastOpponentPick: null,
        myPicks: [],
        opponentPicks: [],
        falseCallInfo: null,
      };

    case 'GAME_STARTED':
      return {
        ...state,
        room: action.payload.room,
        winnerId: null,
        lastCalled: [],
        numberCallerMap: {},
        lastMyPick: null,
        lastOpponentPick: null,
        myPicks: [],
        opponentPicks: [],
        falseCallInfo: null,
        gameOverData: null,
      };

    case 'NUMBER_CALLED': {
      const num = action.payload.number;
      const calledBy = action.payload.calledBy;
      const isMe = calledBy === state.myNickname;
      const entry = { number: num, calledBy, isMe };
      const lastCalled = [entry, ...state.lastCalled].slice(0, 15);
      const numberCallerMap = {
        ...state.numberCallerMap,
        [num]: { calledBy, isMe },
      };
      const myPicks = isMe
        ? [num, ...(state.myPicks || [])].slice(0, 3)
        : (state.myPicks || []);
      const opponentPicks = !isMe
        ? [{ number: num, calledBy }, ...(state.opponentPicks || [])].slice(0, 3)
        : (state.opponentPicks || []);

      return {
        ...state,
        room: action.payload.room,
        lastCalled,
        numberCallerMap,
        lastMyPick: isMe ? num : state.lastMyPick,
        lastOpponentPick: !isMe ? { number: num, calledBy } : state.lastOpponentPick,
        myPicks,
        opponentPicks,
      };
    }

    case 'BINGO_CLAIMED':
      return {
        ...state,
        room: action.payload.room,
        winnerId: action.payload.winner?.id || action.payload.room?.winnerId || null,
      };

    case 'GAME_OVER':
      return {
        ...state,
        gameOverData: action.payload,
        winnerId: action.payload.winnerId || action.payload.allBoards?.find(b => b.isWinner)?.id || state.winnerId,
      };

    case 'FALSE_CALL_PENALTY':
      return {
        ...state,
        falseCallInfo: {
          linesCount: action.payload.linesCount,
          targetLines: action.payload.targetLines,
        },
        isShaking: true,
      };

    case 'CLEAR_FALSE_CALL':
      return { ...state, falseCallInfo: null, isShaking: false };

    case 'PLAYER_DISCONNECTED':
      return { ...state, room: action.payload.room };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };

    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };

    case 'RESET':
      return { ...initialState, connected: state.connected, myId: state.myId, myNickname: state.myNickname };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const clearNotification = useCallback(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), []);

  return (
    <GameContext.Provider value={{ state, dispatch, clearError, clearNotification }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
