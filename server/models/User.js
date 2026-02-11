const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      required: true,
      type: String,
    },
    email: {
      unique: true,
      required: true,
      type: String,
    },
    password: String,
    type: String,
    storiesCreated: [{ type: mongoose.Types.ObjectId, ref: "stories" }],
    storiesPlayed: [{ type: mongoose.Types.ObjectId, ref: "stories" }],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("users", userSchema);

module.exports = User;
