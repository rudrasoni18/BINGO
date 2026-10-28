/**
 * gameEngine.js - Pure game logic (no socket.io dependencies)
 * Handles: room creation, board validation, turn management, bingo detection
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

function generateRoomId() {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Dynamic Prep Timer based on gridSize:
 * { 5: 30, 6: 35, 7: 45, 8: 50, 9: 60, 10: 75 }[gridSize] || 30 seconds
 */
function getPrepDuration(gridSize) {
  const durations = { 5: 30, 6: 35, 7: 45, 8: 50, 9: 60, 10: 75 };
  return durations[gridSize] || 30;
}

function createRoom(hostId, hostNickname, gridSize = 5, targetLines = 3, maxPlayers = 15) {
  const roomId = generateRoomId();
  return {
    roomId,
    hostId,
    gridSize,
    targetLines,
    maxPlayers,
    state: 'lobby',       // lobby | prep | playing | finished
    isBotGame: false,
    players: [
      {
        id: hostId,
        nickname: hostNickname,
        isHost: true,
        isReady: false,
        board: [],          // flat array length gridSize^2; empty = null/0
        lockedIn: false,
        linesCompleted: 0,
        connected: true,
      },
    ],
    calledNumbers: [],      // ordered list of numbers called so far
    currentTurnIndex: 0,    // index into players array
    prepTimerEnd: null,     // epoch ms when prep phase ends
    winner: null,
    winnerId: null,
  };
}

function getRoom(rooms, roomId) {
  return rooms.get(roomId) || null;
}

function addPlayer(room, playerId, nickname) {
  const limit = room.maxPlayers || 15;
  if (room.players.length >= limit) return { error: `Room is full (max ${limit} players).` };
  if (room.state !== 'lobby') return { error: 'Game already in progress.' };
  if (room.players.some((p) => p.nickname === nickname))
    return { error: 'Nickname already taken in this room.' };

  room.players.push({
    id: playerId,
    nickname,
    isHost: false,
    isReady: false,
    board: [],
    lockedIn: false,
    linesCompleted: 0,
    connected: true,
  });
  return { ok: true };
}

function removePlayer(room, playerId) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return;

  const wasHost = room.players[idx].isHost;
  room.players.splice(idx, 1);

  if (wasHost && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].id;
  }

  if (room.state === 'playing' && room.players.length > 0) {
    room.currentTurnIndex = room.currentTurnIndex % room.players.length;
  }
}

function autoFillBoard(gridSize) {
  const total = gridSize * gridSize;
  const nums = Array.from({ length: total }, (_, i) => i + 1);
  return shuffleArray(nums);
}

/**
 * Auto-fill remaining unplaced numbers (for when prep timer expires or player locks in).
 */
function fillRemainingNumbers(currentBoard, gridSize) {
  const N2 = gridSize * gridSize;
  const present = new Set();
  if (Array.isArray(currentBoard)) {
    for (const val of currentBoard) {
      if (val && val >= 1 && val <= N2) {
        present.add(val);
      }
    }
  }
  const remaining = [];
  for (let i = 1; i <= N2; i++) {
    if (!present.has(i)) remaining.push(i);
  }
  const shuffled = shuffleArray(remaining);
  let remIdx = 0;
  return Array.from({ length: N2 }, (_, idx) => {
    const val = currentBoard?.[idx];
    if (val && val >= 1 && val <= N2) return val;
    return shuffled[remIdx++];
  });
}

/**
 * Compute completed bingo lines for a given board and called numbers.
 * Returns the count of completed lines (rows + cols + 2 diagonals).
 */
function computeLines(board, calledNumbers, gridSize) {
  const calledSet = new Set(calledNumbers);
  const N = gridSize;
  let lines = 0;

  // Rows
  for (let r = 0; r < N; r++) {
    let complete = true;
    for (let c = 0; c < N; c++) {
      if (!calledSet.has(board[r * N + c])) { complete = false; break; }
    }
    if (complete) lines++;
  }

  // Cols
  for (let c = 0; c < N; c++) {
    let complete = true;
    for (let r = 0; r < N; r++) {
      if (!calledSet.has(board[r * N + c])) { complete = false; break; }
    }
    if (complete) lines++;
  }

  // Main diagonal (top-left → bottom-right)
  {
    let complete = true;
    for (let i = 0; i < N; i++) {
      if (!calledSet.has(board[i * N + i])) { complete = false; break; }
    }
    if (complete) lines++;
  }

  // Anti-diagonal (top-right → bottom-left)
  {
    let complete = true;
    for (let i = 0; i < N; i++) {
      if (!calledSet.has(board[i * N + (N - 1 - i)])) { complete = false; break; }
    }
    if (complete) lines++;
  }

  return lines;
}

/**
 * Advance turn to next connected player.
 */
function advanceTurn(room) {
  const total = room.players.length;
  if (total === 0) return;
  let next = (room.currentTurnIndex + 1) % total;
  let attempts = 0;
  while (!room.players[next].connected && attempts < total) {
    next = (next + 1) % total;
    attempts++;
  }
  room.currentTurnIndex = next;
}

/**
 * Get the player whose turn it currently is.
 */
function getCurrentTurnPlayer(room) {
  return room.players[room.currentTurnIndex] || null;
}

/**
 * Server-side bingo verification.
 * Returns { valid: bool, linesCount: number }
 */
function verifyBingo(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { valid: false, linesCount: 0 };
  const lines = computeLines(player.board, room.calledNumbers, room.gridSize);
  player.linesCompleted = lines;
  return { valid: lines >= room.targetLines, linesCount: lines };
}

/**
 * Build public room state:
 * - Hides opponent line counts during active gameplay.
 * - Includes winnerId on finish.
 */
function buildPublicRoomState(room) {
  return {
    roomId: room.roomId,
    gridSize: room.gridSize,
    targetLines: room.targetLines,
    maxPlayers: room.maxPlayers || 15,
    state: room.state,
    isBotGame: !!room.isBotGame,
    hostId: room.hostId,
    calledNumbers: room.calledNumbers,
    currentTurnPlayerId: getCurrentTurnPlayer(room)?.id || null,
    winner: room.winner,
    winnerId: room.winnerId || room.winner?.id || null,
    prepTimerEnd: room.prepTimerEnd,
    players: room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      isReady: p.isReady,
      lockedIn: p.lockedIn,
      // Completely hidden during active gameplay:
      linesCompleted: room.state === 'finished' ? p.linesCompleted : 0,
      connected: p.connected,
      isBot: !!p.isBot,
      difficulty: p.difficulty || null,
      boardFilled: p.board.length === room.gridSize * room.gridSize && !p.board.includes(0) && !p.board.includes(null),
    })),
  };
}

module.exports = {
  generateRoomId,
  shuffleArray,
  getPrepDuration,
  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  autoFillBoard,
  fillRemainingNumbers,
  computeLines,
  advanceTurn,
  getCurrentTurnPlayer,
  verifyBingo,
  buildPublicRoomState,
};
