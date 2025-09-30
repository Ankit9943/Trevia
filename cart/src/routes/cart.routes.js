const express = require("express");
const router = express.Router();
const {
  getCart,
  addItemToCart,
  updateCartItem,
  deleteCartItem,
  deleteCart,
} = require("../controllers/cart.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const {
  validateAddItemToCart,
  validateUpdateCartItem,
} = require("../middlewares/validation.middleware");

router.post(
  "/items",
  validateAddItemToCart,
  createAuthMiddleware(["user"]),
  addItemToCart
);

/* GET /api/cart */
router.get("/", createAuthMiddleware(["user"]), getCart);

/* PATCH /api/cart/items/:productId */
router.patch(
  "/items/:productId",
  validateUpdateCartItem,
  createAuthMiddleware(["user"]),
  updateCartItem
);

/* DELETE /api/cart/items/:productId */
router.delete(
  "/items/:productId",
  createAuthMiddleware(["user"]),
  deleteCartItem
);

/* DELETE /api/cart */
router.delete("/", createAuthMiddleware(["user"]), deleteCart);

module.exports = router;
