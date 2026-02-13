require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const userRouter = require("./routes/user");
const storyRouter = require("./routes/story");
const cors = require("cors");

connectDB();
const app = express();

// Apply CORS middleware BEFORE routes
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Your Netlify URL
].filter(Boolean); // Remove undefined values

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
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

app.listen(PORT, () => {
  console.log(`Server is up and running on port ${PORT}`);
});