const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameEngine = require('./gameLogic');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // allow all for dev
    methods: ["GET", "POST"]
  }
});

const game = new GameEngine(io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinGame', (payload) => {
    let name, playerId;
    if (typeof payload === 'string') {
      name = payload;
      playerId = socket.id; // Fallback for old cached clients
    } else if (payload && typeof payload === 'object') {
      name = payload.name;
      playerId = payload.playerId;
    }
    
    if (!name || !playerId) return;
    
    const result = game.addPlayer(socket.id, name, playerId);
    socket.emit('joinResult', result);
  });
  
  socket.on('joinAdmin', () => {
    socket.join('admin');
    io.to('admin').emit('adminState', game.getAdminState());
  });

  socket.on('startGame', () => {
    // Only allow admin or lobby leader to start
    game.startGame();
  });

  socket.on('resetGame', () => {
    game.resetGame();
  });

  socket.on('voteDay', (targetId) => {
    game.handleVote(socket.id, targetId, true);
  });

  socket.on('voteNight', (targetId) => {
    game.handleVote(socket.id, targetId, false);
  });

  socket.on('executeDayVote', () => {
    // Admin triggers this or it happens when time's up
    game.executeDayVote();
  });

  socket.on('diagnosticianInvestigate', (targetId) => {
    game.diagnosticianInvestigate(socket.id, targetId);
  });

  socket.on('therapistHeal', (targetId) => {
    game.therapistHeal(socket.id, targetId);
  });
  
  socket.on('triggerNextPhase', () => {
    // Admin manually moves phase if needed
    if (game.phase === 'night') {
      game.startDay();
    } else if (game.phase === 'day') {
      game.startNight();
    }
  });

  socket.on('adminKillPlayer', (targetId) => {
    game.adminKillPlayer(targetId);
  });

  socket.on('adminHealPlayer', (targetId) => {
    game.adminHealPlayer(targetId);
  });

  socket.on('sendMessage', ({ text, channel }) => {
    game.addChatMessage(socket.id, text, channel);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    game.removePlayer(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
