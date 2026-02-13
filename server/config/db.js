const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  // Check if MONGO_URI is set
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI environment variable is not set!");
    throw new Error("MONGO_URI environment variable is not set");
  }

  try {
    // Set connection options with timeouts
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 second timeout for server selection
      socketTimeoutMS: 45000, // 45 second timeout for socket operations
      connectTimeoutMS: 10000, // 10 second timeout for initial connection
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    console.error(`MONGO_URI is set: ${!!process.env.MONGO_URI}`);
    throw err; // Throw instead of exiting, so server can handle it
  }
};

module.exports = connectDB;

/* eslint linebreak-style: ["error", "windows"] */
