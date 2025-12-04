const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
    console.log("Bağlanan:", socket.id);

    // ODAYA KATILMA
    socket.on("joinRoom", (roomName) => {
        socket.join(roomName);
        console.log(socket.id, "katıldı:", roomName);

        socket.emit("joined", roomName); // oyuncuya geri bildirim
        socket.to(roomName).emit("playerJoined", socket.id);
    });

    // HAREKET GÖNDERME (oda bazlı)
    socket.on("playerMove", (data) => {
        io.to(data.room).emit("playerMove", data);
    });

    socket.on("disconnect", () => {
        console.log("Ayrıldı:", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
