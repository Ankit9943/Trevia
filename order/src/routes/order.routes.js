const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateShippingAddress,
} = require("../controllers/order.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const {
  createOrderValidation,
} = require("../middlewares/validation.middleware");
const { create } = require("../models/order.model");
const router = express.Router();

// routes

/* POST /api/orders */
router.post(
  "/",
  createAuthMiddleware(["user"]),
  createOrderValidation,
  createOrder
);

/* GET /api/orders/me */
router.get("/me", createAuthMiddleware(["user"]), getMyOrders);

/* GET /api/orders/:id */
router.get("/:id", createAuthMiddleware(["user", "admin"]), getOrderById);

/* POST /api/orders/:id/cancel */
router.post(
  "/:id/cancel",
  createAuthMiddleware(["user", "admin"]),
  cancelOrder
);

/* PATCH /api/orders/:id/address */
router.patch(
  "/:id/address",
  createAuthMiddleware(["user", "admin"]),
  updateShippingAddress
);

module.exports = router;
