const { body, validationResult } = require("express-validator");

const respondWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const createOrderValidation = [
  body("shippingAddress.street")
    .isString()
    .notEmpty()
    .withMessage("Street is required"),
  body("shippingAddress.city")
    .isString()
    .notEmpty()
    .withMessage("City is required"),
  body("shippingAddress.state")
    .isString()
    .notEmpty()
    .withMessage("State is required"),
  body("shippingAddress.country")
    .isString()
    .notEmpty()
    .withMessage("Country is required"),
  body("shippingAddress.pincode")
    .isString()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be a 6-digit number"),
  // body("shippingAddress.phone")
  //   .isString()
  //   .matches(/^\d{10}$/)
  //   .withMessage("Phone must be a 10-digit number"),
  // body("isDefault")
  //   .optional()
  //   .isBoolean()
  //   .withMessage("isDefault must be a boolean"),
  respondWithValidationErrors,
];

module.exports = { createOrderValidation };
