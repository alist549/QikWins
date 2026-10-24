const { Server } = require("socket.io");
const { verifyToken } = require("./middlewares/auth");

// Live rounds over Socket.IO. Everyone watching a game gets its state as it
// changes; a signed-in player also gets their own place in the round
// ("you") and wallet updates. Connect with { auth: { token } } to sign in;
// without a token you can still watch.
function attachSocket(server, games) {
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    const userId = verifyToken(socket.handshake.auth?.token);
    socket.data.userId = userId;
    if (userId) socket.join(`user:${userId}`);

    socket.on("watch", (game) => {
      const engine = games[game];
      if (!engine) return;
      socket.join(`game:${game}`);
      socket.emit(`${game}:state`, engine.state(userId));
    });
    socket.on("unwatch", (game) => socket.leave(`game:${game}`));
  });

  // Each watcher gets the state with their own part filled in.
  const publisher = (game) => async () => {
    const sockets = await io.in(`game:${game}`).fetchSockets();
    for (const s of sockets) s.emit(`${game}:state`, games[game].state(s.data.userId));
  };
  const notify = (userId, event, data) => io.to(`user:${userId}`).emit(event, data);

  return { io, publisher, notify };
}

module.exports = { attachSocket };
