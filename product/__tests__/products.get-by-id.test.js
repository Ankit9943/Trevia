const request = require("supertest");
const app = require("../src/app");

// Mock Product model's findById behavior
jest.mock("../src/models/product.model", () => ({
  findById: jest.fn(),
}));

const productModel = require("../src/models/product.model");

describe("GET /api/products/:id", () => {
  beforeEach(() => {
    productModel.findById.mockReset();
  });

  it("should return 200 and the product when found", async () => {
    const product = {
      _id: "507f1f77bcf86cd799439033",
      title: "Camera",
      description: "Nice camera",
      price: { amount: 25000, currency: "INR" },
      seller: "64d2f0d8c8f1ba0012345678",
      images: [],
    };

    productModel.findById.mockResolvedValueOnce(product);

    const res = await request(app).get(`/api/products/${product._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "Product fetched successfully",
      data: product,
    });
    expect(productModel.findById).toHaveBeenCalledWith(product._id);
  });

  it("should return 404 when product is not found", async () => {
    productModel.findById.mockResolvedValueOnce(null);

    const res = await request(app).get(
      "/api/products/507f1f77bcf86cd799439099"
    );

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "Product not found");
  });

  it("should return 400 for invalid ObjectId", async () => {
    // Simulate Mongoose CastError
    const castError = new Error("Cast to ObjectId failed");
    castError.name = "CastError";
    productModel.findById.mockRejectedValueOnce(castError);

    const res = await request(app).get("/api/products/invalid-id");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid product id");
  });

  it("should return 500 for unexpected errors", async () => {
    productModel.findById.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get(
      "/api/products/507f1f77bcf86cd799439088"
    );

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "DB down");
  });
});
