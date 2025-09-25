const request = require("supertest");
const app = require("../src/app");

// We'll capture the last filter and pagination values used by the controller
let lastFilter = null;
let lastSkip = null;
let lastLimit = null;

// Dummy dataset to return from the mocked query
const DUMMY_PRODUCTS = [
  {
    _id: "507f1f77bcf86cd799439021",
    title: "Phone X",
    description: "A great phone",
    price: { amount: 15000, currency: "INR" },
    seller: "64d2f0d8c8f1ba0012345678",
    images: [],
  },
  {
    _id: "507f1f77bcf86cd799439022",
    title: "Laptop Pro",
    description: "Powerful laptop",
    price: { amount: 70000, currency: "INR" },
    seller: "64d2f0d8c8f1ba0012345678",
    images: [],
  },
];

// Mock Product model's find -> skip -> limit chain
jest.mock("../src/models/product.model", () => {
  return {
    find: jest.fn((filter) => {
      // record filter
      lastFilter = filter;

      // simple chainable query stub
      const query = {
        skip(n) {
          lastSkip = n;
          return this;
        },
        limit(n) {
          lastLimit = n;
          // emulate mongoose thenable query by returning a Promise
          // We don't actually filter by `filter` here; controller correctness
          // is asserted by checking `lastFilter` contents.
          return Promise.resolve(DUMMY_PRODUCTS);
        },
      };
      return query;
    }),
  };
});

describe("GET /api/products", () => {
  beforeEach(() => {
    lastFilter = null;
    lastSkip = null;
    lastLimit = null;
  });

  it("should return 200 and a list of products with default pagination", async () => {
    const res = await request(app).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Products fetched successfully");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(DUMMY_PRODUCTS.length);

    // Default skip=0, limit=20 (from controller)
    expect(lastSkip).toBe(0);
    expect(lastLimit).toBe(20);

    // Default filter is empty object
    expect(lastFilter).toEqual({});
  });

  it("should apply text search and price range filters", async () => {
    const q = "phone";
    const minprice = 10000;
    const maxprice = 20000;

    const res = await request(app).get(
      `/api/products?q=${encodeURIComponent(
        q
      )}&minprice=${minprice}&maxprice=${maxprice}`
    );

    expect(res.status).toBe(200);

    // Assert filter shape built by controller
    expect(lastFilter).toEqual({
      $text: { $search: q },
      "price.amount": { $gte: minprice, $lte: maxprice },
    });
  });

  it("should respect skip and limit query params", async () => {
    const skip = 5;
    const limit = 2;

    const res = await request(app).get(
      `/api/products?skip=${skip}&limit=${limit}`
    );

    expect(res.status).toBe(200);
    expect(lastSkip).toBe(skip);
    expect(lastLimit).toBe(limit);
  });
});
