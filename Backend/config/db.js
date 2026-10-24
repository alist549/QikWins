const mongoose = require("mongoose");

// MONGODB_URL wins (Docker, CI), then the production or development URL.
function mongoUrl() {
  if (process.env.MONGODB_URL) return process.env.MONGODB_URL;
  if (process.env.ENVIRONMENT === "production") return process.env.MONGODB_PROD_URL;
  return process.env.MONGODB_DEV_URL || "mongodb://127.0.0.1:27017/qikwins";
}

async function connect() {
  await mongoose.connect(mongoUrl());
  return mongoose.connection;
}

module.exports = { connect, mongoUrl };
