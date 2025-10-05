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
          product: product._id,
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

async function getMyOrders(req, res) {
  const user = req.user;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * limit;

  try {
    const totalOrders = await orderModel.countDocuments({ user: user.id });
    const orders = await orderModel
      .find({ user: user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      data: orders,
      page,
      pageSize: limit,
      total: totalOrders,
      totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function getOrderById(req, res) {
  try {
    const user = req.user;
    const orderId = req.params.id;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const isOwner = order.user.toString() === user.id;
    const isAdmin = user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function cancelOrder(req, res) {
  try {
    const user = req.user;
    const orderId = req.params.id;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = order.user.toString() === user.id;
    const isAdmin = user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const cancellableStatuses = ["PENDING", "CONFIRMED"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    order.status = "CANCELLED";
    await order.save();

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function updateShippingAddress(req, res) {
  try {
    const user = req.user;
    const orderId = req.params.id;
    const { shippingAddress } = req.body || {};

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = order.user.toString() === user.id;
    const isAdmin = user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (["SHIPPED", "DELIVERED"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: "Order address cannot be updated" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: "shippingAddress is required" });
    }

    order.shippingAddress = shippingAddress;
    await order.save();

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateShippingAddress,
};
