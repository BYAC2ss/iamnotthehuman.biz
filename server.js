// ================================
// GİRİŞ – Render uyumlu hale getirildi
// ================================
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');   // 🔥 DOĞRU IMPORT

const app = express();
const server = http.createServer(app);

// 🔥 Render port
const PORT = process.env.PORT || 3000;

// 🔥 Static dosyaları sun (index.html dahil)
app.use(express.static(__dirname));

// 🔥 Kök URL index.html göndersin
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔥 Render + GitHub Pages için CORS açık socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ================================
// SENİN OYUN MOTORU AYNI KALDI
// ================================

// Oyun sabitleri
const W = 900, H = 520; 
const PLAYER_RADIUS = 18;
const BALL_RADIUS = 12;
const PLAYER_ACCEL = 2200;
const PLAYER_MAX_SPEED = 370;
const BALL_FRICTION = 0.995;
const BALL_MAX_SPEED = 1200;
const GOAL_H = 120;
const SUPER_SHOT_FORCE = 3000; 
const DT = 1 / 60;

// Vektör yardımcı fonksiyonlar
function v(x = 0, y = 0) { return { x, y }; }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
function len(a) { return Math.hypot(a.x, a.y); }
function norm(a) { const L = len(a) || 1; return { x: a.x / L, y: a.y / L }; }

// Player sınıfı
class Player {
    constructor(x, y, id) {
        this.pos = v(x, y);
        this.vel = v();
        this.radius = PLAYER_RADIUS;
        this.id = id;
        this.isSuperShooting = false;
        this.canSuperShot = true;
    }
    
    update(dt, input) {
        let acc = v();
        if (input['w']) acc.y -= 1;
        if (input['s']) acc.y += 1;
        if (input['a']) acc.x -= 1;
        if (input['d']) acc.x += 1;

        if (acc.x !== 0 || acc.y !== 0) {
          acc = norm(acc);
          acc = mul(acc, PLAYER_ACCEL);
          this.vel.x += acc.x * dt;
          this.vel.y += acc.y * dt;
        } else {
          this.vel.x *= 0.93;
          this.vel.y *= 0.93;
        }
        const speed = len(this.vel);
        if (speed > PLAYER_MAX_SPEED) {
          this.vel = mul(norm(this.vel), PLAYER_MAX_SPEED);
        }
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        this.handleWallCollision();
    }

    handleWallCollision() {
        const r = this.radius;
        if (this.pos.x < r) { this.pos.x = r; this.vel.x *= -0.3; }
        if (this.pos.x > W - r) { this.pos.x = W - r; this.vel.x *= -0.3; }
        if (this.pos.y < r) { this.pos.y = r; this.vel.y *= -0.3; }
        if (this.pos.y > H - r) { this.pos.y = H - r; this.vel.y *= -0.3; }
    }
}

// Ball sınıfı
class Ball {
    constructor(x, y) {
        this.pos = v(x, y);
        this.vel = v();
        this.radius = BALL_RADIUS;
        this.isSupershotBall = false;
    }

    update(dt) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        this.vel.x *= BALL_FRICTION;
        this.vel.y *= BALL_FRICTION;
        
        const r = this.radius;
        if (this.pos.x < r) { 
            if (this.pos.y < (H - GOAL_H) / 2 || this.pos.y > (H + GOAL_H) / 2) {
                this.pos.x = r; this.vel.x *= -0.9;
            }
        }
        if (this.pos.x > W - r) { 
            if (this.pos.y < (H - GOAL_H) / 2 || this.pos.y > (H + GOAL_H) / 2) {
                this.pos.x = W - r; this.vel.x *= -0.9;
            }
        }
        if (this.pos.y < r) { this.pos.y = r; this.vel.y *= -0.9; }
        if (this.pos.y > H - r) { this.pos.y = H - r; this.vel.y *= -0.9; }
        
        const s = len(this.vel);
        if (s > BALL_MAX_SPEED) 
            this.vel = mul(norm(this.vel), BALL_MAX_SPEED);

        this.isSupershotBall = false;
    }
}

// Çarpışmalar
function resolveCircleCollision(a, b) {
    const d = sub(b.pos, a.pos);
    const dist = len(d);
    const minDist = a.radius + b.radius;
    if (dist === 0) return;
    if (dist < minDist) {
        const overlap = minDist - dist;
        const n = { x: d.x / dist, y: d.y / dist };
        a.pos.x -= n.x * overlap * 0.5;
        a.pos.y -= n.y * overlap * 0.5;
        b.pos.x += n.x * overlap * 0.5;
        b.pos.y += n.y * overlap * 0.5;
        const rel = sub(b.vel, a.vel);
        const relAlongN = rel.x * n.x + rel.y * n.y;
        if (relAlongN > 0) return;
        const impulse = -(1.8) * relAlongN;
        const impulseVec = mul(n, impulse);
        a.vel.x -= impulseVec.x * 0.5;
        a.vel.y -= impulseVec.y * 0.5;
        b.vel.x += impulseVec.x * 0.5;
        b.vel.y += impulseVec.y * 0.5;
    }
}

function playerBallCollision(player, ball) {
    const d = sub(ball.pos, player.pos);
    const dist = len(d);
    const minDist = player.radius + ball.radius;
    if (dist < minDist && dist > 0) {
        const n = { x: d.x / dist, y: d.y / dist };
        const overlap = minDist - dist;
        ball.pos.x += n.x * overlap * 1.02;
        ball.pos.y += n.y * overlap * 1.02;
        
        const kick = 1.6;
        let finalKickVelocity = len(player.vel) * kick + 200;
        
        if (player.isSuperShooting) {
            finalKickVelocity += SUPER_SHOT_FORCE;
            ball.isSupershotBall = true;
            player.isSuperShooting = false;
        }
        
        const added = mul(n, finalKickVelocity);
        ball.vel.x = player.vel.x * 0.6 + added.x;
        ball.vel.y = player.vel.y * 0.6 + added.y;
        
        if (len(ball.vel) > BALL_MAX_SPEED)
            ball.vel = mul(norm(ball.vel), BALL_MAX_SPEED);
    }
}

function checkGoal(game) {
    if (game.ball.pos.x - game.ball.radius <= 0) {
        const y = game.ball.pos.y;
        if (y > (H - GOAL_H) / 2 && y < (H + GOAL_H) / 2) {
            game.scores[1]++;
            game.resetPositions();
            io.to(game.roomId).emit('gameReset');
            return true;
        }
    }
    if (game.ball.pos.x + game.ball.radius >= W) {
        const y = game.ball.pos.y;
        if (y > (H - GOAL_H) / 2 && y < (H + GOAL_H) / 2) {
            game.scores[0]++;
            game.resetPositions();
            io.to(game.roomId).emit('gameReset');
            return true;
        }
    }
    return false;
}

// Oda yönetimi
const games = {};

function createNewGame(roomId, socketId) {
    const game = {
        roomId,
        players: [socketId],
        p1: new Player(W * 0.2, H / 2, socketId),
        p2: new Player(W * 0.8, H / 2, null),
        ball: new Ball(W / 2, H / 2),
        p1Input: {},
        p2Input: {},
        scores: [0, 0],
        isRunning: false,
        
        resetPositions() {
            this.p1.pos = v(W * 0.2, H / 2);
            this.p1.vel = v();
            this.p1.isSuperShooting = false;
            
            this.p2.pos = v(W * 0.8, H / 2);
            this.p2.vel = v();
            this.p2.isSuperShooting = false;
            
            this.ball.pos = v(W / 2, H / 2);
            this.ball.vel = v((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
        }
    };
    game.resetPositions();
    games[roomId] = game;
    return game;
}

// ================================
// SOCKET.IO
// ================================
io.on('connection', (socket) => {

    socket.on('createRoom', (roomId) => {
        if (games[roomId])
            return socket.emit('error', 'Bu oda ID zaten var.');
        
        socket.join(roomId);
        createNewGame(roomId, socket.id);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        const game = games[roomId];
        if (!game)
            return socket.emit('error', 'Oda bulunamadı.');

        if (game.players.length >= 2)
            return socket.emit('error', 'Oda dolu.');

        socket.join(roomId);
        game.players.push(socket.id);
        game.p2.id = socket.id;
        game.isRunning = true;
        
        io.to(roomId).emit('gameStart', {
            roomId,
            playerIndex: game.p2.id === socket.id ? 1 : 0
        });

        socket.emit('roomJoined', roomId);
    });

    socket.on('playerInput', (data) => {
        const game = games[data.roomId];
        if (!game || !game.isRunning) return;

        const playerIndex = game.players.indexOf(socket.id);
        if (playerIndex === -1) return;

        const input = playerIndex === 0 ? game.p1Input : game.p2Input;
        const player = playerIndex === 0 ? game.p1 : game.p2;

        const key = data.key.toLowerCase();
        input[key] = data.pressed;

        if (key === ' ' && data.pressed) {
            if (player.canSuperShot) {
                player.isSuperShooting = true;
                player.canSuperShot = false;

                socket.emit('superShotCooldown', { playerIndex });

                setTimeout(() => {
                    player.canSuperShot = true;
                    socket.emit('superShotReady', { playerIndex });
                }, 5000);
            }
        }
    });

    socket.on('restartGame', (data) => {
        const game = games[data.roomId];
        if (game) {
            game.resetPositions();
            io.to(data.roomId).emit('gameReset');
        }
    });

    socket.on('resetScores', (data) => {
        const game = games[data.roomId];
        if (game) {
            game.scores = [0, 0];
            game.resetPositions();
            io.to(data.roomId).emit('gameReset');
        }
    });

    socket.on('disconnect', () => {
        for (const rid in games) {
            const g = games[rid];
            const idx = g.players.indexOf(socket.id);

            if (idx !== -1) {
                delete games[rid];
                io.to(rid).emit('error', 'Rakip ayrıldı.');
                break;
            }
        }
    });
});

// ================================
// OYUN DÖNGÜSÜ
// ================================
setInterval(() => {
    for (const rid in games) {
        const g = games[rid];
        if (!g.isRunning) continue;

        g.p1.update(DT, g.p1Input);
        g.p2.update(DT, g.p2Input);
        g.ball.update(DT);

        resolveCircleCollision(g.p1, g.p2);
        playerBallCollision(g.p1, g.ball);
        playerBallCollision(g.p2, g.ball);

        checkGoal(g);

        io.to(rid).emit('gameStateUpdate', {
            p1: { pos: g.p1.pos, isSuperShooting: g.p1.isSuperShooting },
            p2: { pos: g.p2.pos, isSuperShooting: g.p2.isSuperShooting },
            ball: { pos: g.ball.pos, isSupershotBall: g.ball.isSupershotBall },
            scores: g.scores
        });
    }
}, 1000 / 60);

// ================================
// SUNUCU BAŞLAT
// ================================
server.listen(PORT, () => {
    console.log("Server çalışıyor:", PORT);
});
