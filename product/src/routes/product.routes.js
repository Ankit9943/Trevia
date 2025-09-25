const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getSellerProducts,
} = require("../controllers/product.controller");
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

/* GET /api/products */
router.get("/", getProducts);

/* PATCH /api/products/:id */
router.patch("/:id", createAuthMiddleware(["seller"]), updateProduct);

/* DELETE /api/products/:id */
router.delete("/:id", createAuthMiddleware(["seller"]), deleteProduct);

/* GET /api/products/seller */
router.get("/seller", createAuthMiddleware(["seller"]), getSellerProducts);

/* GET /api/products/:id */
router.get("/:id", getProductById);

module.exports = router;
