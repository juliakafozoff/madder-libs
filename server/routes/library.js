const router = require("express").Router();
const mongoose = require("mongoose");
const LibraryText = require("../models/LibraryText");

// GET /library/texts — paginated list, excludes fullText
router.get("/texts", async (req, res) => {
  try {
    const {
      category,
      ageGroup,
      difficulty,
      search,
      sort = "popular",
      page = 1,
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (ageGroup) filter.ageGroup = ageGroup;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { title: regex },
        { author: regex },
        { tags: regex },
        { contextBlurb: regex },
      ];
    }

    let sortObj = {};
    if (sort === "popular") {
      sortObj = { featured: -1, playCount: -1 };
    } else if (sort === "newest") {
      sortObj = { createdAt: -1 };
    } else if (sort === "alpha") {
      sortObj = { title: 1 };
    } else {
      sortObj = { featured: -1, playCount: -1 };
    }

    const limit = 20;
    const skip = (parseInt(page) - 1) * limit;

    const [texts, total] = await Promise.all([
      LibraryText.find(filter)
        .select("-fullText")
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      LibraryText.countDocuments(filter),
    ]);

    res.json({
      success: true,
      texts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching library texts:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /library/random — one random text with fullText
router.get("/random", async (req, res) => {
  try {
    const result = await LibraryText.aggregate([{ $sample: { size: 1 } }]);
    if (!result || result.length === 0) {
      return res.status(404).json({ error: "No texts found" });
    }
    res.json({ success: true, text: result[0] });
  } catch (error) {
    console.error("Error fetching random text:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /library/texts/:textId — single text with fullText
router.get("/texts/:textId", async (req, res) => {
  try {
    const text = await LibraryText.findOne({ textId: req.params.textId });
    if (!text) {
      return res.status(404).json({ error: "Text not found" });
    }
    res.json({ success: true, text });
  } catch (error) {
    console.error("Error fetching library text:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /library/texts/:textId/play — increment playCount
router.put("/texts/:textId/play", async (req, res) => {
  try {
    const text = await LibraryText.findOneAndUpdate(
      { textId: req.params.textId },
      { $inc: { playCount: 1 } },
      { new: true }
    );
    if (!text) {
      return res.status(404).json({ error: "Text not found" });
    }
    res.json({ success: true, playCount: text.playCount });
  } catch (error) {
    console.error("Error incrementing play count:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
