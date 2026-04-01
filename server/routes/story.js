const router = require("express").Router();
const mongoose = require("mongoose");
const authenticate = require("../middlewares/authenticate");
const optionalAuthenticate = require("../middlewares/optionalAuthenticate");
const Story = require("../models/Story");
const User = require("../models/User");
const StoryResult = require("../models/StoryResult");

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
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    console.error("MongoDB not connected. ReadyState:", mongoose.connection.readyState);
    return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
  }

  // Generate unique inviteCode FIRST - we'll use it no matter what
  let inviteCode;
  let attempts = 0;
  do {
    inviteCode = generateInviteCode();
    attempts++;
    if (attempts > 50) {
      return res.status(500).json({ error: 'Failed to generate unique invite code' });
    }
    // Check if code already exists
    const existing = await Story.findOne({ inviteCode });
    if (!existing) break;
  } while (true);

  try {
    const userId = req.userId || null; // Can be null for anonymous stories
    
    let story;
    try {
      story = await Story.create({
        storyId: req.body.id,
        inviteCode: inviteCode,
        user: userId,
      });
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
        inviteCode = generateInviteCode();
        story = await Story.create({
          storyId: req.body.id,
          inviteCode: inviteCode,
          user: userId,
        });
      } else {
        // For other errors, still create the story without inviteCode, we'll add it manually
        story = await Story.create({
          storyId: req.body.id,
          user: userId,
        });
      }
    }
    
    // ALWAYS ensure inviteCode is saved, even if create failed
    if (!story.inviteCode) {
      try {
        story = await Story.findByIdAndUpdate(
          story._id,
          { inviteCode: inviteCode },
          { new: true }
        );
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
      responseStory.inviteCode = inviteCode;
    }
    
    return res.json({ story: responseStory });
  } catch (error) {
    console.error("FATAL Error creating story:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    return res.status(500).json({ error: error.message });
  }
});

router.put("/update/:storyId", optionalAuthenticate, async (req, res) => {
  try {
    const { title, story: storyArray } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      if (title.length > 200) {
        return res.status(400).json({ error: "Title must be under 200 characters" });
      }
    }
    if (storyArray !== undefined) {
      if (!Array.isArray(storyArray) || storyArray.length === 0) {
        return res.status(400).json({ error: "Story must be a non-empty array" });
      }
    }

    const story = await Story.findOneAndUpdate(
      {
        storyId: req.params.storyId,
      },
      req.body,
      { new: true }
    );
    
    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }
    
    return res.json({ story });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res.status(404).json({ error: "Story not found" });
    }
    
    res.json({ story });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res.status(404).json({ error: "Story not found" });
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
    res.status(500).json({ error: error.message });
  }
});

router.delete("/delete/:id", authenticate, async (req, res) => {
  try {
    // Try to find by _id first, then by storyId if that fails
    let story = await Story.findById(req.params.id);
    
    if (!story) {
      // If not found by _id, try finding by storyId
      story = await Story.findOne({ storyId: req.params.id });
    }
    
    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }
    
    // Check if the story belongs to the user
    if (story.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this story" });
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
    
    res.json({ success: true });
  } catch (error) {
    console.error("Delete story error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Save a completed story result
router.post("/result", optionalAuthenticate, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB not connected. ReadyState:", mongoose.connection.readyState);
      return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
    }

    const { resultId, templateId, title, resultText } = req.body;

    if (!resultId || !templateId || !title || !resultText) {
      return res.status(400).json({ error: 'Missing required fields: resultId, templateId, title, resultText' });
    }

    // Check for duplicate resultId
    const existingResult = await StoryResult.findOne({ resultId });
    if (existingResult) {
      return res.status(409).json({ error: 'A result with this ID already exists' });
    }

    // Find the story template to link it
    const storyTemplate = await Story.findOne({ storyId: templateId });
    const storyRef = storyTemplate ? storyTemplate._id : null;

    // Create the result
    const result = await StoryResult.create({
      resultId,
      templateId,
      title,
      resultText,
      story: storyRef,
      player: req.userId || null, // Can be null for anonymous players
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error saving story result:", error);
    // If it's a duplicate key error, that's okay - just return success
    if (error.code === 11000) {
      const existingResult = await StoryResult.findOne({ resultId: req.body.resultId });
      return res.json({ success: true, result: existingResult });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get a single result by resultId (public, no auth required)
router.get("/result/:resultId", async (req, res) => {
  try {
    const { resultId } = req.params;
    const result = await StoryResult.findOne({ resultId })
      .populate('player', 'name')
      .populate('story', 'title storyId');

    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error fetching result:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all results for a specific story template
router.get("/results/:templateId", optionalAuthenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const results = await StoryResult.find({ templateId })
      .sort({ createdAt: -1 }) // Newest first
      .populate('player', 'name email')
      .populate('story', 'title storyId')
      .limit(1000); // Limit to prevent huge responses
    
    res.json({ success: true, results });
  } catch (error) {
    console.error("Error fetching story results:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all results for stories created by the authenticated user
router.get("/my-results", authenticate, async (req, res) => {
  try {
    // Get all stories created by this user
    const userStories = await Story.find({ user: req.userId }).select('storyId');
    const templateIds = userStories.map(s => s.storyId);
    
    if (templateIds.length === 0) {
      return res.json({ success: true, results: [] });
    }
    
    // Get all results for these templates
    const results = await StoryResult.find({ templateId: { $in: templateIds } })
      .sort({ createdAt: -1 }) // Newest first
      .populate('player', 'name email')
      .populate('story', 'title storyId')
      .limit(1000);
    
    res.json({ success: true, results });
  } catch (error) {
    console.error("Error fetching user's story results:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a story result
router.delete("/result/:resultId", authenticate, async (req, res) => {
  try {
    const { resultId } = req.params;

    const result = await StoryResult.findOne({ resultId });
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    // Allow deletion if user is the player OR owns the parent story template
    const isPlayer = result.player && result.player.toString() === req.userId.toString();

    let isTemplateOwner = false;
    if (result.story) {
      const parentStory = await Story.findById(result.story);
      if (parentStory && parentStory.user && parentStory.user.toString() === req.userId.toString()) {
        isTemplateOwner = true;
      }
    }

    if (!isPlayer && !isTemplateOwner) {
      return res.status(403).json({ error: "Not authorized to delete this result" });
    }

    await StoryResult.findByIdAndDelete(result._id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete result error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
