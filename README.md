# Bingo Battle — Quick Start

## Run both servers (open two separate terminals)

### Terminal 1 — Backend (port 4000)
```bash
cd backend
npm run dev
```

### Terminal 2 — Frontend (port 5173)
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Health Check
```
GET http://localhost:4000/health
→ { "status": "ok", "rooms": 0, "uptime": 12.3 }
```
