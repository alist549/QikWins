const jwt = require("jsonwebtoken");

const secret = () => process.env.JWT_SECRET || "dev-only-secret";

const signToken = (userId) => jwt.sign({ id: userId }, secret(), { expiresIn: "30d" });

function verifyToken(token) {
  try {
    return jwt.verify(token, secret()).id;
  } catch {
    return null;
  }
}

// Reads the JWT from a `token` header (as QikDrive does) or a Bearer header.
function tokenFrom(req) {
  if (req.headers.token) return req.headers.token;
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

const requireUser = (store) => async (req, res, next) => {
  const id = verifyToken(tokenFrom(req));
  const user = id && (await store.getUser(id));
  if (!user) return res.status(401).json({ message: "Please sign in again." });
  req.user = user;
  next();
};

// Signed in or not: sets req.userId when a valid token is sent.
const optionalUser = () => (req, res, next) => {
  req.userId = verifyToken(tokenFrom(req));
  next();
};

module.exports = { signToken, verifyToken, requireUser, optionalUser };
