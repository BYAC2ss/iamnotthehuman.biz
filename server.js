const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// =====================================================
//  ROOM SISTEMI + OYUN YÖNETİMİ (FRONTEND İLE TAM UYUMLU)
// =====================================================

let rooms = {};  
/*
rooms = {
  "ABCD": {
    players: [socketId1, socketId2],
    gameState: {...}
  }
}
*/

function createDefaultGameState() {
  return {
    p1: { pos: { x: 180, y: 260 }, isSuperShooting: false },
    p2: { pos: { x: 720, y: 260 }, isSuperShooting: false },
    ball: { pos: { x: 450, y: 260 }, isSupershotBall: false },
    scores: [0, 0]
  };
}

io.on("connection", (socket) => {
  
  // ---------------------------------------------------
  // ODA KUR
  // ---------------------------------------------------
  socket.on("createRoom", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [socket.id],
        gameState: createDefaultGameState()
      };

      socket.join(roomId);
      socket.emit("roomCreated", roomId);
    }
  });

  // ---------------------------------------------------
  // ODAYA KATIL
  // ---------------------------------------------------
  socket.on("joinRoom", (roomId) => {
    if (!rooms[roomId]) {
      socket.emit("error", "Böyle bir oda yok.");
      return;
    }

    if (rooms[roomId].players.length >= 2) {
      socket.emit("error", "Oda dolu.");
      return;
    }

    rooms[roomId].players.push(socket.id);
    socket.join(roomId);
    socket.emit("roomJoined", roomId);

    // İki oyuncu tamamlandı, oyunu başlat
    if (rooms[roomId].players.length === 2) {
      io.to(roomId).emit("gameStart", { playerIndex: 0 });
      io.to(rooms[roomId].players[1]).emit("gameStart", { playerIndex: 1 });
    }
  });

  // ---------------------------------------------------
  // OYUNCU INPUT
  // ---------------------------------------------------
  socket.on("playerInput", ({ roomId, key, pressed }) => {
    if (!rooms[roomId]) return;

    // Burada sadece input relay yapıyoruz
    socket.to(roomId).emit("playerInput", { key, pressed });
  });

  // ---------------------------------------------------
  // RESET KOMUTLARI
  // ---------------------------------------------------
  socket.on("restartGame", ({ roomId }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].gameState = createDefaultGameState();
    io.to(roomId).emit("gameReset");
  });

  socket.on("resetScores", ({ roomId }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].gameState.scores = [0, 0];

    io.to(roomId).emit("gameStateUpdate", rooms[roomId].gameState);
  });

  // ---------------------------------------------------
  // OYUNCU AYRILIRSA ODA SİLİNİR
  // ---------------------------------------------------
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const index = rooms[roomId].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomId].players.splice(index, 1);
        io.to(roomId).emit("error", "Rakip oyundan çıktı.");

        // Oda tamamen boşaldıysa sil
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log("Server is running:", PORT);
});
