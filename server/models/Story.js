const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    storyId: {
      required: true,
      type: String,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // Allow null values but ensure uniqueness when present
    },
    title: {
      type: String,
    },
    story: {
      type: [],
    },
    user: { type: mongoose.Types.ObjectId, ref: "users", required: false },
  },
  {
    timestamps: true,
  }
);

const Story = mongoose.model("stories", storySchema);

module.exports = Story;
