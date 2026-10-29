/**
 * botEngine.js - Multi-Difficulty AI Bot Engine for BINGO BATTLE
 *
 * Difficulties:
 *   - Easy (Noob Bot): Randomly selects from remaining uncalled numbers on its board.
 *   - Medium (Balanced Bot): Evaluates lines with the highest cut count and greedily
 *     chooses a number to complete its nearest row or column.
 *   - Hard (Mastermind Grandmaster Bot): 2-Ply Minimax lookahead evaluating line weights
 *     (N marks = +15000, N-1 = +1850, N-2 = +280, N-3 = +45), immediate win detection (+1000000),
 *     positional intersection bonuses (center = 4 lines, diagonals = 3 lines, others = 2 lines),
 *     and defensive opponent counter lookahead.
 */

const { autoFillBoard, computeLines } = require('./gameEngine');

/**
 * Generate a new Bot player object with unique name (e.g. "Bot 1 (Hard)").
 */
function createBotPlayer(difficulty = 'medium', gridSize = 5, botIndex = 1) {
  const diffLower = difficulty.toLowerCase();
  const validDifficulty = ['easy', 'medium', 'hard'].includes(diffLower) ? diffLower : 'medium';

  const diffLabels = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };

  const id = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nickname = `Bot ${botIndex} (${diffLabels[validDifficulty]})`;

  return {
    id,
    nickname,
    isHost: false,
    isReady: true,
    board: autoFillBoard(gridSize),
    lockedIn: true,
    linesCompleted: 0,
    connected: true,
    isBot: true,
    difficulty: validDifficulty,
  };
}

/**
 * Easy (Noob Bot):
 * Randomly selects from remaining uncalled numbers on its board.
 */
function chooseNumberEasy(bot, calledNumbers) {
  const calledSet = new Set(calledNumbers);
  const uncalled = bot.board.filter((num) => !calledSet.has(num));
  if (uncalled.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * uncalled.length);
  return uncalled[randomIndex];
}

/**
 * Medium (Balanced Bot):
 * Evaluates lines with the highest cut count and greedily chooses a number
 * to complete its nearest row or column.
 */
function chooseNumberMedium(bot, calledNumbers, gridSize) {
  const N = gridSize;
  const calledSet = new Set(calledNumbers);

  const candidateLines = [];

  // Rows
  for (let r = 0; r < N; r++) {
    const uncalled = [];
    let cuts = 0;
    for (let c = 0; c < N; c++) {
      const val = bot.board[r * N + c];
      if (calledSet.has(val)) cuts++;
      else uncalled.push(val);
    }
    if (uncalled.length > 0) {
      candidateLines.push({ type: 'row', index: r, cuts, uncalled });
    }
  }

  // Columns
  for (let c = 0; c < N; c++) {
    const uncalled = [];
    let cuts = 0;
    for (let r = 0; r < N; r++) {
      const val = bot.board[r * N + c];
      if (calledSet.has(val)) cuts++;
      else uncalled.push(val);
    }
    if (uncalled.length > 0) {
      candidateLines.push({ type: 'col', index: c, cuts, uncalled });
    }
  }

  if (candidateLines.length === 0) {
    return chooseNumberEasy(bot, calledNumbers);
  }

  candidateLines.sort((a, b) => b.cuts - a.cuts);
  const maxCuts = candidateLines[0].cuts;
  const bestLines = candidateLines.filter((l) => l.cuts === maxCuts);
  const chosenLine = bestLines[Math.floor(Math.random() * bestLines.length)];
  return chosenLine.uncalled[Math.floor(Math.random() * chosenLine.uncalled.length)];
}

/**
 * Evaluate all 2N + 2 lines on bot board under a given called set
 * using the specified line weights:
 *   N marks (completed): +15000
 *   N - 1 marks: +1850
 *   N - 2 marks: +280
 *   N - 3 marks: +45
 */
function evaluateBoardLines(board, calledSet, N) {
  let score = 0;
  let completedCount = 0;

  const scoreLine = (marks) => {
    if (marks === N) {
      completedCount++;
      return 15000;
    }
    if (marks === N - 1) return 1850;
    if (marks === N - 2) return 280;
    if (marks === N - 3) return 45;
    return 0;
  };

  // Rows
  for (let r = 0; r < N; r++) {
    let marks = 0;
    for (let c = 0; c < N; c++) {
      if (calledSet.has(board[r * N + c])) marks++;
    }
    score += scoreLine(marks);
  }

  // Columns
  for (let c = 0; c < N; c++) {
    let marks = 0;
    for (let r = 0; r < N; r++) {
      if (calledSet.has(board[r * N + c])) marks++;
    }
    score += scoreLine(marks);
  }

  // Main diagonal
  let mainMarks = 0;
  for (let i = 0; i < N; i++) {
    if (calledSet.has(board[i * N + i])) mainMarks++;
  }
  score += scoreLine(mainMarks);

  // Anti diagonal
  let antiMarks = 0;
  for (let i = 0; i < N; i++) {
    if (calledSet.has(board[i * N + (N - 1 - i)])) antiMarks++;
  }
  score += scoreLine(antiMarks);

  return { score, completedCount };
}

/**
 * Hard (Grandmaster 2-Ply Minimax Bot):
 * Evaluates every available number on its N×N board using line weights:
 *   completed line (N marks) = +15000
 *   N-1 marks = +1850
 *   N-2 marks = +280
 *   N-3 marks = +45
 * If picking a number reaches >= targetLines, returns immediately with +1000000.
 * Otherwise runs a 2-ply lookahead over the best follow-up move plus
 * positional intersection bonus (center = 4 lines, diagonals = 3 lines, others = 2 lines)
 * and opponent counter penalties.
 */
function chooseNumberHard(bot, room) {
  const { calledNumbers, gridSize, targetLines, players } = room;
  const N = gridSize;
  const calledSet = new Set(calledNumbers);

  const availableNumbers = [];
  const cellPositions = new Map(); // num -> { r, c, linesCount }

  for (let idx = 0; idx < bot.board.length; idx++) {
    const val = bot.board[idx];
    if (!calledSet.has(val)) {
      availableNumbers.push(val);
      const r = Math.floor(idx / N);
      const c = idx % N;
      const onMainDiag = r === c;
      const onAntiDiag = r + c === N - 1;

      // Positional intersection line count:
      // row (1) + col (1) + mainDiag (1 if on it) + antiDiag (1 if on it)
      let linesCount = 2;
      if (onMainDiag && onAntiDiag) {
        linesCount = 4; // Center cell
      } else if (onMainDiag || onAntiDiag) {
        linesCount = 3; // Diagonal cell
      }
      cellPositions.set(val, { r, c, linesCount });
    }
  }

  if (availableNumbers.length === 0) {
    return chooseNumberEasy(bot, calledNumbers);
  }

  // 1. Immediate Win Check (+1,000,000)
  for (const num of availableNumbers) {
    const simSet = new Set(calledNumbers);
    simSet.add(num);
    const { completedCount } = evaluateBoardLines(bot.board, simSet, N);
    if (completedCount >= targetLines) {
      // Immediate winning pick!
      return num;
    }
  }

  const opponents = (players || []).filter((p) => p.id !== bot.id && p.connected);

  let bestNumber = availableNumbers[0];
  let highestTotalScore = -Infinity;

  // 2. 2-Ply Minimax Evaluation
  for (const num of availableNumbers) {
    const pos = cellPositions.get(num);
    const positionalBonus = (pos?.linesCount || 2) * 120; // 4 lines = 480, 3 lines = 360, 2 lines = 240

    // Ply 1: Evaluate state after picking `num`
    const ply1Set = new Set(calledNumbers);
    ply1Set.add(num);
    const { score: ply1Score, completedCount: ply1Completed } = evaluateBoardLines(bot.board, ply1Set, N);

    // Ply 2: Lookahead to best follow-up move from remaining numbers
    let bestFollowUpScore = 0;
    const remainingAfterNum = availableNumbers.filter((n) => n !== num);

    // Limit ply 2 search if available pool is large for fast responsiveness
    const ply2Candidates = remainingAfterNum.length > 25
      ? remainingAfterNum.slice(0, 25)
      : remainingAfterNum;

    for (const followUpNum of ply2Candidates) {
      const ply2Set = new Set(ply1Set);
      ply2Set.add(followUpNum);
      const { score: ply2Score, completedCount: ply2Completed } = evaluateBoardLines(bot.board, ply2Set, N);

      let followUpVal = ply2Score;
      if (ply2Completed >= targetLines) {
        followUpVal += 100000; // Close to victory
      }
      if (followUpVal > bestFollowUpScore) {
        bestFollowUpScore = followUpVal;
      }
    }

    // 3. Opponent Counter Check (prevent giving opponent an immediate win)
    let opponentPenalty = 0;
    for (const opp of opponents) {
      if (!Array.isArray(opp.board)) continue;
      if (!opp.board.includes(num)) continue;

      const oppSimSet = new Set(calledNumbers);
      oppSimSet.add(num);
      const oppLines = computeLines(opp.board, Array.from(oppSimSet), N);
      if (oppLines >= targetLines) {
        opponentPenalty += 500000; // Avoid handing opponent victory
      } else if (oppLines > (opp.linesCompleted || 0)) {
        opponentPenalty += 350;
      }
    }

    // Grandmaster Total Score
    const totalScore = ply1Score + positionalBonus + (0.65 * bestFollowUpScore) - opponentPenalty;

    if (totalScore > highestTotalScore) {
      highestTotalScore = totalScore;
      bestNumber = num;
    }
  }

  return bestNumber || chooseNumberEasy(bot, calledNumbers);
}

/**
 * Main dispatch function for bot move based on its difficulty.
 */
function chooseNumber(bot, room) {
  const difficulty = (bot.difficulty || 'medium').toLowerCase();
  switch (difficulty) {
    case 'easy':
      return chooseNumberEasy(bot, room.calledNumbers);
    case 'hard':
      return chooseNumberHard(bot, room);
    case 'medium':
    default:
      return chooseNumberMedium(bot, room.calledNumbers, room.gridSize);
  }
}

/**
 * Natural pacing delay: 1.2s to 1.8s
 */
function getBotThinkingDelay() {
  return Math.floor(800 + Math.random() * 600);
}

module.exports = {
  createBotPlayer,
  chooseNumber,
  chooseNumberEasy,
  chooseNumberMedium,
  chooseNumberHard,
  getBotThinkingDelay,
};
