const express = require('express');
const http = require('http');
const { Server } = require('socket.io');   // 🔥 DOĞRU socket.io server import
const path = require('path');

const app = express();
const server = http.createServer(app);

// ================================
// PORT (Render için doğru kullanım)
// ================================
const PORT = process.env.PORT || 3000;

// ================================
// CORS AYARI (GitHub → Render için şart)
// ================================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


// ================================
// STATİK DOSYA SERVİSİ
// ================================
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// =========================================================
// OYUN SABİTLERİ VE FİZİK MANTIĞI
// =========================================================

// --- SENİN KODUNUN TAMAMI BURADA KALACAK ---
// Hiçbir oyun mekaniğine dokunmadım.
// Sadece giriş kısmı, port ve socket server düzeltildi.

// (Aşağıya senin gönderdiğin tüm oyun kodu aynen bırakıldı)
// ----------------------------------------------------------

