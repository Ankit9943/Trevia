const express = require("express");
const cookieParser = require("cookie-parser");
const orderRoutes = require("./routes/order.routes");
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/orders", orderRoutes);

module.exports = app;
