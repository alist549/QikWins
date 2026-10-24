const { memoryStore } = require("../services/store");
const { createPenalties } = require("../games/penalties");
const { PENALTY } = require("../config/games");

async function players(store, n, balance = 1000) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(await store.createUser({ name: `P${i}`, phone: `+2637730000${String(i).padStart(2, "0")}`, balance }));
  return list;
}

// Plays one match so that `winner` scores every kick and saves every kick.
async function winMatch(game, winner, loser) {
  for (let i = 0; i < 20; i++) {
    const v = game.state(winner.id);
    if (!v.match || v.match.won != null) return v;
    const table = game.tableOf(winner.id);
    const m = table.matches.find((x) => x.players.some((p) => p.userId === winner.id));
    if (v.match.role === "shoot") {
      game.kick(winner.id, 0);
      game.kick(loser.id, 1); // dives the wrong way: goal
    } else {
      game.kick(loser.id, 2);
      game.kick(winner.id, 2); // same spot: saved
    }
    await game.advance(table, m);
  }
  throw new Error("match did not finish");
}

const opponentOf = (game, user, list) => {
  const m = game.tableOf(user.id).matches.find((x) => x.players.some((p) => p.userId === user.id));
  const other = m.players.find((p) => p.userId !== user.id).userId;
  return list.find((p) => p.id === other);
};

describe("Penalties", () => {
  test("a duel: same spot is a save; the winner takes both stakes less the fee", async () => {
    const store = memoryStore();
    const game = createPenalties({ store, autoRun: false, config: { ...PENALTY, BOTS: false } });
    const [a, b] = await players(store, 2);
    await game.join(a.id, { mode: "duel", stake: 100 });
    const start = await game.join(b.id, { mode: "duel", stake: 100 });
    expect(start.status).toBe("playing");
    expect(start.match.role === "shoot" || start.match.role === "keep").toBe(true);
    await winMatch(game, a, b);
    const end = game.state(a.id);
    expect(end.status).toBe("done");
    expect(end.match).toBeNull();
    expect(end.table.result).toMatchObject({ champion: "P0", fee: 10, paidOut: 190 });
    expect((await store.getUser(a.id)).balance).toBe(900 + 190);
    expect((await store.getUser(b.id)).balance).toBe(900);
    const record = (await store.listRounds("penalties", 1))[0];
    expect(record.history[0].matches[0].score.reduce((x, y) => x + y)).toBe(2);
  });

  test("a cup: winners play on, and the champion takes their whole bank", async () => {
    const store = memoryStore();
    const game = createPenalties({ store, autoRun: false, config: { ...PENALTY, BOTS: false, CUP_SEATS: 4 } });
    const ps = await players(store, 4);
    for (const p of ps) await game.join(p.id, { mode: "cup", stake: 100 });
    expect(game.state(ps[0].id).table.roundName).toBe("Semi-finals");
    const champ = ps[0];
    await winMatch(game, champ, opponentOf(game, champ, ps));
    const others = ps.filter((p) => game.tableOf(p.id).seats.find((s) => s.userId === p.id).state === "in" && p !== champ);
    const [x] = others.filter((p) => game.state(p.id).match.won == null);
    await winMatch(game, x, opponentOf(game, x, ps));

    const choice = game.state(champ.id);
    expect(choice.status).toBe("choice");
    expect(choice.table.you).toMatchObject({ bank: 190, nextBank: 361 });
    await game.choose(champ.id, "continue");
    await game.choose(x.id, "continue");
    expect(game.state(champ.id).table.roundName).toBe("Final");
    await winMatch(game, champ, x);
    const end = game.state(champ.id);
    expect(end.status).toBe("done");
    expect(end.table.you).toMatchObject({ state: "champion", payout: 361 });
    expect((await store.getUser(champ.id)).balance).toBe(900 + 361);
    expect(end.table.result.fee).toBe(10 + 10 + 19);
  });

  test("no answer at the choice means cash out", async () => {
    const store = memoryStore();
    const game = createPenalties({ store, autoRun: false, config: { ...PENALTY, BOTS: false, CUP_SEATS: 4 } });
    const ps = await players(store, 4);
    for (const p of ps) await game.join(p.id, { mode: "cup", stake: 50 });
    const a = ps[0];
    await winMatch(game, a, opponentOf(game, a, ps));
    const rest = ps.filter((p) => p !== a && game.state(p.id).match.won == null);
    await winMatch(game, rest[0], opponentOf(game, rest[0], ps));
    await game.closeChoice(game.tableOf(a.id));
    const end = game.state(a.id);
    expect(end.status).toBe("done");
    expect(end.table.you).toMatchObject({ state: "cashed", payout: 95 });
    expect((await store.getUser(a.id)).balance).toBe(950 + 95);
  });

  test("practice players fill a cup and kick for themselves", async () => {
    const store = memoryStore();
    const game = createPenalties({ store, autoRun: false, config: { ...PENALTY, CUP_SEATS: 8 } });
    const [a] = await players(store, 1);
    await game.join(a.id, { mode: "cup", stake: 25 });
    await game.fillWithBots(game.tableOf(a.id));
    const v = game.state(a.id);
    expect(v.status).toBe("playing");
    expect(v.table.roundName).toBe("Quarter-finals");
    expect(v.table.players).toHaveLength(8);
    expect(v.table.players.some((p) => /bot/i.test(p.name))).toBe(false);
  });
});
