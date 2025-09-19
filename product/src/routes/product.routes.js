const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createProduct } = require("../controllers/product.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const { createProductValidator } = require("../middlewares/product.validator");

const upload = multer({ storage: multer.memoryStorage() });

/* POST /api/products */
router.post(
  "/",
  createAuthMiddleware(["admin", "seller"]),
  upload.array("images", 5),
  createProductValidator,
  createProduct
);

module.exports = router;
