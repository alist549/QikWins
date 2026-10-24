const { COMMON } = require("../config/games");

// Demo bots: ordinary demo players with their own practice money, named so
// nobody mistakes them for people. Used only to fill empty seats in demo
// mode (DEMO_OPPONENTS=off turns them off).
const NAMES = ["Rudo", "Wanjiru", "Chidi", "Amara", "Farai", "Kwame", "Thandi", "Tunde", "Nomsa", "Kofi", "Zola", "Ama"];
let seq = 0;

async function seatBot(store, stake) {
  seq += 1;
  const n = seq % 200;
  const phone = `+1999000${String(n).padStart(4, "0")}`;
  let bot = await store.findUserByPhone(phone);
  if (!bot) bot = await store.createUser({ name: `${NAMES[n % NAMES.length]} (bot)`, phone, balance: COMMON.DEMO_BALANCE });
  if (bot.balance < stake) bot = await store.update(bot.id, { balance: COMMON.DEMO_BALANCE });
  const debited = await store.debit(bot.id, stake);
  return debited ? { userId: bot.id, name: bot.name, bot: true } : null;
}

module.exports = { seatBot };
