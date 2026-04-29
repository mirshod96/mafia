const GameEngine = require('./server/gameLogic');
const game = new GameEngine(null);
try {
  game.addPlayer('socket123', 'test', undefined);
  console.log('addPlayer success');
} catch (e) {
  console.log('addPlayer error', e);
}
