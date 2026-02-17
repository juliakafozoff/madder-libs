const mongoose = require("mongoose");

const storyResultSchema = new mongoose.Schema(
  {
    resultId: {
      type: String,
      required: true,
      unique: true,
    },
    templateId: {
      type: String,
      required: true,
      index: true, // Index for faster lookups
    },
    title: {
      type: String,
      required: true,
    },
    resultText: {
      type: String,
      required: true,
    },
    story: {
      type: mongoose.Types.ObjectId,
      ref: "stories",
      required: false, // Can be null if story was deleted
    },
    player: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: false, // Can be null for anonymous players
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster queries by templateId
storyResultSchema.index({ templateId: 1, createdAt: -1 });

const StoryResult = mongoose.model("storyresults", storyResultSchema);

module.exports = StoryResult;

