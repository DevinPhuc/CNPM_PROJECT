"use strict";
// Module quản lý kết nối thời gian thực (SSE & Server Events)
const sseClients = new Set();

function handleSseConnection(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Gửi thông điệp chào mở kết nối
  res.write("data: " + JSON.stringify({ type: "CONNECTED", message: "Jewels Realtime Connected" }) + "\n\n");
  sseClients.add(res);

  // Gửi heartbeat giữ kết nối sau mỗi 25s
  const heartbeat = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
}

function broadcastRealtime(type, data = {}) {
  const payload = JSON.stringify({
    type,
    data,
    timestamp: Date.now(),
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

module.exports = { handleSseConnection, broadcastRealtime };
