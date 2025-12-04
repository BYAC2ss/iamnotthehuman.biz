// ====== SERVER ======
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let players = {};
let ball = { x: 400, y: 300, vx: 0, vy: 0 };

// Fizik Ayarları — Eski Haxball’a yakın değerler
const PLAYER_SPEED = 3.0;
const FRICTION = 0.94;
const BALL_FRICTION = 0.985;
const BALL_SPEED_LIMIT = 7;

io.on("connection", (socket) => {
  console.log("Oyuncu bağlandı:", socket.id);

  players[socket.id] = {
    x: 200 + Math.random() * 200,
    y: 150 + Math.random() * 200,
    vx: 0,
    vy: 0,
    up: false,
    down: false,
    left: false,
    right: false
  };

  socket.emit("init", { id: socket.id, players, ball });

  socket.on("keydown", (key) => {
    players[socket.id][key] = true;
  });

  socket.on("keyup", (key) => {
    players[socket.id][key] = false;
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

// === Fizik motoru ===
setInterval(() => {
  // Oyuncu hareketi
  for (let id in players) {
    let p = players[id];

    if (p.up) p.vy -= PLAYER_SPEED;
    if (p.down) p.vy += PLAYER_SPEED;
    if (p.left) p.vx -= PLAYER_SPEED;
    if (p.right) p.vx += PLAYER_SPEED;

    p.vx *= FRICTION;
    p.vy *= FRICTION;

    p.x += p.vx;
    p.y += p.vy;

    // Saha sınırları
    if (p.x < 20) p.x = 20;
    if (p.x > 780) p.x = 780;
    if (p.y < 20) p.y = 20;
    if (p.y > 580) p.y = 580;

    // Top çarpışması
    let dx = p.x - ball.x;
    let dy = p.y - ball.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 28) {
      ball.vx = dx * 0.25;
      ball.vy = dy * 0.25;
    }
  }

  // Top hareket
  ball.vx *= BALL_FRICTION;
  ball.vy *= BALL_FRICTION;

  // Limit
  ball.vx = Math.max(Math.min(ball.vx, BALL_SPEED_LIMIT), -BALL_SPEED_LIMIT);
  ball.vy = Math.max(Math.min(ball.vy, BALL_SPEED_LIMIT), -BALL_SPEED_LIMIT);

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Sınırlar
  if (ball.x < 20 || ball.x > 780) ball.vx *= -1;
  if (ball.y < 20 || ball.y > 580) ball.vy *= -1;

  io.emit("state", { players, ball });

}, 1000 / 60);

http.listen(PORT, () => console.log("Server çalışıyor:", PORT));
