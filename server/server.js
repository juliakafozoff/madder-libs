require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const userRouter = require("./routes/user");
const storyRouter = require("./routes/story");

const app = express();

// Apply CORS middleware BEFORE routes
// Allowlist includes both apex and www domains to support users accessing either variant
const allowedOrigins = [
  "http://localhost:3000", // Local development
  "https://glad-libs.com", // Production apex domain
  "https://www.glad-libs.com", // Production www domain
  process.env.FRONTEND_URL, // Additional frontend URL from env (if set)
].filter(Boolean); // Remove undefined values

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // If no origin header (e.g., curl, health checks), allow the request
  // CORS headers are only needed for browser requests
  if (!origin) {
    return next();
  }
  
  // Check if origin is in allowlist
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
  } else {
    // Log blocked origins for debugging
    console.log(`CORS: Origin ${origin} not in allowed list:`, allowedOrigins);
    // Handle OPTIONS preflight even for blocked origins (respond but without CORS headers)
    // Browser will see no CORS headers and block the request
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    // For other methods, don't set CORS headers - browser will block the response
  }
  
  next();
});

app.use(express.json());

// Health check endpoint (before routes, no auth needed)
app.get("/health", (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStateText = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown';
  
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    mongoState: mongoState,
    mongoStateText: mongoStateText,
    mongoUriSet: !!process.env.MONGO_URI,
    time: new Date().toISOString(),
  });
});

app.use("/user", userRouter);
app.use("/story", storyRouter);

app.get("/", (req, res) => {
  res.send("ho");
});

const PORT = process.env.PORT || 5000;

// Start server first, then connect to database
// This ensures the server can respond even if DB connection fails initially
app.listen(PORT, async () => {
  console.log(`Server is up and running on port ${PORT}`);
  console.log(`MONGO_URI is set: ${!!process.env.MONGO_URI}`);
  
  // Connect to database after server starts
  try {
    await connectDB();
    console.log("MongoDB connection successful");
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    console.error("Server will continue running but database operations will fail");
    // Don't exit - server can still run and return errors
    // Set up retry logic
    setTimeout(async () => {
      console.log("Retrying MongoDB connection...");
      try {
        await connectDB();
        console.log("MongoDB reconnection successful");
      } catch (retryError) {
        console.error("MongoDB reconnection failed:", retryError.message);
      }
    }, 30000); // Retry after 30 seconds
  }
});