const jwt = require("jsonwebtoken");
require("dotenv").config();

// Optional authentication - doesn't fail if no token, but sets req.userId if valid token exists
function optionalAuthenticate(req, res, next) {
  const token = req.headers["authorization"];
  
  if (!token) {
    // No token provided - continue without authentication
    req.userId = null;
    return next();
  }
  
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      // Invalid token - continue without authentication
      req.userId = null;
      return next();
    }
    // Valid token - set userId
    req.userId = decoded.id;
    next();
  });
}

module.exports = optionalAuthenticate;

