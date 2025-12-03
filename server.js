// server.js (Örnek Node.js sunucu kodu)
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = 3000;
// Burada aktif odaları ve oyun durumlarını tutacağız
const games = {}; 

io.on('connection', (socket) => {
    console.log(`Yeni oyuncu bağlandı: ${socket.id}`);

    // Oyuncu oda kurmak istiyor
    socket.on('createRoom', (roomId) => {
        // Oda ID'sini kullanarak bir oyun başlat
        if (!games[roomId]) {
            games[roomId] = {
                players: [],
                // Oyunun başlangıç durumunu burada tutun
                // Örnek: ball: { pos: {x: ...}, vel: {y: ...} }
            };
            socket.join(roomId); // Oyuncuyu odaya kat
            games[roomId].players.push(socket.id);
            socket.emit('roomCreated', roomId);
        } else {
            socket.emit('error', 'Oda zaten var!');
        }
    });

    // Oyuncu bir odaya katılmak istiyor
    socket.on('joinRoom', (roomId) => {
        if (games[roomId] && games[roomId].players.length < 2) {
            socket.join(roomId); // Oyuncuyu odaya kat
            games[roomId].players.push(socket.id);
            socket.emit('roomJoined', roomId);

            // Oyun başlamaya hazır, tüm odaya sinyal gönder
            if (games[roomId].players.length === 2) {
                io.to(roomId).emit('gameStart', games[roomId]);
            }
        } else {
            socket.emit('error', 'Oda bulunamadı veya dolu.');
        }
    });

    // Oyuncu hareket girişi gönderdi
    socket.on('playerInput', (data) => {
        // data = { roomId: 'ABC-123', input: { up: true, ... } }
        // TODO: Oyun fiziğini burada hesapla
        
        // ÖRNEK: Oyuncunun pozisyonunu ve topun durumunu hesapladıktan sonra
        // Güncel durumu odaya geri gönder:
        // io.to(data.roomId).emit('gameStateUpdate', newState);
    });

    socket.on('disconnect', () => {
        console.log(`Oyuncu ayrıldı: ${socket.id}`);
        // TODO: Oyuncunun ayrıldığı odayı ve oyunu temizle.
    });
});

http.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
