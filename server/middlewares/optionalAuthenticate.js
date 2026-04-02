const jwt = require("jsonwebtoken");
const { verifyToken } = require("../services/firebase");
const User = require("../models/User");
require("dotenv").config();

async function optionalAuthenticate(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    req.userId = null;
    return next();
  }

  // Try local JWT first
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.userId = decoded.id;
    return next();
  } catch (_jwtErr) {
    // Not a valid local JWT — try Firebase
  }

  try {
    const decoded = await verifyToken(token);
    if (decoded) {
      const user = await User.findOne({ firebaseUid: decoded.uid });
      if (user) {
        req.userId = user._id;
        return next();
      }
    }
  } catch (_firebaseErr) {
    // Firebase verification also failed
  }

  req.userId = null;
  next();
}

module.exports = optionalAuthenticate;
