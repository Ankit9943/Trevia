const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Order = require("../src/models/order.model");
const { buildAuthCookie } = require("./test-utils/auth");

describe("GET /api/orders/:id", () => {
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  function sampleAddress() {
    return {
      street: "221B Baker Street",
      city: "London",
      state: "LDN",
      country: "UK",
      pincode: "123456",
    };
  }

  it("returns 200 with the order body when owner requests it", async () => {
    const order = await Order.create({
      user: userA,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
      ],
      status: "PENDING",
      totalPrice: { amount: 100, currency: "INR" },
      shippingAddress: sampleAddress(),
    });

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Cookie", buildAuthCookie(userA))
      .expect(200);

    expect(res.body).toHaveProperty("_id", order._id.toString());
    // totalPrice is part of the order body already
    expect(res.body).toHaveProperty("totalPrice");
  });

  it("returns 404 for a non-existing order id", async () => {
    const missingId = new mongoose.Types.ObjectId();
    await request(app)
      .get(`/api/orders/${missingId}`)
      .set("Cookie", buildAuthCookie(userA))
      .expect(404);
  });

  it("returns 403 when a different user requests someone else’s order", async () => {
    const order = await Order.create({
      user: userA,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
      ],
      status: "PENDING",
      totalPrice: { amount: 100, currency: "INR" },
      shippingAddress: sampleAddress(),
    });

    await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Cookie", buildAuthCookie(userB))
      .expect(403);
  });
});
