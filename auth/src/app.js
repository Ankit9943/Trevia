const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const authRoutes = require("./routes/auth.routes");

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

module.exports = app;
