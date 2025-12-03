import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;

const wss = new WebSocketServer({ port: PORT });

let players = {};
let ball = { x: 450, y: 260, vx: 0, vy: 0 };

function newPlayer() {
  return {
    x: Math.random() * 800 + 50,
    y: 260,
    vx: 0,
    vy: 0,
    input: {}
  };
}

wss.on("connection", ws => {
  const id = Math.random().toString(36).slice(2);
  players[id] = newPlayer();

  ws.on("message", data => {
    const msg = JSON.parse(data);
    if (msg.type === "input") players[id].input = msg.keys;
  });

  ws.on("close", () => {
    delete players[id];
  });
});

function physicsStep() {
  for (const id in players) {
    const p = players[id];

    const k = p.input || {};

    if (k.w) p.vy -= 0.8;
    if (k.s) p.vy += 0.8;
    if (k.a) p.vx -= 0.8;
    if (k.d) p.vx += 0.8;

    p.x += p.vx;
    p.y += p.vy;
  }

  const state = { players, ball };
  const json = JSON.stringify(state);

  wss.clients.forEach(c => c.send(json));
}

setInterval(physicsStep, 1000 / 60);

console.log("WebSocket server running on port", PORT);
