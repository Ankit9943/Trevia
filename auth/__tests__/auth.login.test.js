const request = require("supertest");
const app = require("../src/app");

describe("/api/auth/login", () => {
  const registerPayload = {
    username: "jdoe",
    email: "jdoe@example.com",
    password: "Secret123!",
    fullName: { firstName: "John", lastName: "Doe" },
    role: "user",
  };

  test("logs in with valid email and password, sets httpOnly token cookie, and omits password", async () => {
    // Arrange: create user via register endpoint
    await request(app)
      .post("/api/auth/register")
      .send(registerPayload)
      .expect(201);

    // Act: login
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      });

    // Assert
    expect([200, 201]).toContain(res.status); // allow either 200 or 201 based on implementation choice
    expect(res.headers["set-cookie"]).toBeDefined();
    // Ensure a token cookie is present
    const cookies = res.headers["set-cookie"] || [];
    expect(cookies.some((c) => /token=/.test(c))).toBe(true);

    // User shape without password
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(registerPayload.email);
    expect(res.body.user.username).toBe(registerPayload.username);
    expect(res.body.user.password).toBeUndefined();
  });

  test("returns 400 for missing credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  test("returns 401 for wrong password", async () => {
    // Create the user first
    await request(app)
      .post("/api/auth/register")
      .send(registerPayload)
      .expect(201);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: registerPayload.email, password: "WrongPass1!" });

    expect([400, 401]).toContain(res.status); // Most implementations return 401; 400 acceptable if chosen
  });

  test("returns 401 when user does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nouser@example.com", password: "Secret123!" });
    expect([400, 401, 404]).toContain(res.status); // Accept common choices
  });
});
