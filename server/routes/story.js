const router = require("express").Router();
const authenticate = require("../middlewares/authenticate");
const optionalAuthenticate = require("../middlewares/optionalAuthenticate");
const Story = require("../models/Story");
const User = require("../models/User");

// Generate a random invite code (5-7 characters, uppercase letters + numbers)
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 6; // Use 6 characters
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

router.post("/create", optionalAuthenticate, async (req, res) => {
  // Generate unique inviteCode FIRST - we'll use it no matter what
  let inviteCode;
  let attempts = 0;
  do {
    inviteCode = generateInviteCode();
    attempts++;
    if (attempts > 50) {
      return res.status(500).json({ msg: 'Failed to generate unique invite code' });
    }
    // Check if code already exists
    const existing = await Story.findOne({ inviteCode });
    if (!existing) break;
  } while (true);

  console.log("POST /story/create - Creating story with inviteCode:", inviteCode, "storyId:", req.body.id, "userId:", req.userId || "anonymous");
  
  try {
    const userId = req.userId || null; // Can be null for anonymous stories
    
    let story;
    try {
      story = await Story.create({
        storyId: req.body.id,
        inviteCode: inviteCode,
        user: userId,
      });
      console.log("Story.create() succeeded, story.inviteCode:", story.inviteCode);
    } catch (createError) {
      console.error("Story.create() error:", {
        message: createError.message,
        code: createError.code,
        name: createError.name,
        keyPattern: createError.keyPattern,
        keyValue: createError.keyValue
      });
      
      // If it's a duplicate key error, try one more time with a new code
      if (createError.code === 11000) {
        console.log("Duplicate key error, generating new inviteCode");
        inviteCode = generateInviteCode();
        story = await Story.create({
          storyId: req.body.id,
          inviteCode: inviteCode,
          user: userId,
        });
      } else {
        // For other errors, still create the story without inviteCode, we'll add it manually
        console.log("Creating story without inviteCode due to error, will add manually");
        story = await Story.create({
          storyId: req.body.id,
          user: userId,
        });
      }
    }
    
    // ALWAYS ensure inviteCode is saved, even if create failed
    if (!story.inviteCode) {
      console.log("Story created without inviteCode, updating now...");
      try {
        story = await Story.findByIdAndUpdate(
          story._id,
          { inviteCode: inviteCode },
          { new: true }
        );
        console.log("Updated story with inviteCode:", story?.inviteCode);
      } catch (updateError) {
        console.error("Failed to update inviteCode:", updateError.message);
        // Continue - we'll add it to response anyway
      }
    }
    
    // Only update user if authenticated
    if (userId) {
      await User.findByIdAndUpdate(
        { _id: userId },
        { $push: { storiesCreated: story._id } }
      );
    }
    
    // Convert to plain object
    let responseStory = story.toObject ? story.toObject() : (story.toJSON ? story.toJSON() : JSON.parse(JSON.stringify(story)));
    
    // CRITICAL: ALWAYS add inviteCode to response, even if database save failed
    // This ensures the frontend always gets the inviteCode
    if (!responseStory.inviteCode) {
      console.log("Adding inviteCode to response manually:", inviteCode);
      responseStory.inviteCode = inviteCode;
    }
    
    console.log("Returning story with inviteCode:", responseStory.inviteCode);
    
    return res.json({ story: responseStory });
  } catch (error) {
    console.error("FATAL Error creating story:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    return res.status(500).json({ msg: error.message });
  }
});

router.put("/update/:storyId", optionalAuthenticate, async (req, res) => {
  try {
    const story = await Story.findOneAndUpdate(
      {
        storyId: req.params.storyId,
      },
      req.body,
      { new: true }
    );
    
    if (!story) {
      return res.status(404).json({ msg: "Story not found" });
    }
    
    return res.json({ story });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

router.get("/get/:id", optionalAuthenticate, async (req, res) => {
  try {
    const id = req.params.id;
    // Check if it's an inviteCode (6 chars, uppercase+numbers) or storyId (UUID format)
    const isInviteCode = /^[A-Z0-9]{6}$/.test(id);
    
    let story;
    if (isInviteCode) {
      // Look up by inviteCode
      story = await Story.findOne({ inviteCode: id });
    } else {
      // Look up by storyId (UUID)
      story = await Story.findOne({ storyId: id });
    }
    
    if (!story) {
      return res.status(404).json({ msg: "Story not found" });
    }
    
    res.json({ story });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

router.put("/play/:id", optionalAuthenticate, async (req, res) => {
  try {
    const id = req.params.id;
    // Check if it's an inviteCode or storyId
    const isInviteCode = /^[A-Z0-9]{6}$/.test(id);
    
    let story;
    if (isInviteCode) {
      story = await Story.findOne({ inviteCode: id });
    } else {
      story = await Story.findOne({ storyId: id });
    }
    
    if (!story) {
      return res.status(404).json({ msg: "Story not found" });
    }
    
    // Only track if user is authenticated
    if (req.userId) {
      await User.findByIdAndUpdate(
        { _id: req.userId },
        { $push: { storiesPlayed: story._id } }
      );
    }
    
    res.json({ story });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

router.delete("/delete/:id", authenticate, async (req, res) => {
  try {
    console.log("Delete request received:", { id: req.params.id, userId: req.userId });
    
    // Try to find by _id first, then by storyId if that fails
    let story = await Story.findById(req.params.id);
    
    if (!story) {
      // If not found by _id, try finding by storyId
      story = await Story.findOne({ storyId: req.params.id });
    }
    
    if (!story) {
      console.log("Story not found:", req.params.id);
      return res.status(404).json({ msg: "Story not found" });
    }
    
    console.log("Found story:", { storyId: story.storyId, userId: story.user, reqUserId: req.userId });
    
    // Check if the story belongs to the user
    if (story.user.toString() !== req.userId.toString()) {
      console.log("Unauthorized delete attempt");
      return res.status(403).json({ msg: "Not authorized to delete this story" });
    }
    
    // Remove story from user's storiesCreated array
    await User.findByIdAndUpdate(
      { _id: req.userId },
      { $pull: { storiesCreated: story._id } }
    );
    
    // Also remove from storiesPlayed if present
    await User.findByIdAndUpdate(
      { _id: req.userId },
      { $pull: { storiesPlayed: story._id } }
    );
    
    // Delete the story
    await Story.findByIdAndDelete(story._id);
    
    console.log("Story deleted successfully");
    res.json({ success: true, msg: "Story deleted successfully" });
  } catch (error) {
    console.error("Delete story error:", error);
    res.status(500).json({ msg: error.message });
  }
});

module.exports = router;
