require("dotenv").config();
const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authenticate = require("../middlewares/authenticate");

const rateLimit = require("express-rate-limit");

const BCRYPT_SALT_ROUNDS = 10;

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many signup attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", signupLimiter, async (req, res) => {
  try {
    const { name, email, password, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (type === "email") {
      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
    }

    const hashedPassword = type === "email" && password
      ? await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
      : undefined;
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      type,
    });
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);
    res.json({ token });
  } catch (error) {
    res.status(409).json({ error: "Email already exists" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      if (user.type === "email") {
        const storedPassword = user.password;
        const isBcryptHash = storedPassword && storedPassword.startsWith("$2");

        let isMatch = false;
        if (isBcryptHash) {
          isMatch = await bcrypt.compare(req.body.password, storedPassword);
        } else if (storedPassword === req.body.password) {
          isMatch = true;
          const hashed = await bcrypt.hash(req.body.password, BCRYPT_SALT_ROUNDS);
          await User.updateOne({ _id: user._id }, { password: hashed });
        }

        if (isMatch) {
          const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);
          return res.json({ token });
        } else {
          return res.status(401).json({ error: "Wrong password" });
        }
      } else {
        return res.status(400).json({
          error: "This email is associated with a gmail account.",
        });
      }
    } else {
      return res.status(401).json({
        error: "No account found.",
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.get("/get/user/data", authenticate, async (req, res) => {
  try {
    const user = await User.findById({ _id: req.userId }).select(
      "-createdAt -updatedAt -password -__v"
    );
    res.status(200).json({ success: true, user: user });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

router.get("/stories", authenticate, async (req, res) => {
  try {
    const user = await User.findById({ _id: req.userId }).populate(
      "storiesCreated storiesPlayed",
      ["title", "storyId", "_id", "inviteCode", "premadeTextId"]
    );
    res.status(200).json({ success: true, user: user });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

module.exports = router;
