const request = require("supertest");

// Track query shape for assertions
let lastFilter = null;
let lastSkip = null;
let lastLimit = null;

const SELLER_ID = "64d2f0d8c8f1ba0012345678"; // same as jest.setup injected id

// Helper to load app with per-test mocks
function loadAppWithMocks({ authMock, modelMock } = {}) {
  jest.resetModules();

  if (authMock) {
    jest.doMock(
      require.resolve("../src/middlewares/auth.middleware"),
      () => authMock
    );
  }
  if (modelMock) {
    jest.doMock("../src/models/product.model", () => modelMock);
  }

  let app;
  jest.isolateModules(() => {
    app = require("../src/app");
  });
  return app;
}

// Keep skipped until GET /api/products/seller is implemented
describe("GET /api/products/seller (SELLER) - list products of the seller", () => {
  beforeEach(() => {
    lastFilter = null;
    lastSkip = null;
    lastLimit = null;
  });

  it("require auth (401) when no token provided", async () => {
    const authMock = function createAuthMiddleware() {
      return (req, res, next) => {
        const token =
          req.cookies?.token || req.headers?.authorization?.split(" ")?.[1];
        if (!token)
          return res
            .status(401)
            .json({ message: "Unauthorized: No token provided" });
        req.user = { id: SELLER_ID, role: "seller" };
        next();
      };
    };
    const app = loadAppWithMocks({ authMock });

    const res = await request(app).get("/api/products/seller");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty(
      "message",
      "Unauthorized: No token provided"
    );
  });

  it("require seller role (403) when role is not seller", async () => {
    const authMock = function createAuthMiddleware(roles = ["seller"]) {
      return (req, res, next) => {
        const token =
          req.cookies?.token || req.headers?.authorization?.split(" ")?.[1];
        if (!token)
          return res
            .status(401)
            .json({ message: "Unauthorized: No token provided" });
        req.user = { id: "64d2f0d8c8f1ba00abcdef12", role: "user" }; // not a seller
        if (!roles.includes(req.user.role)) {
          return res
            .status(403)
            .json({ message: "Forbidden: Insufficient Permissions" });
        }
        next();
      };
    };
    const app = loadAppWithMocks({ authMock });

    const res = await request(app)
      .get("/api/products/seller")
      .set("Authorization", "Bearer sometoken");
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty(
      "message",
      "Forbidden: Insufficient Permissions"
    );
  });

  it("list only products owned by authenticated seller", async () => {
    const authMock = function createAuthMiddleware(roles = ["seller"]) {
      return (req, res, next) => {
        req.user = { id: SELLER_ID, role: "seller" };
        next();
      };
    };

    const DUMMY_PRODUCTS = [
      {
        _id: "507f1f77bcf86cd799439301",
        title: "Item A",
        price: { amount: 100, currency: "INR" },
        seller: SELLER_ID,
        images: [],
      },
      {
        _id: "507f1f77bcf86cd799439302",
        title: "Item B",
        price: { amount: 200, currency: "INR" },
        seller: SELLER_ID,
        images: [],
      },
    ];

    const modelMock = {
      find: jest.fn((filter) => {
        lastFilter = filter;
        return {
          skip(n) {
            lastSkip = n;
            return this;
          },
          limit(n) {
            lastLimit = n;
            return Promise.resolve(DUMMY_PRODUCTS);
          },
        };
      }),
    };

    const app = loadAppWithMocks({ authMock, modelMock });

    const res = await request(app)
      .get("/api/products/seller")
      .set("Authorization", "Bearer sometoken");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(DUMMY_PRODUCTS.length);
    expect(lastFilter).toMatchObject({ seller: SELLER_ID });
    expect(lastSkip).toBe(0);
    expect(lastLimit).toBe(20);
  });

  it("support pagination with skip and limit", async () => {
    const authMock = function createAuthMiddleware(roles = ["seller"]) {
      return (req, res, next) => {
        req.user = { id: SELLER_ID, role: "seller" };
        next();
      };
    };

    const modelMock = {
      find: jest.fn((filter) => {
        lastFilter = filter;
        return {
          skip(n) {
            lastSkip = n;
            return this;
          },
          limit(n) {
            lastLimit = n;
            return Promise.resolve([]);
          },
        };
      }),
    };

    const app = loadAppWithMocks({ authMock, modelMock });

    const skip = 5;
    const limit = 2;
    const res = await request(app)
      .get(`/api/products/seller?skip=${skip}&limit=${limit}`)
      .set("Authorization", "Bearer sometoken");

    expect(res.status).toBe(200);
    expect(lastSkip).toBe(skip);
    expect(lastLimit).toBe(limit);
    expect(lastFilter).toMatchObject({ seller: SELLER_ID });
  });
});
