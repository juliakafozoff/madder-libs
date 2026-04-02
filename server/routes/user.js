require("dotenv").config();
const router = require("express").Router();
const User = require("../models/User");
const authenticate = require("../middlewares/authenticate");

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
