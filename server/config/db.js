const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    throw err; // Throw instead of exiting, so server can handle it
  }
};

module.exports = connectDB;

/* eslint linebreak-style: ["error", "windows"] */
