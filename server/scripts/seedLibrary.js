require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const LibraryText = require("../models/LibraryText");
const seedTexts = require("../data/seedTexts");

const seedLibrary = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    let upserted = 0;
    let updated = 0;

    for (const text of seedTexts) {
      const result = await LibraryText.findOneAndUpdate(
        { textId: text.textId },
        { $set: text },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        upserted++;
      } else {
        updated++;
      }
    }

    console.log(`Seed complete: ${upserted} inserted, ${updated} updated`);
    console.log(`Total library texts: ${await LibraryText.countDocuments()}`);
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seedLibrary();
