const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user.model");
const bcrypt = require("bcrypt");

describe("/api/auth/register", () => {
  const payload = {
    username: "jdoe",
    email: "jdoe@example.com",
    password: "Secret123!",
    fullName: { firstName: "John", lastName: "Doe" },
    role: "user",
  };

  test("creates a user and returns 201 without password", async () => {
    const res = await request(app).post("/api/auth/register").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(payload.email);
    expect(res.body.user.password).toBeUndefined();

    // verify hashed in DB
    const user = await User.findOne({ email: payload.email }).select(
      "+password"
    );
    expect(user).toBeTruthy();
    expect(user.password).toBeTruthy();
    const ok = await bcrypt.compare(payload.password, user.password);
    expect(ok).toBe(true);
  });

  test("rejects duplicate email or username", async () => {
    await request(app).post("/api/auth/register").send(payload).expect(201);
    const res = await request(app).post("/api/auth/register").send(payload);
    expect(res.status).toBe(409);
  });

  test("validates missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "x@y.com" });
    expect(res.status).toBe(400);
  });
});
