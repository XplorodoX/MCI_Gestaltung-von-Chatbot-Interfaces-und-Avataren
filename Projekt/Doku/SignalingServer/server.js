const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3001 });

console.log("Signaling server running on ws://localhost:3001");

wss.on("connection", ws => {
  ws.on("message", msg => {
    // Broadcast messages to all clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    });
  });
});