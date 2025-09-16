const { body, validationResult } = require("express-validator");

const respondWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerUserValidation = [
  body("username")
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullName.firstName")
    .isString()
    .notEmpty()
    .withMessage("First name is required"),
  body("fullName.lastName")
    .isString()
    .notEmpty()
    .withMessage("Last name is required"),
  body("role")
    .isString()
    .optional()
    .notEmpty()
    .withMessage("Role must be either user or seller"),
  respondWithValidationErrors,
];

const loginUserValidation = [
  body("email").optional().isEmail().withMessage("Invalid email format"),
  body("username")
    .optional()
    .isString()
    .withMessage("Username must be a string"),
  body("password").isString().notEmpty().withMessage("Password is required"),
  (req, res, next) => {
    if (!req.body.username && !req.body.email) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Either username or email is required" }] });
    }
    respondWithValidationErrors(req, res, next);
  },
];

const addUserAddressValidation = [
  body("street").isString().notEmpty().withMessage("Street is required"),
  body("city").isString().notEmpty().withMessage("City is required"),
  body("state").isString().notEmpty().withMessage("State is required"),
  body("country").isString().notEmpty().withMessage("Country is required"),
  body("pincode")
    .isString()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be a 6-digit number"),
  body("phone")
    .isString()
    .matches(/^\d{10}$/)
    .withMessage("Phone must be a 10-digit number"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  respondWithValidationErrors,
];

module.exports = {
  registerUserValidation,
  loginUserValidation,
  addUserAddressValidation,
};
