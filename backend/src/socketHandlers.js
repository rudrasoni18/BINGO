/**
 * socketHandlers.js - All Socket.io event handlers
 */

const {
  createRoom,
  addPlayer,
  removePlayer,
  autoFillBoard,
  fillRemainingNumbers,
  computeLines,
  advanceTurn,
  getCurrentTurnPlayer,
  verifyBingo,
  buildPublicRoomState,
  getPrepDuration,
} = require('./gameEngine');
const {
  createBotPlayer,
  chooseNumber,
  getBotThinkingDelay,
} = require('./botEngine');

const MAX_PLAYERS_HARD_LIMIT = 15;

// roomId → prepTimer (setTimeout handle)
const prepTimers = new Map();
// roomId → botTimer (setTimeout handle)
const botTimers = new Map();

module.exports = function registerHandlers(io, rooms) {
  io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`);

    // ─────────────────────────────────────────────
    // CREATE ROOM (Multiplayer Host)
    // ─────────────────────────────────────────────
    socket.on('create_room', ({ nickname, gridSize = 5, targetLines = 3, maxPlayers = 15 } = {}) => {
      try {
        if (!nickname?.trim()) return emitError(socket, 'Nickname is required.');
        gridSize = Math.min(10, Math.max(5, Number(gridSize)));
        targetLines = Math.min(gridSize, Math.max(3, Number(targetLines)));
        maxPlayers = Math.min(MAX_PLAYERS_HARD_LIMIT, Math.max(2, Number(maxPlayers)));

        const room = createRoom(socket.id, nickname.trim(), gridSize, targetLines, maxPlayers);
        rooms.set(room.roomId, room);
        socket.join(room.roomId);
        socket.data.roomId = room.roomId;
        socket.data.nickname = nickname.trim();

        console.log(`[create_room] ${nickname} created ${room.roomId}`);
        socket.emit('room_created', { roomId: room.roomId, room: buildPublicRoomState(room) });
      } catch (e) {
        console.error('[create_room]', e);
        emitError(socket, 'Failed to create room.');
      }
    });

    // ─────────────────────────────────────────────
    // CREATE BOT ROOM (Transitions directly to PREP)
    // ─────────────────────────────────────────────
    socket.on('create_bot_room', ({ nickname, difficulty = 'medium', gridSize = 5, targetLines = 3 } = {}) => {
      try {
        if (!nickname?.trim()) return emitError(socket, 'Nickname is required.');
        gridSize = Math.min(10, Math.max(5, Number(gridSize)));
        targetLines = Math.min(gridSize, Math.max(3, Number(targetLines)));

        const room = createRoom(socket.id, nickname.trim(), gridSize, targetLines, 15);
        room.isBotGame = true;

        const bot = createBotPlayer(difficulty, gridSize, 1);
        room.players.push(bot);

        // TRANSITION DIRECTLY INTO PREP: SKIP MULTIPLAYER LOBBY
        room.state = 'prep';
        const prepSec = getPrepDuration(gridSize);
        room.prepTimerEnd = Date.now() + prepSec * 1000;

        const humanPlayer = room.players.find((p) => p.id === socket.id);
        humanPlayer.board = autoFillBoard(room.gridSize);
        humanPlayer.lockedIn = false;
        humanPlayer.linesCompleted = 0;

        bot.lockedIn = true;
        bot.linesCompleted = 0;

        rooms.set(room.roomId, room);
        socket.join(room.roomId);
        socket.data.roomId = room.roomId;
        socket.data.nickname = nickname.trim();

        console.log(`[create_bot_room] ${nickname} vs ${bot.nickname} -> directly in PREP (${prepSec}s)`);

        socket.emit('room_created', {
          roomId: room.roomId,
          room: buildPublicRoomState(room),
          yourBoard: humanPlayer.board,
        });

        socket.emit('prep_started', {
          room: buildPublicRoomState(room),
          yourBoard: humanPlayer.board,
          prepTimerEnd: room.prepTimerEnd,
        });

        // Set dynamic prep timer
        const timer = setTimeout(() => {
          forceStartGame(io, rooms, room.roomId);
        }, prepSec * 1000);
        prepTimers.set(room.roomId, timer);
      } catch (e) {
        console.error('[create_bot_room]', e);
        emitError(socket, 'Failed to create bot room.');
      }
    });

    // ─────────────────────────────────────────────
    // ADD BOT (from Lobby)
    // ─────────────────────────────────────────────
    socket.on('add_bot', ({ difficulty = 'medium' } = {}) => {
      try {
        const room = getRoomForSocket(socket, rooms);
        if (!room) return;
        if (room.hostId !== socket.id) return emitError(socket, 'Only the host can add a bot.');
        if (room.state !== 'lobby') return emitError(socket, 'Bots can only be added in lobby.');
        if (room.players.length >= (room.maxPlayers || 15)) return emitError(socket, 'Room is full.');

        const botCount = room.players.filter((p) => p.isBot).length + 1;
        const bot = createBotPlayer(difficulty, room.gridSize, botCount);
        room.players.push(bot);

        console.log(`[add_bot] Added ${bot.nickname} to ${room.roomId}`);
        io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });
      } catch (e) {
        console.error('[add_bot]', e);
        emitError(socket, 'Failed to add bot.');
      }
    });

    // ─────────────────────────────────────────────
    // REMOVE BOT (from Lobby)
    // ─────────────────────────────────────────────
    socket.on('remove_bot', ({ botId } = {}) => {
      try {
        const room = getRoomForSocket(socket, rooms);
        if (!room) return;
        if (room.hostId !== socket.id) return emitError(socket, 'Only the host can remove a bot.');
        if (room.state !== 'lobby') return emitError(socket, 'Bots can only be removed in lobby.');

        const idx = room.players.findIndex((p) => p.id === botId && p.isBot);
        if (idx !== -1) {
          const removed = room.players.splice(idx, 1)[0];
          console.log(`[remove_bot] Removed ${removed.nickname} from ${room.roomId}`);
          io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });
        }
      } catch (e) {
        console.error('[remove_bot]', e);
        emitError(socket, 'Failed to remove bot.');
      }
    });

    // ─────────────────────────────────────────────
    // JOIN ROOM
    // ─────────────────────────────────────────────
    socket.on('join_room', ({ nickname, roomId } = {}) => {
      try {
        if (!nickname?.trim()) return emitError(socket, 'Nickname is required.');
        if (!roomId?.trim()) return emitError(socket, 'Room ID is required.');

        const room = rooms.get(roomId.trim().toUpperCase());
        if (!room) return emitError(socket, 'Room not found. Check the Room ID.');
        if (room.players.length >= (room.maxPlayers || 15)) return emitError(socket, `Room is full (max ${room.maxPlayers || 15} players).`);
        if (room.state !== 'lobby') return emitError(socket, 'Game already started. Cannot join.');

        const result = addPlayer(room, socket.id, nickname.trim());
        if (result.error) return emitError(socket, result.error);

        socket.join(roomId.toUpperCase());
        socket.data.roomId = roomId.toUpperCase();
        socket.data.nickname = nickname.trim();

        console.log(`[join_room] ${nickname} joined ${roomId}`);

        socket.emit('room_joined', {
          room: buildPublicRoomState(room),
          yourBoard: [],
        });

        socket.to(roomId.toUpperCase()).emit('room_updated', { room: buildPublicRoomState(room) });
      } catch (e) {
        console.error('[join_room]', e);
        emitError(socket, 'Failed to join room.');
      }
    });

    // ─────────────────────────────────────────────
    // UPDATE SETTINGS (host only, lobby state)
    // ─────────────────────────────────────────────
    socket.on('update_settings', ({ gridSize, targetLines, maxPlayers } = {}) => {
      const room = getRoomForSocket(socket, rooms);
      if (!room) return;
      if (room.hostId !== socket.id) return emitError(socket, 'Only the host can change settings.');
      if (room.state !== 'lobby') return emitError(socket, 'Settings can only be changed in lobby.');

      gridSize = Math.min(10, Math.max(5, Number(gridSize)));
      targetLines = Math.min(gridSize, Math.max(3, Number(targetLines)));
      maxPlayers = Math.min(MAX_PLAYERS_HARD_LIMIT, Math.max(2, Number(maxPlayers || room.maxPlayers || 15)));
      room.gridSize = gridSize;
      room.targetLines = targetLines;
      room.maxPlayers = maxPlayers;

      io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });
    });

    // ─────────────────────────────────────────────
    // START GAME (host only)
    // ─────────────────────────────────────────────
    socket.on('start_game', () => {
      const room = getRoomForSocket(socket, rooms);
      if (!room) return;
      if (room.hostId !== socket.id) return emitError(socket, 'Only the host can start the game.');
      if (room.state !== 'lobby') return emitError(socket, 'Game already started.');
      if (room.players.length < 2) return emitError(socket, 'Need at least 2 players to start.');

      room.state = 'prep';
      const prepSec = getPrepDuration(room.gridSize);
      room.prepTimerEnd = Date.now() + prepSec * 1000;

      room.players.forEach((p) => {
        p.board = autoFillBoard(room.gridSize);
        p.lockedIn = !!p.isBot;
        p.linesCompleted = 0;
      });

      room.players.forEach((p) => {
        if (!p.isBot) {
          const playerSocket = io.sockets.sockets.get(p.id);
          if (playerSocket) {
            playerSocket.emit('prep_started', {
              room: buildPublicRoomState(room),
              yourBoard: p.board,
              prepTimerEnd: room.prepTimerEnd,
            });
          }
        }
      });

      const allLocked = room.players.filter((p) => p.connected).every((p) => p.lockedIn);
      if (allLocked) {
        startPlayingPhase(io, room);
      } else {
        const timer = setTimeout(() => {
          forceStartGame(io, rooms, room.roomId);
        }, prepSec * 1000);
        prepTimers.set(room.roomId, timer);
      }
    });

    // ─────────────────────────────────────────────
    // BOARD UPDATE (during prep)
    // ─────────────────────────────────────────────
    socket.on('board_update', ({ board } = {}) => {
      const room = getRoomForSocket(socket, rooms);
      if (!room) return;
      if (room.state !== 'prep') return emitError(socket, 'Not in prep phase.');

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      if (player.lockedIn) return emitError(socket, 'You are already locked in.');

      const N2 = room.gridSize * room.gridSize;
      if (!Array.isArray(board) || board.length !== N2) return emitError(socket, 'Invalid board.');

      player.board = board;
      socket.emit('your_board', { board });
      io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });
    });

    // ─────────────────────────────────────────────
    // LOCK & READY (during prep)
    // ─────────────────────────────────────────────
    socket.on('lock_ready', () => {
      const room = getRoomForSocket(socket, rooms);
      if (!room) return;
      if (room.state !== 'prep') return emitError(socket, 'Not in prep phase.');

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      if (player.lockedIn) return;

      // Auto-fill any remaining 0s or missing numbers before locking
      player.board = fillRemainingNumbers(player.board, room.gridSize);
      player.lockedIn = true;

      socket.emit('your_board', { board: player.board });
      io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });

      // Check if ALL connected players are locked in
      const allLocked = room.players.filter((p) => p.connected).every((p) => p.lockedIn);
      if (allLocked) {
        clearTimeout(prepTimers.get(room.roomId));
        prepTimers.delete(room.roomId);
        startPlayingPhase(io, room);
      }
    });

    // ─────────────────────────────────────────────
    // PICK NUMBER (current turn player)
    // ─────────────────────────────────────────────
    socket.on('pick_number', ({ number } = {}) => {
      const room = getRoomForSocket(socket, rooms);
      if (!room) return;
      if (room.state !== 'playing') return emitError(socket, 'Game is not in playing state.');

      const currentPlayer = getCurrentTurnPlayer(room);
      if (!currentPlayer || currentPlayer.id !== socket.id)
        return emitError(socket, "It's not your turn.");

      const num = Number(number);
      const N2 = room.gridSize * room.gridSize;
      if (!Number.isInteger(num) || num < 1 || num > N2)
        return emitError(socket, 'Invalid number.');
      if (room.calledNumbers.includes(num))
        return emitError(socket, 'Number already called.');

      if (!currentPlayer.board.includes(num))
        return emitError(socket, 'That number is not on your board.');

      room.calledNumbers.push(num);

      // Update lines for all players
      room.players.forEach((p) => {
        p.linesCompleted = computeLines(p.board, room.calledNumbers, room.gridSize);
      });

      advanceTurn(room);

      const publicRoom = buildPublicRoomState(room);
      io.to(room.roomId).emit('number_called', {
        number: num,
        calledBy: currentPlayer.nickname,
        room: publicRoom,
      });

      // Check if any bot completed targetLines:
      const winningBot = room.players.find((p) => p.isBot && p.linesCompleted >= room.targetLines);
      if (winningBot) {
        triggerBotBingo(io, room, winningBot);
        return;
      }

      checkAndScheduleBotTurn(io, room);
    });

    // ─────────────────────────────────────────────
    // CLAIM BINGO (Strict Single Winner Lock)
    // ─────────────────────────────────────────────
    socket.on('claim_bingo', () => {
      const room = getRoomForSocket(socket, rooms);
      if (!room) return;
      if (room.state !== 'playing') return emitError(socket, 'Game is not active.');

      // Prevent race conditions: strictly one winner
      if (room.winnerId || room.state === 'finished' || room.state === 'ended') return;

      const { valid, linesCount } = verifyBingo(room, socket.id);
      const player = room.players.find((p) => p.id === socket.id);

      if (!valid) {
        socket.emit('false_call_penalty', {
          playerId: socket.id,
          nickname: player?.nickname,
          linesCount,
          targetLines: room.targetLines,
        });
        return;
      }

      // Valid bingo! Single Winner Lock
      room.state = 'finished';
      room.winnerId = socket.id;
      room.winner = { id: socket.id, nickname: player.nickname, linesCount };

      clearTimeout(prepTimers.get(room.roomId));
      prepTimers.delete(room.roomId);
      clearTimeout(botTimers.get(room.roomId));
      botTimers.delete(room.roomId);

      io.to(room.roomId).emit('bingo_claimed', {
        winner: room.winner,
        winnerId: room.winnerId,
        room: buildPublicRoomState(room),
      });

      emitGameOver(io, room, room.winner);
    });

    // ─────────────────────────────────────────────
    // PLAY AGAIN / RESET ROOM
    // ─────────────────────────────────────────────
    socket.on('play_again', () => {
      const room = getRoomForSocket(socket, rooms);
      if (!room) return;
      if (room.hostId !== socket.id) return emitError(socket, 'Only the host can reset.');

      clearTimeout(botTimers.get(room.roomId));
      botTimers.delete(room.roomId);
      clearTimeout(prepTimers.get(room.roomId));
      prepTimers.delete(room.roomId);

      room.calledNumbers = [];
      room.currentTurnIndex = 0;
      room.winner = null;
      room.winnerId = null;

      if (room.isBotGame) {
        // VS Bot mode: Transition immediately to prep screen without lobby
        room.state = 'prep';
        const prepSec = getPrepDuration(room.gridSize);
        room.prepTimerEnd = Date.now() + prepSec * 1000;

        room.players.forEach((p) => {
          p.board = autoFillBoard(room.gridSize);
          p.lockedIn = !!p.isBot;
          p.linesCompleted = 0;
        });

        room.players.forEach((p) => {
          if (!p.isBot) {
            io.sockets.sockets.get(p.id)?.emit('prep_started', {
              room: buildPublicRoomState(room),
              yourBoard: p.board,
              prepTimerEnd: room.prepTimerEnd,
            });
          }
        });

        io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });

        const timer = setTimeout(() => {
          forceStartGame(io, rooms, room.roomId);
        }, prepSec * 1000);
        prepTimers.set(room.roomId, timer);
      } else {
        // Multiplayer mode: Reset to lobby
        room.state = 'lobby';
        room.prepTimerEnd = null;
        room.players.forEach((p) => {
          p.board = [];
          p.lockedIn = false;
          p.linesCompleted = 0;
          p.isReady = !!p.isBot;
        });

        io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });
      }
    });

    // ─────────────────────────────────────────────
    // LEAVE ROOM (Main Menu Navigation)
    // ─────────────────────────────────────────────
    socket.on('leave_room', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      socket.leave(roomId);
      socket.data.roomId = null;

      const room = rooms.get(roomId);
      if (!room) return;

      removePlayer(room, socket.id);
      if (room.players.length === 0 || (room.isBotGame && room.players.every((p) => p.isBot))) {
        clearTimeout(prepTimers.get(roomId));
        prepTimers.delete(roomId);
        clearTimeout(botTimers.get(roomId));
        botTimers.delete(roomId);
        rooms.delete(roomId);
        console.log(`[room_deleted] ${roomId}`);
      } else {
        io.to(roomId).emit('room_updated', { room: buildPublicRoomState(room) });
      }
    });

    // ─────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[disconnect] ${socket.id}`);
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      if (room.state === 'lobby') {
        removePlayer(room, socket.id);
        if (room.players.length === 0) {
          clearTimeout(prepTimers.get(roomId));
          prepTimers.delete(roomId);
          clearTimeout(botTimers.get(roomId));
          botTimers.delete(roomId);
          rooms.delete(roomId);
          return;
        }
        io.to(roomId).emit('room_updated', { room: buildPublicRoomState(room) });
        io.to(roomId).emit('player_disconnected', {
          playerId: socket.id,
          nickname: player.nickname,
          room: buildPublicRoomState(room),
        });
      } else {
        player.connected = false;
        const connectedPlayers = room.players.filter((p) => p.connected);

        if (connectedPlayers.length < 2 && room.state === 'playing') {
          room.state = 'finished';
          clearTimeout(prepTimers.get(roomId));
          prepTimers.delete(roomId);
          clearTimeout(botTimers.get(roomId));
          botTimers.delete(roomId);

          const lastPlayer = connectedPlayers[0];
          if (lastPlayer) {
            room.winnerId = lastPlayer.id;
            room.winner = { id: lastPlayer.id, nickname: lastPlayer.nickname, linesCount: lastPlayer.linesCompleted };
          }
          io.to(roomId).emit('bingo_claimed', {
            winner: room.winner,
            winnerId: room.winnerId,
            room: buildPublicRoomState(room),
          });
          emitGameOver(io, room, room.winner);
        } else {
          if (getCurrentTurnPlayer(room)?.id === socket.id) {
            advanceTurn(room);
            checkAndScheduleBotTurn(io, room);
          }
          io.to(roomId).emit('player_disconnected', {
            playerId: socket.id,
            nickname: player.nickname,
            room: buildPublicRoomState(room),
          });
        }
      }
    });
  });
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function emitError(socket, message) {
  socket.emit('error', { message });
}

function getRoomForSocket(socket, rooms) {
  const roomId = socket.data.roomId;
  if (!roomId) return null;
  return rooms.get(roomId) || null;
}

function emitGameOver(io, room, winner) {
  const allBoards = room.players.map((p) => ({
    id: p.id,
    name: p.nickname,
    board: p.board,
    linesCompleted: p.linesCompleted,
    isWinner: p.id === winner?.id,
    isBot: !!p.isBot,
  }));

  io.to(room.roomId).emit('game_over', {
    winnerName: winner?.nickname || 'Game Over',
    winnerId: winner?.id || room.winnerId,
    allBoards,
  });
}

function checkAndScheduleBotTurn(io, room) {
  if (room.state !== 'playing') return;
  const currentTurnPlayer = getCurrentTurnPlayer(room);
  if (!currentTurnPlayer || !currentTurnPlayer.isBot) return;

  if (botTimers.has(room.roomId)) {
    clearTimeout(botTimers.get(room.roomId));
    botTimers.delete(room.roomId);
  }

  const delay = getBotThinkingDelay();
  const timer = setTimeout(() => {
    botTimers.delete(room.roomId);
    executeBotMove(io, room, currentTurnPlayer);
  }, delay);

  botTimers.set(room.roomId, timer);
}

function executeBotMove(io, room, bot) {
  if (room.state !== 'playing') return;
  const currentTurnPlayer = getCurrentTurnPlayer(room);
  if (!currentTurnPlayer || currentTurnPlayer.id !== bot.id) return;

  const num = chooseNumber(bot, room);
  if (!num) return;

  room.calledNumbers.push(num);

  room.players.forEach((p) => {
    p.linesCompleted = computeLines(p.board, room.calledNumbers, room.gridSize);
  });

  const publicRoom = buildPublicRoomState(room);
  io.to(room.roomId).emit('number_called', {
    number: num,
    calledBy: bot.nickname,
    room: publicRoom,
  });

  if (bot.linesCompleted >= room.targetLines) {
    triggerBotBingo(io, room, bot);
    return;
  }

  advanceTurn(room);

  const otherWinningBot = room.players.find((p) => p.isBot && p.linesCompleted >= room.targetLines);
  if (otherWinningBot) {
    triggerBotBingo(io, room, otherWinningBot);
    return;
  }

  io.to(room.roomId).emit('room_updated', { room: buildPublicRoomState(room) });
  checkAndScheduleBotTurn(io, room);
}

function triggerBotBingo(io, room, bot) {
  if (room.state !== 'playing') return;
  if (room.winnerId || room.state === 'finished' || room.state === 'ended') return;

  room.state = 'finished';
  room.winnerId = bot.id;
  room.winner = { id: bot.id, nickname: bot.nickname, linesCount: bot.linesCompleted };

  clearTimeout(prepTimers.get(room.roomId));
  prepTimers.delete(room.roomId);
  clearTimeout(botTimers.get(room.roomId));
  botTimers.delete(room.roomId);

  const publicRoom = buildPublicRoomState(room);
  io.to(room.roomId).emit('bingo_claimed', {
    winner: room.winner,
    winnerId: room.winnerId,
    room: publicRoom,
  });

  emitGameOver(io, room, room.winner);
}

function startPlayingPhase(io, room) {
  room.state = 'playing';
  room.calledNumbers = [];
  room.currentTurnIndex = 0;

  io.to(room.roomId).emit('game_started', { room: buildPublicRoomState(room) });
  checkAndScheduleBotTurn(io, room);
}

function forceStartGame(io, rooms, roomId) {
  const room = rooms.get(roomId);
  if (!room || room.state !== 'prep') return;

  room.players.forEach((p) => {
    if (!p.lockedIn) {
      p.board = fillRemainingNumbers(p.board, room.gridSize);
      p.lockedIn = true;
    }
  });

  startPlayingPhase(io, room);
}
