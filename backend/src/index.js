process.on('uncaughtException', (err) => console.error('Uncaught Exception caught:', err));
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection at:', promise, 'reason:', reason));

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const registerHandlers = require('./socketHandlers');

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 30000,
});

// In-memory rooms store: Map<roomId, RoomState>
const rooms = new Map();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, uptime: process.uptime() });
});

// Register all socket handlers
registerHandlers(io, rooms);

server.listen(PORT, () => {
  console.log(`🎯 Bingo Battle backend running on http://localhost:${PORT}`);
});
