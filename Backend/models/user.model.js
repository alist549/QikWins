const mongoose = require("mongoose");

// A player. `name` is what other players see (first name and surname
// initial). `balance` is in cents: play credits until real money is switched
// on, when money would move through a separate ledger.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    firstName: { type: String, trim: true, maxlength: 40 },
    surname: { type: String, trim: true, maxlength: 40 },
    dob: { type: Date },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    phoneVerifiedAt: { type: Date, default: null },
    balance: { type: Number, required: true, min: 0 },
    // Self-exclusion: no stakes are accepted until this time.
    excludedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.user || mongoose.model("user", userSchema);
