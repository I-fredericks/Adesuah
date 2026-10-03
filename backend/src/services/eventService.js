const clients = new Map();

const subscribe = (userId, res) => {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(':hb\n\n');
    } catch {
      /* dropped */
    }
  }, 25000);

  res.on('close', () => {
    clearInterval(heartbeat);
    const set = clients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(userId);
    }
  });
};

const sendToUser = (userId, event, data) => {
  const set = clients.get(Number(userId));
  if (!set) return false;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      /* dropped */
    }
  }
  return true;
};

const connectedCount = () => clients.size;

module.exports = { subscribe, sendToUser, connectedCount };
