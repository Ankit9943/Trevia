const request = require("supertest");
const app = require("../src/app");

describe("/api/auth/logout", () => {
  const registerPayload = {
    username: "logoutuser",
    email: "logoutuser@example.com",
    password: "Secret123!",
    fullName: { firstName: "Log", lastName: "Out" },
    role: "user",
  };

  test("clears token cookie and denies /me afterwards", async () => {
    const agent = request.agent(app);

    // Register and login to set the token cookie on the agent
    await agent.post("/api/auth/register").send(registerPayload).expect(201);
    const loginRes = await agent
      .post("/api/auth/login")
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      })
      .expect(200);

    // Ensure token cookie was set at login
    const loginCookies = loginRes.headers["set-cookie"] || [];
    expect(loginCookies.some((c) => /token=/.test(c))).toBe(true);

    // Logout should clear the cookie
    const logoutRes = await agent.get("/api/auth/logout");
    expect([200, 204]).toContain(logoutRes.status);
    const logoutCookies = logoutRes.headers["set-cookie"] || [];
    const tokenCookie = logoutCookies.find((c) => /token=/.test(c));
    expect(tokenCookie).toBeDefined();
    // Check that cookie is cleared (empty value or expired)
    expect(
      /token=;?/.test(tokenCookie) ||
        /Max-Age=0/.test(tokenCookie) ||
        /Expires=/.test(tokenCookie)
    ).toBe(true);

    // Subsequent call to /me should be unauthorized
    const meRes = await agent.get("/api/auth/me");
    expect([401, 403]).toContain(meRes.status);
  });

  test("is safe to call without a token cookie", async () => {
    const res = await request(app).get("/api/auth/logout");
    // Some implementations return 200/204, others may return 401 if protected
    expect([200, 204, 401]).toContain(res.status);
  });
});
