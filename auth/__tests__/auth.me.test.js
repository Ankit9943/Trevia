const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/user.model");

describe("/api/auth/me", () => {
  const registerPayload = {
    username: "janedoe",
    email: "janedoe@example.com",
    password: "Secret123!",
    fullName: { firstName: "Jane", lastName: "Doe" },
    role: "user",
  };

  test("returns 401 (or 403) when no token cookie is provided", async () => {
    const res = await request(app).get("/api/auth/me");
    expect([401, 403]).toContain(res.status);
  });

  test("returns 401 for invalid token cookie", async () => {
    // Create a syntactically valid but incorrect token (wrong secret)
    const fakeToken = jwt.sign({ id: "someid" }, "wrong_secret", {
      expiresIn: "1h",
    });
    const cookie = `token=${fakeToken}; HttpOnly`;
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect([401, 403]).toContain(res.status);
  });
});
