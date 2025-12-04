const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Render PORT
const PORT = process.env.PORT || 3000;

// Static
app.use(express.static(__dirname));

// Ana sayfa
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Socket.IO v4 (Render UYUMLU)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ======= BURADAN SONRA OYUN KODUN ========

// Basit örnek (sen burayı kendi oyun kodunla dolduracaksın)
io.on("connection", (socket) => {
    console.log("Bir oyuncu bağlandı:", socket.id);

    socket.on("playerMove", (data) => {
        socket.broadcast.emit("playerMove", data);
    });

    socket.on("disconnect", () => {
        console.log("Bir oyuncu ayrıldı:", socket.id);
    });
});

// ==========================================

// Sunucuyu başlat
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
