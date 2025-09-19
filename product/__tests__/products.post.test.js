const request = require("supertest");
const app = require("../src/app");

// Mock Product model
jest.mock("../src/models/product.model", () => {
  return {
    create: jest.fn(async (payload) => ({
      _id: "507f1f77bcf86cd799439011",
      ...payload,
    })),
  };
});

describe("POST /api/products", () => {
  it("should create a product and return 201 with product in body", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer testtoken")
      .send({
        title: "Test Product",
        description: "A great product",
        priceAmount: 1999,
        priceCurrency: "INR",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Product created successfully");
    expect(res.body).toHaveProperty("product");
    expect(res.body.product).toMatchObject({
      title: "Test Product",
      description: "A great product",
      price: { amount: 1999, currency: "INR" },
      seller: "64d2f0d8c8f1ba0012345678",
    });
    // images may be empty in JSON flow (multer bypassed in tests)
    expect(Array.isArray(res.body.product.images)).toBe(true);
  });

  it("should return 400 when title is missing (validator)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer testtoken")
      .field("priceAmount", "1000");
    expect(res.status).toBe(400);
  });

  it("should return 400 when priceAmount invalid (validator)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer testtoken")
      .field("title", "X")
      .field("priceAmount", "abc");
    expect(res.status).toBe(400);
  });
});
