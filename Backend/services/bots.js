const { COMMON } = require("../config/games");

// Fill-in players: house accounts with their own play credits that take
// empty seats so nobody waits while balances are play credits. They carry
// ordinary names; the site says balances are play credits, and the sign-up
// screen says fill-in players take empty seats.
//
// REAL MONEY: these must never play. "The house never plays" is the whole
// promise, and licensing depends on it. config/games.js turns them off when
// REAL_MONEY=on; real-money mode needs real players only.
const NAMES = [
  "Rudo", "Wanjiru", "Chidi", "Amara", "Farai", "Kwame", "Thandi", "Tunde", "Nomsa", "Kofi", "Zola", "Ama",
  "Sofia", "Lucas", "Priya", "Mateo", "Aisha", "Liam", "Mei", "Omar", "Elena", "Kenji", "Fatima", "Noah",
  "Chloe", "Diego", "Hana", "Yusuf", "Isla", "Arjun", "Lena", "Marco", "Nia", "Ravi", "Sara", "Tomás",
];
let seq = 0;

async function seatBot(store, stake) {
  seq += 1;
  const n = seq % 5000; // enough distinct players for a Mega Jackpot table
  const phone = `+1999000${String(n).padStart(4, "0")}`;
  let bot = await store.findUserByPhone(phone);
  const name = NAMES[n % NAMES.length];
  if (!bot) bot = await store.createUser({ name, phone, balance: 10000 });
  else if (bot.name !== name) bot = await store.update(bot.id, { name });
  if (bot.balance < stake) bot = await store.update(bot.id, { balance: 10000 });
  const debited = await store.debit(bot.id, stake);
  return debited ? { userId: bot.id, name: bot.name, bot: true } : null;
}

module.exports = { seatBot };
