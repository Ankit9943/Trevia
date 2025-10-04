const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Order = require("../src/models/order.model");
const { buildAuthCookie } = require("./test-utils/auth");

// NOTE: These tests assume that POST /api/orders will:
//  - Read current cart (not implemented yet; we will simulate by sending body directly until cart logic exists)
//  - Copy priced items, compute totals, set status=PENDING
//  - Return 201 with created order JSON
//  - Validate required fields
//  - Reserve inventory (out of scope here; we can assert a placeholder flag/side-effect when implemented)

describe("POST /api/orders", () => {
  const userId = "68cda903023c0945fb2d6a29";
  const productIdA = new mongoose.Types.ObjectId();
  const productIdB = new mongoose.Types.ObjectId();

  function buildRequestPayload(overrides = {}) {
    return {
      // user intentionally omitted; controller should use req.user.id
      items: [
        {
          product: productIdA.toString(),
          quantity: 2,
          price: { amount: 100, currency: "USD" },
        },
        {
          product: productIdB.toString(),
          quantity: 1,
          price: { amount: 50, currency: "USD" },
        },
      ],
      shippingAddress: {
        street: "123 Main St",
        city: "Metropolis",
        state: "CA",
        country: "USA",
        pincode: "90001",
        phone: "1234567890",
        isDefault: true,
      },
      ...overrides,
    };
  }

  it("should create an order and respond 201 with status PENDING and computed totalPrice", async () => {
    const payload = buildRequestPayload();
    const authCookie = buildAuthCookie(userId);
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send(payload)
      .set("Accept", "application/json");

    // STRICT: must be 201
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("status", "PENDING");
    expect(res.body).toHaveProperty("items");
    expect(res.body.items).toHaveLength(2);
    const expectedTotal = 100 * 2 + 50 * 1; // 250
    expect(res.body).toHaveProperty("totalPrice.amount", expectedTotal);
    expect(res.body).toHaveProperty("totalPrice.currency", "USD");
  });

  it("should reject when auth cookie is missing", async () => {
    const payload = buildRequestPayload();
    const res = await request(app)
      .post("/api/orders")
      .send(payload)
      .set("Accept", "application/json");
    expect(res.status).toBe(401);
  });

  it("should reject when an item has invalid currency", async () => {
    const badPayload = buildRequestPayload({
      items: [
        {
          product: productIdA.toString(),
          quantity: 1,
          price: { amount: 10, currency: "EUR" }, // invalid enum
        },
      ],
    });
    const authCookie = buildAuthCookie(userId);
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send(badPayload)
      .set("Accept", "application/json");
    expect([400, 422]).toContain(res.status);
  });

  it("should persist order in database when successful", async () => {
    const payload = buildRequestPayload();
    const authCookie = buildAuthCookie(userId);
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send(payload)
      .set("Accept", "application/json");
    expect(res.status).toBe(201);
    const found = await Order.findById(res.body._id);
    expect(found).not.toBeNull();
    expect(found.items.length).toBe(2);
  });
});
