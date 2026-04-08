const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 👇 ESTA es la forma moderna segura
app.options(/.*/, cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 🔥 Estado global
let globalState = {
  delay: 0,     // tiempo acumulado
  toggle: false // valor booleano
};

// 📡 broadcast genérico
function broadcast(payload) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

// 📡 conexión WS
wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  // estado inicial separado
  ws.send(JSON.stringify({
    type: "INIT",
    data: globalState
  }));

  ws.on("close", () => {
    console.log("Cliente desconectado");
  });
});


// =============================
// 1️⃣ ENDPOINT DE TIEMPO
// =============================
app.post("/delay", (req, res) => {
  const { value } = req.body;

  if (typeof value !== "number") {
    return res.status(400).json({
      error: "value debe ser número"
    });
  }

  // 🔥 acumula (acepta negativos)
  globalState.delay += value;

  // 📡 evento SOLO de delay
  broadcast({
    type: "DELAY_UPDATED",
    delta: value,
    total: globalState.delay
  });

  res.json({
    message: "Delay actualizado",
    delay: globalState.delay
  });
});


// =============================
// 2️⃣ TOGGLE AUTOMÁTICO
// =============================
setInterval(() => {
  globalState.toggle = !globalState.toggle;
  globalState.delay -= 10;

  // 📡 evento SOLO de toggle
  broadcast({
    type: "TOGGLE_UPDATED",
    toggle: globalState.toggle,
    delta: -10,               // 👈 agregado
    total: globalState.delay
  });

}, 30000);


// =============================
// EXTRA: endpoint status
// =============================
app.get("/status", (req, res) => {
  res.json(globalState);
});


// =============================
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
