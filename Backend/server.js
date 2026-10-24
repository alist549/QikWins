require("dotenv").config();
const path = require("path");
const { createServer } = require("http");
const { createApp } = require("./app");
const { attachSocket } = require("./socket");
const { createHopOff } = require("./games/hopOff");
const { createUnderdog } = require("./games/underdog");
const { createDoubleOrNothing } = require("./games/doubleOrNothing");
const { createSevenX } = require("./games/sevenX");
const { createBigWheel } = require("./games/bigWheel");
const { createLastStanding } = require("./games/lastStanding");
const { memoryStore, mongoStore } = require("./services/store");

const PORT = process.env.PORT || 3000;

async function main() {
  // STORE=memory runs without a database (everything is lost on restart).
  let store;
  if (process.env.STORE === "memory") {
    store = memoryStore();
  } else {
    await require("./config/db").connect();
    store = mongoStore();
  }

  const games = {};
  const server = createServer();
  const live = attachSocket(server, games);
  games["hop-off"] = createHopOff({ store, publish: live.publisher("hop-off"), notify: live.notify });
  games.underdog = createUnderdog({ store, publish: live.publisher("underdog"), notify: live.notify });
  games["big-wheel"] = createBigWheel({ store, publish: live.publisher("big-wheel"), notify: live.notify });
  // Head-to-head and table games talk to each player directly.
  const double = createDoubleOrNothing({ store, publish: live.broadcast, notify: live.notify });
  const seven = createSevenX({ store, publish: live.broadcast, notify: live.notify });
  const standing = createLastStanding({ store, publish: live.broadcast, notify: live.notify });

  server.on("request", createApp({ store, hopOff: games["hop-off"], underdog: games.underdog, double, seven, wheel: games["big-wheel"], standing, webDir: process.env.WEB_DIR && path.resolve(__dirname, process.env.WEB_DIR) }));
  [...Object.values(games), double, seven, standing].forEach((g) => g.start());
  server.listen(PORT, () => console.log(`QikWins server on port ${PORT} (${store.kind} store, demo mode)`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
