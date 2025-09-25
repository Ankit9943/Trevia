const request = require("supertest");
const app = require("../src/app");

// Mock Product model's delete behavior
jest.mock("../src/models/product.model", () => ({
  findOneAndDelete: jest.fn(),
}));

const productModel = require("../src/models/product.model");

// Note: The DELETE route/controller aren't implemented yet. We mark the suite as skipped
// to keep the test run green. Remove `.skip` once the API is implemented.
describe("DELETE /api/products/:id (SELLER) - delete a product", () => {
  const SELLER_ID = "64d2f0d8c8f1ba0012345678"; // injected by jest.setup.js auth mock

  beforeEach(() => {
    productModel.findOneAndDelete.mockReset();
  });

  it("should delete product and return 200 with deleted product", async () => {
    const id = "507f1f77bcf86cd799439055";
    const deletedProduct = {
      _id: id,
      title: "Old Title",
      description: "Old description",
      price: { amount: 100, currency: "INR" },
      seller: SELLER_ID,
      images: [],
    };

    productModel.findOneAndDelete.mockResolvedValueOnce(deletedProduct);

    const res = await request(app).delete(`/api/products/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "Product deleted successfully",
      deletedProduct: deletedProduct,
    });

    expect(productModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: id,
      seller: SELLER_ID,
    });
  });

  it("should return 404 when product doesn't exist or isn't owned by seller", async () => {
    const id = "507f1f77bcf86cd799439066";
    productModel.findOneAndDelete.mockResolvedValueOnce(null);

    const res = await request(app).delete(`/api/products/${id}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "Product not found");
  });

  it("should return 400 for invalid ObjectId", async () => {
    const res = await request(app).delete("/api/products/not-an-id");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid product id");
    // Controller validates id before hitting DB
    expect(productModel.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("should return 500 for unexpected errors", async () => {
    productModel.findOneAndDelete.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).delete(
      "/api/products/507f1f77bcf86cd799439077"
    );

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "DB down");
  });
});
