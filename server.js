const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// STATIC FILES
app.use(express.static(__dirname));

// SEND INDEX
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SOCKET.IO (Render uyumlu)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
