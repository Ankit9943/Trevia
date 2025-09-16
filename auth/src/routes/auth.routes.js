const express = require("express");
const {
  registerUserValidation,
  loginUserValidation,
  addUserAddressValidation,
} = require("../middlewares/validator.middleware");
const {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getUserAddresses,
  addUserAddress,
  deleteAddress,
} = require("../controllers/auth.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

const router = express.Router();

// POST /auth/register
router.post("/register", registerUserValidation, registerUser);

// POST /auth/login
router.post("/login", loginUserValidation, loginUser);

// GET /auth/me
router.get("/me", authMiddleware, getCurrentUser);

// GET /auth/logout
router.get("/logout", logoutUser);

// address apis
router.get("/users/me/addresses", authMiddleware, getUserAddresses);
router.post(
  "/users/me/addresses",
  authMiddleware,
  addUserAddressValidation,
  addUserAddress
);
router.delete("/users/me/addresses/:addressId", authMiddleware, deleteAddress);
module.exports = router;
