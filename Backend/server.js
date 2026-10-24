require("dotenv").config();
const { createServer } = require("http");
const { createApp } = require("./app");
const { attachSocket } = require("./socket");
const { createHopOff } = require("./games/hopOff");
const { createUnderdog } = require("./games/underdog");
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

  server.on("request", createApp({ store, hopOff: games["hop-off"], underdog: games.underdog }));
  Object.values(games).forEach((g) => g.start());
  server.listen(PORT, () => console.log(`QikWins server on port ${PORT} (${store.kind} store, demo mode)`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
