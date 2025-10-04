const express = require("express");
const { createOrder } = require("../controllers/order.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const router = express.Router();

// routes

/* POST /api/orders */
router.post("/", createAuthMiddleware(["user"]), createOrder);

module.exports = router;
