const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Order = require("../src/models/order.model");
const { buildAuthCookie } = require("./test-utils/auth");

describe("PATCH /api/orders/:id/address", () => {
  const userId = new mongoose.Types.ObjectId();
  const otherUser = new mongoose.Types.ObjectId();

  function address(overrides = {}) {
    return {
      street: "Old Street",
      city: "Gotham",
      state: "NY",
      country: "USA",
      pincode: "123456",
      ...overrides,
    };
  }

  async function createOrder(status = "PENDING") {
    return Order.create({
      user: userId,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          price: { amount: 25, currency: "INR" },
        },
      ],
      status,
      totalPrice: { amount: 25, currency: "INR" },
      shippingAddress: address(),
    });
  }

  it("updates the address when order is not captured/shipped yet", async () => {
    const order = await createOrder("PENDING");
    const newAddress = address({ street: "New Street 5" });
    const res = await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .set("Cookie", buildAuthCookie(userId))
      .send({ shippingAddress: newAddress })
      .expect(200);

    expect(res.body).toHaveProperty("shippingAddress.street", "New Street 5");
  });

  it("rejects update when order is already shipped/delivered", async () => {
    const order = await createOrder("SHIPPED");
    const newAddress = address({ street: "New Street 7" });
    await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .set("Cookie", buildAuthCookie(userId))
      .send({ shippingAddress: newAddress })
      .expect(400);
  });

  it("rejects update by non-owner with 403", async () => {
    const order = await createOrder("PENDING");
    const newAddress = address({ street: "Hacker Road" });
    await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .set("Cookie", buildAuthCookie(otherUser))
      .send({ shippingAddress: newAddress })
      .expect(403);
  });
});
