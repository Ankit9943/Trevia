const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Mock the cart model so we don't depend on the unfinished real Mongoose schema (user vs userId mismatch)
// and to keep tests focused only on current controller behavior without changing API code.
// Shared in-memory store for cart mocks across specifiers
const __carts = [];
jest.mock("../src/models/cart.model", () => {
  return class CartMock {
    constructor(doc) {
      Object.assign(this, doc);
      if (!this.items) this.items = [];
    }
    static async findOne(query) {
      return __carts.find((c) => c.userId === query.userId) || null;
    }
    async save() {
      if (!__carts.includes(this)) __carts.push(this);
      return this;
    }
  };
});

// Require the app AFTER mocks so controllers use the mocked model.
const app = require("../src/app");

// Ensure a JWT secret for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";

// Helper to build an auth cookie with a signed JWT
function buildAuthCookie(payload = {}) {
  const base = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "user",
    ...payload,
  };
  const token = jwt.sign(base, process.env.JWT_SECRET, { expiresIn: "1h" });
  return `token=${token}`;
}

// Reuse single user across requests to preserve cart state between multiple calls
const AUTH_COOKIE = buildAuthCookie({ id: "test-user-1" });
function withAuth(agent) {
  return agent.set("Cookie", AUTH_COOKIE);
}

// We will mock the product service once it exists so price recomputation can be asserted.
// Example (uncomment when service file/path exists):
// jest.mock('../src/services/productService', () => ({
//   getProductsByIds: jest.fn(async (ids) => ids.map((id, i) => ({ _id: id, price: [100, 250, 75][i] })))
// }));
// const productService = require('../src/services/productService');

/*
Contract (to be implemented by the future /api/cart endpoints):
GET /api/cart
  Response 200 JSON:
  {
    items: [
      {
        productId: string,
        quantity: number,
        unitPrice: number,        // fetched fresh from product service (authoritative)
        lineTotal: number          // quantity * unitPrice
      }, ...
    ],
    total: number                  // sum of lineTotal
  }
DELETE /api/cart
  Clears all cart items for the current user/session.
  Recommended response codes: 204 (no content) OR 200 with { message: 'Cart cleared' }.

Business rule: Ignore any client-sent price values (avoid tampering). Always re-fetch product prices by productId and recompute totals server-side.

Edge cases to cover when implementing (add tests then):
  - Unknown product IDs -> exclude or return 404 depending on design.
  - Zero / negative quantities -> sanitize (reject or clamp).
  - Large cart sizes -> performance of recomputation.
  - Concurrency (simultaneous modifications) -> optimistic locking or last-write-wins.
*/

describe("GET /api/cart (to be implemented)", () => {
  it("returns current cart with recomputed pricing and grand total", async () => {
    // Arrange: (In a real test you might seed a cart in a test DB or set session state.)
    // For example, cart contains items with possibly tampered client prices:
    // [{ productId: 'p1', quantity: 2, clientPrice: 1 }, { productId: 'p2', quantity: 1, clientPrice: 99999 }]
    // Mock product service authoritative prices: p1: 100, p2: 250

    // Act
    const res = await withAuth(request(app).get("/api/cart"));

    // Assert desired final shape
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(0);
    for (const item of res.body.items) {
      expect(item).toEqual(
        expect.objectContaining({
          productId: expect.any(String),
          quantity: expect.any(Number),
          unitPrice: expect.any(Number),
          lineTotal: expect.any(Number),
        })
      );
      expect(item.lineTotal).toBeCloseTo(item.quantity * item.unitPrice, 5);
    }
    const computedTotal = res.body.items.reduce(
      (sum, i) => sum + i.lineTotal,
      0
    );
    expect(res.body.total).toBeCloseTo(computedTotal, 5);

    // Also ensure product service was asked only for unique product IDs (uncomment when mock active):
    // const uniqueIds = [...new Set(['p1','p2'])];
    // expect(productService.getProductsByIds).toHaveBeenCalledWith(uniqueIds);
  });

  it("ignores tampered client prices and uses authoritative product prices", async () => {
    // After implementation, seed a cart where client attempted price tampering and verify recomputed totals.
    const res = await withAuth(request(app).get("/api/cart"));
    expect(res.status).toBe(200);
    // Example assertion pattern once mock is active:
    // const p1 = res.body.items.find(i => i.productId === 'p1');
    // expect(p1.unitPrice).toBe(100); // authoritative price, not tampered 1
  });
});

describe("DELETE /api/cart (to be implemented)", () => {
  it("clears the cart and returns an empty cart on subsequent GET", async () => {
    // Arrange: ensure cart has items first (seed step to add once API exists)

    // Act: clear
    const delRes = await withAuth(request(app).delete("/api/cart"));

    // Assert status (choose 204 or 200). Adjust expectation once decided.
    expect([200, 204]).toContain(delRes.status);

    // Follow-up GET should now show empty cart
    const getRes = await withAuth(request(app).get("/api/cart"));
    expect(getRes.status).toBe(200);
    expect(getRes.body.items).toEqual([]);
    expect(getRes.body.total).toBe(0);
  });
});

describe("POST /api/cart/items ", () => {
  it("adds a new item and returns cart with that item (no pricing yet)", async () => {
    const productId = new mongoose.Types.ObjectId().toString();
    const res = await withAuth(
      request(app).post("/api/cart/items").send({ productId, qty: 2 })
    );

    expect(res.status).toBe(201); // controller returns 201 on add
    expect(res.body).toHaveProperty("cart");
    const item = res.body.cart.items.find((i) => i.productId === productId);
    expect(item).toBeTruthy();
    expect(item.quantity).toBe(2);
  });

  it("increments quantity when adding an existing item", async () => {
    const productId = new mongoose.Types.ObjectId().toString();
    // First add
    await withAuth(
      request(app).post("/api/cart/items").send({ productId, qty: 1 })
    );
    // Second add increments
    const res = await withAuth(
      request(app).post("/api/cart/items").send({ productId, qty: 3 })
    );
    expect(res.status).toBe(201);
    const item = res.body.cart.items.find((i) => i.productId === productId);
    expect(item.quantity).toBe(4); // 1 + 3
  });

  it("rejects invalid quantity (<=0) via validation middleware", async () => {
    const productId = new mongoose.Types.ObjectId().toString();
    const res = await withAuth(
      request(app).post("/api/cart/items").send({ productId, qty: 0 })
    );
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Quantity must be at least 1" }),
      ])
    );
  });

  it("currently does NOT enforce stock checks (placeholder until implemented)", async () => {
    const productId = new mongoose.Types.ObjectId().toString();
    const res = await withAuth(
      request(app).post("/api/cart/items").send({ productId, qty: 5 })
    );
    // Document current behavior; update this expectation once stock logic exists.
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/cart/items/:productId (to be implemented)", () => {
  it("updates quantity and returns recalculated totals", async () => {
    const pPatch = new mongoose.Types.ObjectId().toString();
    await withAuth(
      request(app).post("/api/cart/items").send({ productId: pPatch, qty: 2 })
    );
    const res = await withAuth(
      request(app).patch(`/api/cart/items/${pPatch}`).send({ qty: 5 })
    );
    expect(res.status).toBe(200);
    const item = res.body.cart.items.find((i) => i.productId === pPatch);
    expect(item.quantity).toBe(5);
    const total = res.body.cart.items.reduce((s, i) => s + i.lineTotal, 0);
    expect(res.body.cart.total).toBeCloseTo(total, 5);
  });

  it("removes item when qty <= 0", async () => {
    const pRemove = new mongoose.Types.ObjectId().toString();
    await withAuth(
      request(app).post("/api/cart/items").send({ productId: pRemove, qty: 1 })
    );
    const res = await withAuth(
      request(app).patch(`/api/cart/items/${pRemove}`).send({ qty: 0 })
    );
    expect(res.status).toBe(200);
    const exists = res.body.cart.items.some((i) => i.productId === pRemove);
    expect(exists).toBe(false);
  });

  it("returns not found when updating absent item", async () => {
    const res = await withAuth(
      request(app).patch("/api/cart/items/nope").send({ qty: 3 })
    );
    expect([404, 400]).toContain(res.status);
  });
});

describe("DELETE /api/cart/items/:productId (to be implemented)", () => {
  it("removes existing item", async () => {
    await withAuth(
      request(app).post("/api/cart/items").send({ productId: "pDel", qty: 2 })
    );
    const delRes = await withAuth(request(app).delete("/api/cart/items/pDel"));
    expect([200, 204, 404]).toContain(delRes.status);
    const getRes = await withAuth(request(app).get("/api/cart"));
    const exists = getRes.body.items?.some((i) => i.productId === "pDel");
    expect(exists).toBe(false);
  });

  it("is idempotent when deleting missing item", async () => {
    const delRes = await withAuth(request(app).delete("/api/cart/items/ghost"));
    expect([200, 204, 404]).toContain(delRes.status); // decide on idempotency strategy
  });
});
