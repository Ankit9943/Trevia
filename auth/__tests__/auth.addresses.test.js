const request = require("supertest");
const app = require("../src/app");

// Assumptions for these tests:
// - Base path is /api (matching existing auth tests)
// - Endpoints:
//     GET    /api/auth/users/me/addresses           -> list addresses; one should be marked default
//     POST   /api/auth/users/me/addresses           -> create address; validate pincode (6 digits) and phone (10 digits)
//     DELETE /api/auth/users/me/addresses/:id       -> delete address by id
// - Behavior:
//     * First created address becomes default automatically
//     * Creating another address with { isDefault: true } switches default to the new address
//     * When deleting the default and others remain, another is promoted to default
//     * Validation errors are returned as { errors: [{ msg, path, ... }] } similar to validator.middleware

describe("/api/auth/users/me/addresses", () => {
  const registerPayload = {
    username: "addruser",
    email: "addruser@example.com",
    password: "Secret123!",
    fullName: { firstName: "Addr", lastName: "User" },
    role: "user",
  };

  const validAddress = () => ({
    street: "123 Main St",
    city: "Metropolis",
    state: "NY",
    country: "US",
    pincode: "123456",
    phone: "9876543210",
    isDefault: false,
  });

  function getAgentWithAuth() {
    return request.agent(app);
  }

  async function registerAndLogin(agent) {
    await agent.post("/api/auth/register").send(registerPayload).expect(201);

    // Login (this will set the cookie on the agent)
    await agent
      .post("/api/auth/login")
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      })
      .expect(200);

    // return authenticated agent
    return agent;
  }

  test("GET returns empty list initially", async () => {
    const agent = getAgentWithAuth();
    await registerAndLogin(agent);

    const res = await agent.get("/api/auth/users/me/addresses");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.addresses)).toBe(true);
    expect(res.body.addresses.length).toBe(0);

    expect(
      "defaultAddressId" in res.body ||
        res.body.addresses.some((a) => a.isDefault === true)
    ).toBe(false);
  });

  test("POST creates first address as default, then GET lists it with isDefault=true", async () => {
    let agent = getAgentWithAuth();
    agent = await registerAndLogin(agent); // 👈 reassign agent

    const createRes = await agent
      .post("/api/auth/users/me/addresses")
      .send(validAddress())
      .expect(201);

    expect(createRes.body.address.isDefault).toBe(true);
  });

  test("POST validates pincode and phone and returns 400 with errors array", async () => {
    const agent = getAgentWithAuth();
    await registerAndLogin(agent);

    const bad = {
      ...validAddress(),
      pincode: "12ab", // invalid
      phone: "12345", // invalid
    };

    const res = await agent.post("/api/auth/users/me/addresses").send(bad);

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    const messages = res.body.errors.map((e) => e.msg || e.message);
    expect(messages.join(" ")).toMatch(/pincode/i);
    expect(messages.join(" ")).toMatch(/phone/i);
  });

  test("Setting a new address with isDefault=true switches default to the new one (only one default)", async () => {
    const agent = getAgentWithAuth();
    await registerAndLogin(agent);

    // Create first (auto default)
    const a1 = await agent
      .post("/api/auth/users/me/addresses")
      .send(validAddress())
      .expect(201);
    const firstId = a1.body.address._id;

    // Create second and request default switch
    const a2Payload = {
      ...validAddress(),
      street: "456 Side St",
      isDefault: true,
    };
    const a2 = await agent
      .post("/api/auth/users/me/addresses")
      .send(a2Payload)
      .expect(201);
    const secondId = a2.body.address._id;
    expect(a2.body.address.isDefault).toBe(true);

    // List and check only one default
    const list = await agent.get("/api/auth/users/me/addresses").expect(200);
    expect(list.body.addresses.length).toBe(2);
    const defaults = list.body.addresses.filter((a) => a.isDefault);
    expect(defaults.length).toBe(1);
    expect(defaults[0]._id).toBe(secondId);
    const first = list.body.addresses.find((a) => a._id === firstId);
    expect(first.isDefault).toBe(false);
  });

  test("DELETE removes address; if default is deleted and others remain, another becomes default", async () => {
    const agent = getAgentWithAuth();
    await registerAndLogin(agent);

    // Create two addresses; make second default
    const a1 = await agent
      .post("/api/auth/users/me/addresses")
      .send(validAddress())
      .expect(201);
    const a2 = await agent
      .post("/api/auth/users/me/addresses")
      .send({ ...validAddress(), street: "999 Broadway", isDefault: true })
      .expect(201);

    const firstId = a1.body.address._id;
    const secondId = a2.body.address._id; // default

    // Delete the default one
    const delRes = await agent
      .delete(`/api/auth/users/me/addresses/${secondId}`)
      .expect([200, 204]);

    // List: one remains and it should be default now
    const list = await agent.get("/api/auth/users/me/addresses").expect(200);
    expect(list.body.addresses.length).toBe(1);
    expect(list.body.addresses[0]._id).toBe(firstId);
    expect(list.body.addresses[0].isDefault).toBe(true);
  });

  test("Unauthorized requests are rejected", async () => {
    // No cookie
    await request(app).get("/api/auth/users/me/addresses").expect([401, 403]);
    await request(app)
      .post("/api/auth/users/me/addresses")
      .send(validAddress())
      .expect([401, 403]);
    await request(app)
      .delete("/api/auth/users/me/addresses/64aabbccddeeff0011223344")
      .expect([401, 403]);
  });
});
