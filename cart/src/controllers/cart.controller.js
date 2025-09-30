const cartModel = require("../models/cart.model");

async function addItemToCart(req, res) {
  const { productId, qty } = req.body;

  const userId = req.user.id; // assuming user ID is set in req.user by auth middleware

  let cart = await cartModel.findOne({ userId });

  if (!cart) {
    cart = new cartModel({ userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId === productId
  );
  if (existingItemIndex >= 0) {
    cart.items[existingItemIndex].quantity += qty;
  } else {
    cart.items.push({ productId, quantity: qty });
  }

  await cart.save();
  return res.status(201).json({ message: "Item added to cart", cart });
}

// GET current cart summary
async function getCart(req, res) {
  const userId = req.user.id;
  const cart = await cartModel.findOne({ userId });
  if (!cart) {
    return res.status(200).json({ items: [], total: 0 });
  }

  const items = cart.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    lineTotal: i.quantity, // placeholder until pricing integration
  }));
  const total = items.reduce((s, i) => s + i.lineTotal, 0);
  return res.status(200).json({ items, total });
}

// Update / remove a cart item
async function updateCartItem(req, res) {
  const { productId } = req.params;
  const { qty } = req.body;
  const userId = req.user.id;

  let cart = await cartModel.findOne({ userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const index = cart.items.findIndex((i) => i.productId === productId);
  if (index === -1)
    return res.status(404).json({ message: "Item not found in cart" });

  if (qty <= 0) {
    cart.items.splice(index, 1);
  } else {
    cart.items[index].quantity = qty;
  }

  await cart.save();

  // Basic computed fields (placeholder pricing: lineTotal = quantity)
  const items = cart.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    lineTotal: i.quantity,
  }));
  const total = items.reduce((s, i) => s + i.lineTotal, 0);

  return res.status(200).json({ cart: { items, total } });
}

async function deleteCartItem(req, res) {
  const { productId } = req.params;
  const userId = req.user.id;

  let cart = await cartModel.findOne({ userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const index = cart.items.findIndex((i) => i.productId === productId);
  if (index === -1) {
    return res.status(404).json({ message: "Item not found in cart" });
  } else {
    // Item found, proceed to remove it
    cart.items.splice(index, 1);
  }

  await cart.save();

  return res.status(200).json({ message: "Item removed from cart", cart });
}

async function deleteCart(req, res) {
  const userId = req.user.id;

  const cart = await cartModel.findOne({ userId });
  if (!cart) {
    // Idempotent: deleting a non-existent cart still returns success
    return res.status(204).send();
  }
  cart.items = [];
  await cart.save();
  // Return 204 (no content) to indicate successful clear;
  return res.status(204).send();
}

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  deleteCartItem,
  deleteCart,
};
