const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// routes

module.exports = app;
