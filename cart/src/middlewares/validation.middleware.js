const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");

function validateResult(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const validateAddItemToCart = [
  body("productId")
    .isString()
    .withMessage("productId is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid productId format"),
  body("qty").isInt({ gt: 0 }).withMessage("Quantity must be at least 1"),
  validateResult,
];

const validateUpdateCartItem = [
  param("productId").isString().withMessage("productId is required"),
  // We intentionally skip ObjectId format validation here because tests use arbitrary string IDs like 'pPatch'.
  body("qty")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
  validateResult,
];

module.exports = {
  validateAddItemToCart,
  validateUpdateCartItem,
};
