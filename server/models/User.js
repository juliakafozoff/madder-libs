const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: String,
    type: String,
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneNumber: {
      type: String,
      sparse: true,
    },
    storiesCreated: [{ type: mongoose.Types.ObjectId, ref: "stories" }],
    storiesPlayed: [{ type: mongoose.Types.ObjectId, ref: "stories" }],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("users", userSchema);

module.exports = User;
