const { Server } = require("socket.io");
const http = require("http");
const GameEngine = require('./server/gameLogic');

const server = http.createServer();
const io = new Server(server);
const game = new GameEngine(io);

io.on('connection', (socket) => {
  socket.on('joinGame', ({ name, playerId }) => {
    game.addPlayer(socket.id, name, playerId);
  });
});

server.listen(3002, () => {
  console.log('Listening on 3002');
  
  const { io: Client } = require("socket.io-client");
  const clientSocket = Client("http://localhost:3002");
  clientSocket.on("connect", () => {
    // Send string instead of object (simulating old cached client)
    clientSocket.emit("joinGame", "OldPlayer");
    setTimeout(() => {
      console.log('Old client simulated, checking game state...');
      console.log(game.players);
      process.exit(0);
    }, 500);
  });
});
