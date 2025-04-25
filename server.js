const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let players = {};
let board = Array(9).fill(null);
let currentTurn = 'O';

function resetGame() {
  board = Array(9).fill(null);
  currentTurn = 'O';
}

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Asignar O o X
  if (!players['O']) {
    players['O'] = socket.id;
    socket.emit('player-type', 'O');
  } else if (!players['X']) {
    players['X'] = socket.id;
    socket.emit('player-type', 'X');
  } else {
    socket.emit('room-full');
    return;
  }

  // Enviar tablero actual
  socket.emit('board-update', { board, currentTurn });

  // Movimiento recibido
  socket.on('play', ({ index, symbol }) => {
    if (board[index] || currentTurn !== symbol) return;

    board[index] = symbol;
    currentTurn = symbol === 'O' ? 'X' : 'O';
    io.emit('board-update', { board, currentTurn });

    // Verificar victoria
    const winCombos = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];

    for (const [a,b,c] of winCombos) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        io.emit('game-over', { winner: symbol });
        resetGame();
        return;
      }
    }

    if (board.every(cell => cell)) {
      io.emit('game-over', { winner: null });
      resetGame();
    }
  });

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    if (players['O'] === socket.id) delete players['O'];
    if (players['X'] === socket.id) delete players['X'];
    resetGame();
    io.emit('player-disconnected');
  });
});

server.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
