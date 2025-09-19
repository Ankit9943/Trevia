const express = require("express");
const cookieParser = require("cookie-parser");
const productRoutes = require("./routes/product.routes");
const app = express();

// middlewares
app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/products", productRoutes);

module.exports = app;
