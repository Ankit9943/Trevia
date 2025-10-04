const express = require("express");
const { createOrder } = require("../controllers/order.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const {
  createOrderValidation,
} = require("../middlewares/validation.middleware");
const router = express.Router();

// routes

/* POST /api/orders */
router.post(
  "/",
  createAuthMiddleware(["user"]),
  createOrderValidation,
  createOrder
);

module.exports = router;
