# BINGO BATTLE — Architecture Reference

> **Read this first** in any new session. It contains the full file tree, state shapes, and all Socket.io event contracts so you never need to scan the whole repo.

---

## File Tree

```
AIoep/
├── ARCHITECTURE.md          ← this file
├── backend/
│   ├── .env                 PORT=4000, CLIENT_URL=http://localhost:5173
│   ├── package.json
│   └── src/
│       ├── index.js         Express + Socket.io server bootstrap
│       ├── gameEngine.js    Pure game logic (no socket deps)
│       ├── botEngine.js     Multi-difficulty AI bot algorithms & turn pacing
│       └── socketHandlers.js All socket event registrations
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx         React root
        ├── App.jsx          Screen router + global socket mount
        ├── socket.js        Singleton socket.io-client instance
        ├── soundEngine.js   Pure Web Audio API synthesizer (0 dependencies, 100% offline)
        ├── confetti.js      Lightweight HTML5 Canvas multi-angle confetti engine
        ├── index.css        Tailwind directives, 3D buttons, neon glow & animations
        ├── context/
        │   └── GameContext.jsx  useReducer state store + GameProvider
        ├── hooks/
        │   ├── useSocketEvents.js  All socket listeners (mounted once) + audio/confetti hooks
        │   └── usePrepTimer.js     Countdown from server epoch timestamp
        └── components/
            ├── shared/
            │   ├── Toast.jsx            Global error/notification banner
            │   ├── ConnectionBadge.jsx  Live/Reconnecting indicator
            │   └── TopNavBar.jsx        Navigation header with Mute/Unmute audio toggle
            ├── entry/
            │   └── EntryScreen.jsx      Home — Host, Join, VS Bot (5x5–10x10 grid slider)
            ├── lobby/
            │   └── LobbyScreen.jsx      Room code, host settings, AI bot picker & player list
            └── game/
                ├── BingoCell.jsx        Memoized cell with scale-pop & animated cross cut
                ├── PrepBoard.jsx        30s board arrangement phase with 3D buttons
                ├── BingoHeader.jsx      B-I-N-G-O letter tracker
                ├── OpponentRadar.jsx    Turn indicator + last-3 calls + live progress
                ├── PlayingBoard.jsx     Main game board + Radiant 3D Slam BINGO button
                ├── FinishScreen.jsx     Winner display + Standings + Confetti triggers
                └── PostMatchModal.jsx   All-Players board reveal & inspection modal
```

---

## Server State Shape

### RoomState (in-memory, never sent raw to clients)

```ts
{
  roomId: string;              // 6-char uppercase alphanumeric
  hostId: string;              // socket.id of host
  gridSize: number;            // 5–10
  targetLines: number;         // 3–gridSize
  state: 'lobby' | 'prep' | 'playing' | 'finished';
  players: Player[];
  calledNumbers: number[];     // ordered list of picked numbers
  currentTurnIndex: number;    // index into players[]
  prepTimerEnd: number | null; // epoch ms
  winner: { id, nickname, linesCount } | null;
}

Player {
  id: string;          // socket.id
  nickname: string;
  isHost: boolean;
  isReady: boolean;
  board: number[];     // flat array, length gridSize²; private — never broadcast
  lockedIn: boolean;
  linesCompleted: number;
  connected: boolean;
}
```

### PublicRoomState (safe to broadcast — no board numbers)

```ts
{
  roomId, gridSize, targetLines, state, hostId,
  calledNumbers, currentTurnPlayerId, winner, prepTimerEnd,
  players: [{
    id, nickname, isHost, isReady, lockedIn, linesCompleted, connected, boardFilled
  }]
}
```

---

## Client State Shape (GameContext)

```ts
{
  connected: boolean;
  myId: string | null;       // socket.id
  myNickname: string;
  room: PublicRoomState | null;
  myBoard: number[];         // private board (flat array)
  error: string | null;
  notification: { type, message } | null;
  falseCallInfo: { linesCount, targetLines } | null;
  lastCalled: { number, calledBy }[];  // last 3 entries
  isShaking: boolean;        // red shake on false call
}
```

---

## Socket.io Event Contract

### Client → Server

| Event | Payload | When |
|-------|---------|------|
| `create_room` | `{ nickname, gridSize, targetLines }` | Entry screen |
| `create_bot_room` | `{ nickname, difficulty, gridSize, targetLines }` | Entry screen (VS Bot) |
| `join_room` | `{ nickname, roomId }` | Entry screen |
| `update_settings` | `{ gridSize, targetLines }` | Lobby (host only) |
| `add_bot` | `{ difficulty }` | Lobby (host only) |
| `remove_bot` | `{ botId }` | Lobby (host only) |
| `start_game` | `{}` | Lobby (host, ≥2 players) |
| `board_update` | `{ board: number[] }` | Prep phase |
| `lock_ready` | `{}` | Prep phase |
| `pick_number` | `{ number: number }` | Playing (current turn only) |
| `claim_bingo` | `{}` | Playing (any time) |
| `play_again` | `{}` | Finished / Post-Match Modal (host resets room) |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_created` | `{ roomId, room }` | Sent to host after creation |
| `room_joined` | `{ room, yourBoard }` | Sent to joiner on success |
| `room_updated` | `{ room }` | Broadcast on any lobby/prep change |
| `your_board` | `{ board }` | Individual board confirmation |
| `prep_started` | `{ room, yourBoard, prepTimerEnd }` | Sent to each player individually |
| `game_started` | `{ room }` | Broadcast when all lock in or timer expires |
| `number_called` | `{ number, calledBy, room }` | Broadcast when a number is picked |
| `bingo_claimed` | `{ winner, room }` | Broadcast on valid bingo (or last-man-standing) |
| `game_over` | `{ winnerName, allBoards: [{ name, board, linesCompleted }] }` | Broadcast post-match with all player boards revealed |
| `false_call_penalty` | `{ playerId, nickname, linesCount, targetLines }` | Only to the claiming player |
| `player_disconnected` | `{ playerId, nickname, room }` | Broadcast on disconnect |
| `error` | `{ message }` | Sent to socket that caused error |

---

## Key Design Decisions

### Anti-Hang Guarantees
- **Turn advancement**: `advanceTurn()` skips `connected: false` players — no dead turns.
- **Host reassignment**: On lobby disconnect, `removePlayer()` promotes `players[0]` to host.
- **Prep timer**: `setTimeout` on server auto-calls `forceStartGame` after 30s — client timer is display-only, synced to `prepTimerEnd` epoch.
- **Race condition (BINGO claim)**: Server re-verifies `computeLines()` against `calledNumbers` — client cannot fake lines.

### Performance
- `BingoCell` is `React.memo` — only cells whose props change re-render.
- All socket listeners are registered once in `useSocketEvents` (mounted in `App`) with full `socket.off()` cleanup.
- No polling — all state updates are push-driven via Socket.io events.

### Board Security
- Player boards are **never** included in `buildPublicRoomState()`. Only `linesCompleted` is shared.
- `pick_number` validation: server checks the number exists on the player's own board AND hasn't been called yet.

### Responsive Grid Scaling
- Grid uses CSS `display:grid` with `minmax(0,1fr)` columns — cells are always square via `aspect-square`.
- `maxWidth: min(100%, calc(100vh - 260px))` ensures the board never overflows vertically or horizontally.
- Font size and gap shrink progressively: 5–6 → normal, 7–8 → small, 9–10 → xs.

### AI Bot Engine & Pacing
- **Multi-Difficulty Engine (`/backend/src/botEngine.js`)**:
  - **Easy (Noob Bot)**: Randomly selects from remaining uncalled numbers on its board.
  - **Medium (Balanced Bot)**: Evaluates row and column cut counts, greedily completing the line closest to completion.
  - **Hard (Mastermind Bot)**: Evaluates intersection weights across rows, columns, and both diagonals (with center and diagonal intersection priority multipliers), and applies threat penalties to avoid picking numbers that advance opponent winning lines.
- **Natural Pacing**: 1.2s to 1.8s thinking delay simulated when it is the Bot's turn before emitting `pick_number`.
- **Auto-Lock & Auto-Bingo**: Bots auto-lock in prep phase; when a bot completes `targetLines`, it automatically triggers `claim_bingo`.

### Post-Match All-Players Board Inspection Modal
- Triggered by `game_over` event payload `{ winnerName, allBoards: [{ name, board, linesCompleted }] }`.
- Client component: `PostMatchModal.jsx` (accessible in `FinishScreen.jsx`).
- Features: Celebration header with crown badge, multi-column all-board viewer with glowing cut cells, and a "Play Again / Return to Lobby" action that resets room state (`calledNumbers = []`, `state = 'lobby'`) without re-entering the room code.

### Step 3: Visual Juice, 3D Buttons & Web Audio Sound Engine
- **Pure Web Audio API Synthesizer (`/frontend/src/soundEngine.js`)**:
  - **Zero External Dependencies**: Synthesizes tones on the fly via `AudioContext` with 100% offline reliability.
  - **Pencil Scratch / Cut Sound (`playCutSound`)**: Rapid downward frequency sweep (850Hz → 140Hz) paired with a bandpass-filtered noise friction burst (2800Hz, Q 3.0) simulating a physical pencil strike or blade slice.
  - **Line Completed Chime (`playLineCompleteSound`)**: Upbeat 4-note ascending chord chime (C5 523.25Hz, E5 659.25Hz, G5 783.99Hz, C6 1046.50Hz) with sparkling triangle overtones and bell-like decay.
  - **Victory Fanfare Horn (`playVictorySound`)**: Triumphant brass fanfare sequence (G4 → C5 → E5 → G5) followed by a full-bodied sustained low-pass filtered sawtooth major chord (C5 + E5 + G5 + C6) with 1.1s decay.
  - **False Call Warning Buzzer (`playFalseCallBuzzer`)**: Harsh dissonant dual-frequency buzzer (130Hz + 138.5Hz sawtooth) playing two sharp warning pulses.
  - **Tactile Click Pop (`playButtonClickSound`)**: Low-latency 40ms micro-click for physical button feel.
  - **Mute / Audio State Persistence**: Stored in `localStorage` (`bingo_audio_muted`) and reactive across components via observer subscription. Controlled from `TopNavBar.jsx`.
- **Celebratory Confetti Engine (`/frontend/src/confetti.js`)**:
  - Lightweight, multi-angle canvas confetti burst.
  - Fires dual bottom cannons (left ~60°, right ~120°) + radial center explosion + secondary delayed wave at 250ms and 500ms.
  - Custom neon particle physics with drag, gravity, opacity decay, and 3D fluttering. Auto-removes overlay canvas when idle.
- **Tactile 3D Buttons & Arcade Aesthetics**:
  - Beveled 3D buttons (`btn-3d`, `btn-3d-cyan`, `btn-3d-purple`, `btn-3d-emerald`, `btn-3d-slate`, `btn-3d-locked`) with physical click translation (`active:translate-y-1.5 active:shadow-[0_1px_0_#...]`).
  - **Radiant Slam BINGO Button**: Dark waiting state (`btn-bingo-waiting`) during line building; transforms into an energized, glowing amber/gold button (`btn-bingo-ready`) with pulsating neon border, bounce keyframes, and dual flame badges when lines >= targetLines.
  - **Cell Cut Animation**: Called cells play a scale-pop (`scale-95`) with an animated dual diagonal slash (✕) drawn via SVG stroke-dasharray keyframes.
- **5×5 to 10×10 Grid Size Slider**:
  - Range slider in `EntryScreen.jsx` (VS Bot mode) matching the full multiplayer capabilities (5x5 to 10x10), with linked Lines-to-Win configuration.

---

## Running Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev     # nodemon, port 4000

# Terminal 2 — Frontend
cd frontend
npm run dev     # vite, port 5173
```

Health check: `GET http://localhost:4000/health`

---

## Roadmap

- [x] Step 1: Real-time multiplayer engine & responsive boards
- [x] Step 2: Multi-difficulty AI bot algorithms, pacing & post-match inspection
- [x] Step 3: Web Audio sound synthesizer, confetti celebrations & 3D arcade buttons
- [ ] Spectator mode (join as observer, no board)
- [ ] Chat sidebar during game
- [ ] Room expiry / cleanup (TTL after inactivity)
- [ ] Persistent leaderboard (Redis or SQLite)
- [ ] PWA manifest + offline splash
