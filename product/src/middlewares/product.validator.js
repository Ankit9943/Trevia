const { body, validationResult } = require("express-validator");

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const createProductValidator = [
  body("title").isString().trim().notEmpty().withMessage("Title is required"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description max length is 500 characters"),
  body("priceAmount")
    .notEmpty()
    .withMessage("Price Amount is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("Price Amount must be a number greater than 0"),
  body("priceCurrency")
    .optional()
    .isIn(["INR", "USD"])
    .withMessage("Price Currency must be either 'INR' or 'USD'"),
  handleValidationErrors,
];

module.exports = { createProductValidator };
