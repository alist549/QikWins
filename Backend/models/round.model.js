const mongoose = require("mongoose");

// The public settlement log: one record per finished round, with the pool,
// the fee, every payout and (for random games) the revealed seed.
const roundSchema = new mongoose.Schema(
  {
    _id: { type: String },
    game: { type: String, required: true, index: true },
    settledAt: { type: Date, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { versionKey: false }
);

module.exports = mongoose.models.round || mongoose.model("round", roundSchema);
