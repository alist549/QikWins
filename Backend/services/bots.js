const { COMMON } = require("../config/games");

// Practice players: demo accounts with their own practice money that fill
// empty seats so nobody waits in the demo. They carry ordinary names; the
// site says it is practice money everywhere, and the sign-in screen says
// practice players fill empty seats.
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
  if (!bot) bot = await store.createUser({ name, phone, balance: COMMON.DEMO_BALANCE });
  else if (bot.name !== name) bot = await store.update(bot.id, { name });
  if (bot.balance < stake) bot = await store.update(bot.id, { balance: COMMON.DEMO_BALANCE });
  const debited = await store.debit(bot.id, stake);
  return debited ? { userId: bot.id, name: bot.name, bot: true } : null;
}

module.exports = { seatBot };
