const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticate(req, res, next) {
  const token = req.headers["authorization"];
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.json({ msg: "Access denied" });
    }
    req.userId = decoded.id;
    next();
  });
}

module.exports = authenticate;
