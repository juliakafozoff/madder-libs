require("dotenv").config();
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../services/firebase");
const StoryResult = require("../models/StoryResult");

router.post("/firebase", async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ error: "firebaseToken is required" });
    }

    const decoded = await verifyToken(firebaseToken);
    if (!decoded) {
      return res.status(503).json({ error: "Firebase is not configured on the server" });
    }

    const { uid, phone_number, email, name, firebase } = decoded;
    const signInProvider = firebase?.sign_in_provider;

    // Look up user by firebaseUid
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // For Google sign-in, check if there's an existing user with the same email
      if (email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          existingUser.firebaseUid = uid;
          if (phone_number && !existingUser.phoneNumber) {
            existingUser.phoneNumber = phone_number;
          }
          await existingUser.save();
          user = existingUser;
        }
      }
    }

    if (!user) {
      // Create new user
      let userType = "phone";
      if (signInProvider === "google.com") userType = "gmail";
      else if (signInProvider === "anonymous") userType = "anonymous";

      user = await User.create({
        name: name || decoded.name || "",
        email: email || undefined,
        phoneNumber: phone_number || undefined,
        firebaseUid: uid,
        type: userType,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);
    res.json({ token });
  } catch (error) {
    console.error("Firebase auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.post("/merge", async (req, res) => {
  try {
    const { anonymousUid, permanentUid } = req.body;
    if (!anonymousUid || !permanentUid) {
      return res.status(400).json({ error: "anonymousUid and permanentUid are required" });
    }

    const anonUser = await User.findOne({ firebaseUid: anonymousUid });
    const permUser = await User.findOne({ firebaseUid: permanentUid });

    if (!anonUser || !permUser) {
      return res.json({ success: true, message: "Nothing to merge" });
    }

    // Transfer storiesCreated
    if (anonUser.storiesCreated && anonUser.storiesCreated.length > 0) {
      permUser.storiesCreated = [
        ...new Set([
          ...permUser.storiesCreated.map((id) => id.toString()),
          ...anonUser.storiesCreated.map((id) => id.toString()),
        ]),
      ];
    }

    // Transfer storiesPlayed
    if (anonUser.storiesPlayed && anonUser.storiesPlayed.length > 0) {
      permUser.storiesPlayed = [
        ...new Set([
          ...permUser.storiesPlayed.map((id) => id.toString()),
          ...anonUser.storiesPlayed.map((id) => id.toString()),
        ]),
      ];
    }

    await permUser.save();

    // Transfer StoryResults
    await StoryResult.updateMany(
      { player: anonUser._id },
      { $set: { player: permUser._id } }
    );

    // Delete anonymous user
    await User.deleteOne({ _id: anonUser._id });

    res.json({ success: true });
  } catch (error) {
    console.error("Merge error:", error);
    res.status(500).json({ error: "Merge failed" });
  }
});

module.exports = router;
