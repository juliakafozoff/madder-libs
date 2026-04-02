const mongoose = require("mongoose");

const libraryTextSchema = new mongoose.Schema(
  {
    textId: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
    },
    year: {
      type: String,
    },
    category: {
      type: String,
      enum: ["speech", "literature", "fairytale", "poetry", "historical", "template"],
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },
    ageGroup: {
      type: String,
      enum: ["kids", "teens", "all"],
    },
    contextBlurb: {
      type: String,
    },
    fullText: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    playCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

libraryTextSchema.index({ category: 1 });
libraryTextSchema.index({ featured: -1, playCount: -1 });
libraryTextSchema.index({ title: "text", tags: "text" });

const LibraryText = mongoose.model("librarytexts", libraryTextSchema);

module.exports = LibraryText;
