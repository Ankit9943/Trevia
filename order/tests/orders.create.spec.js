const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Order = require("../src/models/order.model");
const { buildAuthCookie } = require("./test-utils/auth");
const axios = require("axios");

jest.mock("axios");

describe("POST /api/orders", () => {
  const userId = "68de2f07bf794a4141134af1";
  const productIdA = new mongoose.Types.ObjectId();
  const productIdB = new mongoose.Types.ObjectId();

  function buildRequestPayload(overrides = {}) {
    return {
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
        pincode: "900001",
      },
      ...overrides,
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create an order and respond 201 with status PENDING and computed totalPrice", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          items: [
            { productId: productIdA.toString(), quantity: 2 },
            { productId: productIdB.toString(), quantity: 1 },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            _id: productIdA.toString(),
            title: "Product A",
            price: { amount: 100, currency: "INR" },
            stock: 10,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            _id: productIdB.toString(),
            title: "Product B",
            price: { amount: 50, currency: "INR" },
            stock: 5,
          },
        },
      });

    const payload = buildRequestPayload();
    const authCookie = buildAuthCookie(userId);
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send(payload)
      .set("Accept", "application/json");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("status", "PENDING");
    expect(res.body).toHaveProperty("items");
    expect(res.body.items).toHaveLength(2);
    const expectedTotal = 100 * 2 + 50 * 1; // 250
    expect(res.body).toHaveProperty("totalPrice.amount", expectedTotal);
    expect(res.body).toHaveProperty("totalPrice.currency", "INR");
  });

  it("should reject when auth cookie is missing", async () => {
    const payload = buildRequestPayload();
    const res = await request(app)
      .post("/api/orders")
      .send(payload)
      .set("Accept", "application/json");
    expect(res.status).toBe(401);
  });

  it("should respond 500 when product currency is invalid (enum validation)", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          items: [{ productId: productIdA.toString(), quantity: 1 }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            _id: productIdA.toString(),
            title: "Bad Currency Product",
            price: { amount: 10, currency: "EUR" },
            stock: 3,
          },
        },
      });

    const badPayload = buildRequestPayload();
    const authCookie = buildAuthCookie(userId);
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send(badPayload)
      .set("Accept", "application/json");

    // Controller catches mongoose validation error and returns 500
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "Internal server error");
  });

  it("should persist order in database when successful", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          items: [
            { productId: productIdA.toString(), quantity: 2 },
            { productId: productIdB.toString(), quantity: 1 },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            _id: productIdA.toString(),
            title: "Product A",
            price: { amount: 100, currency: "INR" },
            stock: 10,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            _id: productIdB.toString(),
            title: "Product B",
            price: { amount: 50, currency: "INR" },
            stock: 5,
          },
        },
      });

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
