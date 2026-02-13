require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const userRouter = require("./routes/user");
const storyRouter = require("./routes/story");
const cors = require("cors");

const app = express();

// Apply CORS middleware BEFORE routes
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Your Netlify URL
].filter(Boolean); // Remove undefined values

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log for debugging
  if (origin && !allowedOrigins.includes(origin)) {
    console.log(`CORS: Origin ${origin} not in allowed list:`, allowedOrigins);
  }
  
  // Allow requests from allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

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
  // Connect to database after server starts
  try {
    await connectDB();
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    // Don't exit - server can still run and return errors
  }
});