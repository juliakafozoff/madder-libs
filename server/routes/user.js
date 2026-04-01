require("dotenv").config();
const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const authenticate = require("../middlewares/authenticate");
const { getSafeJwtFields } = require("../utils/jwt");

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

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Only create OAuth2Client if GOOGLE_CLIENT_ID is configured
const backendClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
const client = backendClientId
  ? new OAuth2Client(backendClientId)
  : null;

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
        const isMatch = await bcrypt.compare(req.body.password, user.password);
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

router.post("/v1/auth/google/:type", googleAuthLimiter, async (req, res) => {
  try {
    // Check if Google OAuth is configured
    if (!client || !backendClientId) {
      return res.status(500).json({ error: "Google OAuth is not configured" });
    }

    // Check if token is provided
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "ID Token is required" });
    }

    // Verify the ID token (this also validates audience)
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: backendClientId,
    });

    // Extract user info from token
    const { name, email } = ticket.getPayload();

    // Handle signup flow
    if (req.params.type === "signup") {
      // Check if user already exists
      let dbUser = await User.findOne({ email });
      
      if (dbUser) {
        // User exists, return JWT for existing user (don't throw error)
        const jwtToken = jwt.sign({ id: dbUser._id }, process.env.SECRET_KEY);
        return res.status(200).json({ token: jwtToken });
      }

      // User doesn't exist, create new user
      try {
        dbUser = await User.create({
          email,
          name,
          type: "gmail",
        });
        
        if (!dbUser || !dbUser._id) {
          return res.status(500).json({ error: "Failed to create user" });
        }

        const jwtToken = jwt.sign({ id: dbUser._id }, process.env.SECRET_KEY);
        return res.status(200).json({ token: jwtToken });
      } catch (createError) {
        // Handle duplicate key error (race condition)
        if (createError.code === 11000) {
          dbUser = await User.findOne({ email });
          if (dbUser && dbUser._id) {
            const jwtToken = jwt.sign({ id: dbUser._id }, process.env.SECRET_KEY);
            return res.status(200).json({ token: jwtToken });
          }
        }
        console.error("Google signup error:", createError.message);
        return res.status(500).json({ error: "Failed to create user account" });
      }
    }

    // Handle login flow — auto-create account if user doesn't exist
    if (req.params.type === "login") {
      let dbUser = await User.findOne({ email });

      if (!dbUser) {
        try {
          dbUser = await User.create({ email, name, type: "gmail" });
        } catch (createError) {
          if (createError.code === 11000) {
            dbUser = await User.findOne({ email });
          }
          if (!dbUser) {
            return res.status(500).json({ error: "Failed to create user account" });
          }
        }
      }

      const jwtToken = jwt.sign({ id: dbUser._id }, process.env.SECRET_KEY);
      return res.status(200).json({ token: jwtToken });
    }

    // Invalid type parameter
    return res.status(400).json({ error: "Invalid type parameter. Use 'signup' or 'login'" });
  } catch (error) {
    console.error("Google OAuth error:", error.message);

    if (error.message && (error.message.includes("Wrong recipient") || error.message.includes("audience"))) {
      return res.status(400).json({ error: "Google login failed. Please try again." });
    }
    if (error.message && (error.message.includes("Token used too early") || error.message.includes("Token used too late"))) {
      return res.status(400).json({ error: "Login expired. Please try again." });
    }
    if (error.message && error.message.includes("Invalid token signature")) {
      return res.status(400).json({ error: "Google login failed. Please try again." });
    }

    return res.status(500).json({ error: "Something went wrong. Please try again." });
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
      ["title", "storyId", "_id"]
    );
    res.status(200).json({ success: true, user: user });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

module.exports = router;
