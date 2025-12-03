// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Heroku Port Ayarı
const PORT = process.env.PORT || 3000; 

// Socket.IO'yu HTTP sunucusuna bağla
const io = socketIo(server);

// 🆕 DEĞİŞİKLİK: HTML dosyasını kök dizinden sunma
// Kullanıcı kök URL'ye (/) gittiğinde index.html dosyasını gönderir.
app.get('/', (req, res) => {
    // index.html'nin server.js ile aynı dizinde olduğunu varsayıyoruz.
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =========================================================
// OYUN SABİTLERİ VE FİZİK MANTIĞI (Sunucu Tarafı)
// =========================================================

// Oyun sabitleri (index.html'den kopyalandı)
const W = 900, H = 520; 
const PLAYER_RADIUS = 18;
const BALL_RADIUS = 12;
const PLAYER_ACCEL = 2200;
const PLAYER_MAX_SPEED = 370;
const BALL_FRICTION = 0.995;
const BALL_MAX_SPEED = 1200;
const GOAL_H = 120;
const SUPER_SHOT_FORCE = 3000; 
const DT = 1 / 60; // 60 FPS

// Vektör yardımcı fonksiyonlar (index.html'den kopyalandı)
function v(x = 0, y = 0) { return { x, y }; }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
function len(a) { return Math.hypot(a.x, a.y); }
function norm(a) { const L = len(a) || 1; return { x: a.x / L, y: a.y / L }; }

// Sunucu tarafı Player Sınıfı
class Player {
    constructor(x, y, id) {
        this.pos = v(x, y);
        this.vel = v();
        this.radius = PLAYER_RADIUS;
        this.id = id;
        this.isSuperShooting = false;
        this.canSuperShot = true;
    }
    
    // YEREL FİZİK GÜNCELLEME (Sunucu Motoru)
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

// Sunucu tarafı Ball Sınıfı
class Ball {
    constructor(x, y) {
        this.pos = v(x, y);
        this.vel = v();
        this.radius = BALL_RADIUS;
        this.isSupershotBall = false;
    }

    // YEREL FİZİK GÜNCELLEME (Sunucu Motoru)
    update(dt) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        this.vel.x *= BALL_FRICTION;
        this.vel.y *= BALL_FRICTION;
        
        const r = this.radius;
        // Kenar çarpışmaları (kale boşlukları hariç)
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
        if (s > BALL_MAX_SPEED) this.vel = mul(norm(this.vel), BALL_MAX_SPEED);

        this.isSupershotBall = false; // Her adımda sıfırla (görsel efekt)
    }
}

// Çarpışma hesaplamaları (index.html'den kopyalandı)
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
        
        // Vuruş kuvveti hesaplaması
        const kick = 1.6;
        let finalKickVelocity = len(player.vel) * kick + 200;
        
        // SÜPER VURUŞ MANTIĞI
        if (player.isSuperShooting) {
            finalKickVelocity += SUPER_SHOT_FORCE; 
            ball.isSupershotBall = true; // Topun görsel efektini aç
            player.isSuperShooting = false; // Vuruş yapıldı, sıfırla
        }
        
        const added = mul(n, finalKickVelocity);
        ball.vel.x = player.vel.x * 0.6 + added.x;
        ball.vel.y = player.vel.y * 0.6 + added.y;
        if (len(ball.vel) > BALL_MAX_SPEED) ball.vel = mul(norm(ball.vel), BALL_MAX_SPEED);
    }
}

function checkGoal(game) {
    if (game.ball.pos.x - game.ball.radius <= 0) {
        const y = game.ball.pos.y;
        if (y > (H - GOAL_H) / 2 && y < (H + GOAL_H) / 2) {
            game.scores[1]++;
            game.resetPositions();
            io.to(game.roomId).emit('gameReset'); // Gol oldu, istemcilere bildir
            return true;
        }
    }
    if (game.ball.pos.x + game.ball.radius >= W) {
        const y = game.ball.pos.y;
        if (y > (H - GOAL_H) / 2 && y < (H + GOAL_H) / 2) {
            game.scores[0]++;
            game.resetPositions();
            io.to(game.roomId).emit('gameReset'); // Gol oldu, istemcilere bildir
            return true;
        }
    }
    return false;
}

// Oyun yönetimi (Oda/Durum)
const games = {};

function createNewGame(roomId, socketId) {
    const game = {
        roomId: roomId,
        players: [socketId],
        p1: new Player(W * 0.2, H / 2, socketId),
        p2: new Player(W * 0.8, H / 2, null),
        ball: new Ball(W / 2, H / 2),
        p1Input: {}, // WASD durumu
        p2Input: {}, // WASD durumu
        scores: [0, 0],
        isRunning: false,
        
        // Game reset fonksiyonu
        resetPositions: function() {
            this.p1.pos = v(W * 0.2, H / 2);
            this.p1.vel = v();
            this.p1.isSuperShooting = false;
            this.p2.pos = v(W * 0.8, H / 2);
            this.p2.vel = v();
            this.p2.isSuperShooting = false;
            this.ball.pos = v(W / 2, H / 2);
            this.ball.vel = v((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200); // Başlangıç vuruşu
        }
    };
    game.resetPositions();
    games[roomId] = game;
    return game;
}

// =========================================================
// SOCKET.IO BAĞLANTILARI
// =========================================================

io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı:', socket.id);
    
    // --- ODA YÖNETİMİ ---
    socket.on('createRoom', (roomId) => {
        if (games[roomId]) {
            return socket.emit('error', 'Bu oda ID zaten kullanılıyor.');
        }
        socket.join(roomId);
        createNewGame(roomId, socket.id);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        const game = games[roomId];
        if (!game) {
            return socket.emit('error', 'Böyle bir oda bulunamadı.');
        }
        if (game.players.length >= 2) {
            return socket.emit('error', 'Oda dolu.');
        }

        socket.join(roomId);
        game.players.push(socket.id);
        game.p2.id = socket.id;
        game.isRunning = true;
        
        io.to(roomId).emit('gameStart', { 
            roomId: roomId, 
            playerIndex: game.p2.id === socket.id ? 1 : 0 
        });
        socket.emit('roomJoined', roomId);
    });
    
    // --- OYUNCU GİRİŞİ (WASD + BOŞLUK) ---
    socket.on('playerInput', (data) => {
        const game = games[data.roomId];
        if (!game || !game.isRunning) return;

        const playerIndex = game.players.indexOf(socket.id);
        if (playerIndex === -1) return;

        const inputState = (playerIndex === 0) ? game.p1Input : game.p2Input;
        const playerObject = (playerIndex === 0) ? game.p1 : game.p2;

        const key = data.key.toLowerCase();
        
        // Giriş durumunu güncelle (WASD)
        inputState[key] = data.pressed;

        // SÜPER VURUŞ MANTIĞI
        if (key === ' ' && data.pressed) { 
            if (playerObject.canSuperShot) { 
                playerObject.isSuperShooting = true; // Fizikte kullanılmak üzere işaretle
                playerObject.canSuperShot = false; 
                
                // Oyuncuya cooldown bilgisini gönder
                socket.emit('superShotCooldown', { playerIndex: playerIndex });
                
                // Cooldown süresi bitince tekrar hazır hale getir
                setTimeout(() => {
                    playerObject.canSuperShot = true;
                    socket.emit('superShotReady', { playerIndex: playerIndex });
                }, 5000); // 5 saniye
            }
        }
    });

    // --- RESTART / SKOR SIFIRLAMA ---
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

    // --- BAĞLANTI KESİLMESİ ---
    socket.on('disconnect', () => {
        for (const roomId in games) {
            const game = games[roomId];
            const playerIndex = game.players.indexOf(socket.id);

            if (playerIndex !== -1) {
                // Oyuncu odadan ayrıldı
                delete games[roomId]; // Odayı tamamen sil
                io.to(roomId).emit('error', 'Rakip oyundan ayrıldı. Yeni bir odaya katılın.');
                break;
            }
        }
    });
});

// =========================================================
// SUNUCU OYUN DÖNGÜSÜ (Fizik Motoru) - 60 FPS
// =========================================================

setInterval(() => {
    for (const roomId in games) {
        const game = games[roomId];
        if (!game.isRunning) continue;
        
        // 1. Fizik Hesaplamaları
        game.p1.update(DT, game.p1Input);
        game.p2.update(DT, game.p2Input);
        game.ball.update(DT);
        
        // Çarpışmalar
        resolveCircleCollision(game.p1, game.p2);
        playerBallCollision(game.p1, game.ball);
        playerBallCollision(game.p2, game.ball);
        
        // Gol kontrolü
        checkGoal(game);

        // 2. Oyun Durumunu İstemcilere Gönder
        io.to(roomId).emit('gameStateUpdate', {
            p1: { pos: game.p1.pos, isSuperShooting: game.p1.isSuperShooting },
            p2: { pos: game.p2.pos, isSuperShooting: game.p2.isSuperShooting },
            ball: { pos: game.ball.pos, isSupershotBall: game.ball.isSupershotBall },
            scores: game.scores
        });
    }
}, 1000 / 60); 

// Sunucuyu Başlat
server.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
