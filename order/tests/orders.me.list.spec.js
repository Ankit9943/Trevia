const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Order = require("../src/models/order.model");
const { buildAuthCookie } = require("./test-utils/auth");

describe("GET /api/orders/me (paginated)", () => {
  const userId = new mongoose.Types.ObjectId();

  function sampleAddress() {
    return {
      street: "742 Evergreen Terrace",
      city: "Springfield",
      state: "IL",
      country: "USA",
      pincode: "123456",
    };
  }

  beforeEach(async () => {
    const docs = Array.from({ length: 13 }).map(() => ({
      user: userId,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          price: { amount: 50, currency: "INR" },
        },
      ],
      status: "PENDING",
      totalPrice: { amount: 50, currency: "INR" },
      shippingAddress: sampleAddress(),
    }));
    await Order.insertMany(docs);
  });

  it("returns first page with default pageSize and includes pagination meta", async () => {
    const res = await request(app)
      .get("/api/orders/me?page=1&pageSize=5")
      .set("Cookie", buildAuthCookie(userId))
      .expect(200);

    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(5);
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("pageSize", 5);
    expect(res.body).toHaveProperty("total");
    expect(res.body.total).toBeGreaterThanOrEqual(13);
    expect(res.body).toHaveProperty("totalPages");
  });

  it("returns empty list when page exceeds totalPages", async () => {
    const res = await request(app)
      .get("/api/orders/me?page=99&pageSize=10")
      .set("Cookie", buildAuthCookie(userId))
      .expect(200);
    expect(res.body.data.length).toBe(0);
  });
});
