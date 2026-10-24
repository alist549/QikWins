const mongoose = require("mongoose");

// A player. `balance` is practice money in cents while QikWins runs in demo
// mode; real money would live in a separate ledger.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    phone: { type: String, required: true, unique: true },
    balance: { type: Number, required: true, min: 0 },
    // Self-exclusion: no stakes are accepted until this time.
    excludedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.user || mongoose.model("user", userSchema);
