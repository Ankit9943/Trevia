const request = require("supertest");
const app = require("../src/app");

// Mock Product model's update behavior
jest.mock("../src/models/product.model", () => ({
  findOneAndUpdate: jest.fn(),
}));

const productModel = require("../src/models/product.model");

// Note: The PATCH route/controller aren't implemented yet. We mark the suite as skipped
// to keep the test run green. Remove `.skip` once the API is implemented.
describe("PATCH /api/products/:id (SELLER) - update product fields", () => {
  const SELLER_ID = "64d2f0d8c8f1ba0012345678"; // injected by jest.setup.js auth mock

  beforeEach(() => {
    productModel.findOneAndUpdate.mockReset();
  });

  it("should update allowed fields and return 200 with updated product", async () => {
    const id = "507f1f77bcf86cd799439055";
    const payload = {
      title: "Updated Title",
      description: "Updated description",
      priceAmount: 999,
      priceCurrency: "INR",
    };

    const updatedProduct = {
      _id: id,
      title: payload.title,
      description: payload.description,
      price: { amount: payload.priceAmount, currency: payload.priceCurrency },
      seller: SELLER_ID,
      images: [],
    };

    productModel.findOneAndUpdate.mockResolvedValueOnce(updatedProduct);

    const res = await request(app).patch(`/api/products/${id}`).send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "Product updated successfully",
      updatedProduct: updatedProduct,
    });

    // Ensure seller scoping and payload mapping to nested price object
    expect(productModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, seller: SELLER_ID },
      {
        title: payload.title,
        description: payload.description,
        price: { amount: payload.priceAmount, currency: payload.priceCurrency },
      },
      { new: true }
    );
  });

  it("should return 404 when product doesn't exist or isn't owned by seller", async () => {
    const id = "507f1f77bcf86cd799439066";
    productModel.findOneAndUpdate.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/products/${id}`)
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "Product not found");
  });

  it("should return 400 for invalid ObjectId", async () => {
    const castError = new Error("Cast to ObjectId failed");
    castError.name = "CastError";
    productModel.findOneAndUpdate.mockRejectedValueOnce(castError);

    const res = await request(app)
      .patch("/api/products/not-an-id")
      .send({ title: "X" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid product id");
  });

  it("should return 500 for unexpected errors", async () => {
    productModel.findOneAndUpdate.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app)
      .patch("/api/products/507f1f77bcf86cd799439077")
      .send({ title: "X" });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "DB down");
  });
});
