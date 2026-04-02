const LibraryText = require("../models/LibraryText");
const seedTexts = require("./seedTexts");

async function seedLibraryTexts() {
  try {
    const count = await LibraryText.countDocuments();
    const needsFullReseed = count === 0;

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

    if (upserted > 0 || needsFullReseed) {
      console.log(`Library seed: ${upserted} inserted, ${updated} updated`);
    }
  } catch (error) {
    console.error("Library seed failed:", error.message);
  }
}

module.exports = seedLibraryTexts;
