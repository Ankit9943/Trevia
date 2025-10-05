const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Order = require("../src/models/order.model");
const { buildAuthCookie } = require("./test-utils/auth");

describe("POST /api/orders/:id/cancel", () => {
  const userId = new mongoose.Types.ObjectId();
  const otherUser = new mongoose.Types.ObjectId();

  function sampleAddress() {
    return {
      street: "1 Hacker Way",
      city: "Menlo Park",
      state: "CA",
      country: "USA",
      pincode: "123456",
    };
  }

  async function createOrder(status = "PENDING") {
    return Order.create({
      user: userId,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
      ],
      status,
      totalPrice: { amount: 100, currency: "INR" },
      shippingAddress: sampleAddress(),
    });
  }

  it("allows buyer to cancel when status is PENDING", async () => {
    const order = await createOrder("PENDING");
    const res = await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", buildAuthCookie(userId))
      .expect(200);
    expect(res.body).toHaveProperty("status", "CANCELLED");
  });

  it("allows cancel when status is PAID but before capture (business rule simulated)", async () => {
    const order = await createOrder("CONFIRMED"); // assuming CONFIRMED ~ paid auth, not captured
    const res = await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", buildAuthCookie(userId))
      .expect(200);
    expect(res.body).toHaveProperty("status", "CANCELLED");
  });

  it("rejects cancel for non-owner with 403", async () => {
    const order = await createOrder("PENDING");
    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", buildAuthCookie(otherUser))
      .expect(403);
  });

  it("returns 400 when order is not cancellable (e.g., SHIPPED/DELIVERED)", async () => {
    const order = await createOrder("SHIPPED");
    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", buildAuthCookie(userId))
      .expect(400);
  });
});
