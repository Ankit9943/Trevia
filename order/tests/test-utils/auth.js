const jwt = require("jsonwebtoken");

function buildAuthCookie(userId, role = "user") {
  const secret = process.env.JWT_SECRET || "testsecret";
  const token = jwt.sign({ id: userId.toString(), role }, secret, {
    expiresIn: "1h",
  });
  return `token=${token}`; // cookie string
}

module.exports = { buildAuthCookie };
