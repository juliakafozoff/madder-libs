require("dotenv").config();
const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const authenticate = require("../middlewares/authenticate");

// Only create OAuth2Client if GOOGLE_CLIENT_ID is configured
const client = process.env.GOOGLE_CLIENT_ID 
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

router.post("/signup", async (req, res) => {
  console.log("POST /user/signup - Request received");
  console.log("Request body:", { name: req.body.name, email: req.body.email, type: req.body.type });
  try {
    const user = await User.create(req.body);
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);
    console.log("Signup successful for user:", user.email);
    res.json({ token });
  } catch (error) {
    console.log("Signup error:", error.message);
    res.json({ msg: "Email already exists" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      if (user.type === "email") {
        if (user.password === req.body.password) {
          const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);
          return res.json({ token });
        } else {
          return res.status(400).json({ msg: "Wrong password" });
        }
      } else {
        return res.status(400).json({
          msg: "This email is associated with a gmail account.",
        });
      }
    } else {
      return res.status(400).json({
        msg: "No account found.",
      });
    }
  } catch (error) {
    res.json({ msg: "Email already exists" });
  }
});

router.post("/v1/auth/google/:type", async (req, res) => {
  try {
    // Check if Google OAuth is configured
    if (!client || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ msg: "Google OAuth is not configured" });
    }

    // Check if token is provided
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ msg: "ID Token is required" });
    }

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Extract user info from token
    const { name, email } = ticket.getPayload();
    
    // Debug logging (type and email, not token)
    console.log(`Google OAuth ${req.params.type} attempt for email: ${email}`);

    // Handle signup flow
    if (req.params.type === "signup") {
      // Check if user already exists
      let dbUser = await User.findOne({ email });
      
      if (dbUser) {
        // User exists, return JWT for existing user (don't throw error)
        console.log(`Google signup: User already exists, returning existing user JWT for: ${email}`);
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
          return res.status(500).json({ msg: "Failed to create user" });
        }

        console.log(`Google signup successful for new user: ${email}`);
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
        return res.status(500).json({ msg: "Failed to create user account" });
      }
    }

    // Handle login flow
    if (req.params.type === "login") {
      const dbUser = await User.findOne({ email });
      
      if (!dbUser || !dbUser._id) {
        console.log(`Google login failed: No account found for email: ${email}`);
        return res.status(400).json({ msg: "No account found. Please sign up first." });
      }

      console.log(`Google login successful for: ${email}`);
      const jwtToken = jwt.sign({ id: dbUser._id }, process.env.SECRET_KEY);
      return res.status(200).json({ token: jwtToken });
    }

    // Invalid type parameter
    return res.status(400).json({ msg: "Invalid type parameter. Use 'signup' or 'login'" });
  } catch (error) {
    // Handle token verification errors
    if (error.message && error.message.includes("Token used too early") || 
        error.message && error.message.includes("Token used too late")) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }
    if (error.message && error.message.includes("Invalid token signature")) {
      return res.status(400).json({ msg: "Invalid token signature" });
    }
    
    console.error("Google OAuth error:", error.message);
    return res.status(500).json({ msg: error.message || "Internal server error" });
  }
});

router.get("/get/user/data", authenticate, async (req, res) => {
  try {
    const user = await User.findById({ _id: req.userId }).select(
      "-createdAt -updatedAt -password -__v"
    );
    res.status(200).send({ success: true, user: user });
  } catch (err) {
    console.log(err);
    res.status(401).send({ success: false, message: err.message });
  }
});

router.get("/stories", authenticate, async (req, res) => {
  try {
    const user = await User.findById({ _id: req.userId }).populate(
      "storiesCreated storiesPlayed",
      ["title", "storyId", "_id"]
    );
    res.status(200).send({ success: true, user: user });
  } catch (error) {
    console.log(error);
    res.status(401).send({ success: false, message: error.message });
  }
});

module.exports = router;
