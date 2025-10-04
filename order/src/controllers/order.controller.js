const orderModel = require("../models/order.model");
const axios = require("axios");

async function createOrder(req, res) {
  const user = req.user;
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  try {
    // fetch user cart from cart service
    const cartResponse = await axios.get(`http://localhost:3002/api/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const products = await Promise.all(
      cartResponse.data.items.map(async (item) => {
        const productResponse = await axios.get(
          `http://localhost:3001/api/products/${item.productId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        return productResponse.data.data;
      })
    );

    let priceAmount = 0;

    const orderItems = products.map((product) => {
      const item = cartResponse.data.items.find(
        (i) => i.productId === product._id
      );

      // if not in stock,does not allow order creation
      if (product.stock < item.quantity) {
        throw new Error(
          `Product ${product.title} is out of stock or insufficient stock`
        );
      }

      if (item) {
        priceAmount += product.price.amount * item.quantity;

        return {
          id: product._id,
          title: product.title,
          price: {
            amount: product.price.amount,
            currency: product.price.currency,
          },
          quantity: item.quantity,
        };
      }

      return null;
    });

    console.log("Price Amount:", priceAmount);
    console.log("Order Items:", orderItems);

    const order = await orderModel.create({
      user: user.id,
      items: orderItems,
      status: "PENDING",
      totalPrice: { amount: priceAmount, currency: "INR" },
      shippingAddress: req.body.shippingAddress,
    });

    res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

module.exports = { createOrder };
