const crypto = require("crypto");

// Where players and finished rounds are kept. MongoDB in normal use, like
// QikDrive; STORE=memory keeps everything in this process (tests, or a quick
// trial without a database). Both expose the same functions, and every
// balance change is a single atomic step so a stake can never overdraw.

const toUser = (doc) =>
  doc && {
    id: String(doc._id ?? doc.id),
    name: doc.name,
    firstName: doc.firstName || null,
    surname: doc.surname || null,
    dob: doc.dob || null,
    email: doc.email || null,
    phone: doc.phone,
    phoneVerifiedAt: doc.phoneVerifiedAt || null,
    balance: doc.balance,
    excludedUntil: doc.excludedUntil || null,
  };

const isExcluded = (user, now = new Date()) => Boolean(user.excludedUntil && new Date(user.excludedUntil) > now);

function memoryStore() {
  const users = new Map();
  const rounds = [];
  const copy = (u) => u && toUser({ ...u });

  return {
    kind: "memory",
    async createUser(fields) {
      const user = { id: crypto.randomBytes(12).toString("hex"), ...fields, excludedUntil: null };
      users.set(user.id, user);
      return copy(user);
    },
    async findUserByPhone(phone) {
      return copy([...users.values()].find((u) => u.phone === phone));
    },
    async findUserByEmail(email) {
      return copy([...users.values()].find((u) => u.email === email));
    },
    async getUser(id) {
      return copy(users.get(String(id)));
    },
    async debit(id, cents) {
      const user = users.get(String(id));
      if (!user || user.balance < cents || isExcluded(user)) return null;
      user.balance -= cents;
      return copy(user);
    },
    async credit(id, cents) {
      const user = users.get(String(id));
      if (!user) return null;
      user.balance += cents;
      return copy(user);
    },
    async update(id, fields) {
      const user = users.get(String(id));
      if (!user) return null;
      Object.assign(user, fields);
      return copy(user);
    },
    async saveRound(round) {
      rounds.unshift(round);
      if (rounds.length > 500) rounds.pop();
    },
    async listRounds(game, limit) {
      return rounds.filter((r) => r.game === game).slice(0, limit);
    },
    async getRound(id) {
      return rounds.find((r) => r.id === id) || null;
    },
  };
}

function mongoStore() {
  const userModel = require("../models/user.model");
  const roundModel = require("../models/round.model");
  const toRound = (doc) => doc && { ...doc.data, id: doc._id, game: doc.game, settledAt: doc.settledAt };

  return {
    kind: "mongo",
    async createUser(fields) {
      return toUser(await userModel.create(fields));
    },
    async findUserByPhone(phone) {
      return toUser(await userModel.findOne({ phone }).lean());
    },
    async findUserByEmail(email) {
      return toUser(await userModel.findOne({ email }).lean());
    },
    async getUser(id) {
      if (!/^[a-f0-9]{24}$/.test(String(id))) return null;
      return toUser(await userModel.findById(id).lean());
    },
    async debit(id, cents) {
      const doc = await userModel
        .findOneAndUpdate(
          {
            _id: id,
            balance: { $gte: cents },
            $or: [{ excludedUntil: null }, { excludedUntil: { $lte: new Date() } }],
          },
          { $inc: { balance: -cents } },
          { new: true }
        )
        .lean();
      return toUser(doc);
    },
    async credit(id, cents) {
      return toUser(await userModel.findByIdAndUpdate(id, { $inc: { balance: cents } }, { new: true }).lean());
    },
    async update(id, fields) {
      return toUser(await userModel.findByIdAndUpdate(id, fields, { new: true }).lean());
    },
    async saveRound(round) {
      const { id, game, settledAt, ...data } = round;
      await roundModel.create({ _id: id, game, settledAt, data });
    },
    async listRounds(game, limit) {
      const docs = await roundModel.find({ game }).sort({ settledAt: -1 }).limit(limit).lean();
      return docs.map(toRound);
    },
    async getRound(id) {
      return toRound(await roundModel.findById(id).lean());
    },
  };
}

module.exports = { memoryStore, mongoStore, isExcluded };
