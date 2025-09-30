const express = require("express");
const cookieParser = require("cookie-parser");
const cartRoutes = require("./routes/cart.routes");
const app = express();

// middlewares
app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/cart", cartRoutes);

module.exports = app;
