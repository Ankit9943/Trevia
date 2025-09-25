const productModel = require("../models/product.model");
const mongoose = require("mongoose");
const { uploadImage } = require("../services/storage.service");

async function createProduct(req, res) {
  try {
    const { title, description, priceAmount, priceCurrency = "INR" } = req.body;

    if (!title || !priceAmount) {
      return res.status(400).json({
        message: "Title and Price Amount and seller are required",
      });
    }

    const seller = req.user.id; // Assuming req.user is set by auth middleware

    const price = {
      amount: Number(priceAmount),
      currency: priceCurrency,
    };

    const images = [];
    const files = await Promise.all(
      (req.files || []).map((file) => uploadImage({ buffer: file.buffer }))
    );

    const product = await productModel.create({
      title,
      description,
      price,
      seller,
      images: files,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  }
}

async function getProducts(req, res) {
  const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

  const filter = {};
  if (q) {
    filter.$text = { $search: q };
  }

  if (minprice) {
    filter["price.amount"] = {
      ...filter["price.amount"],
      $gte: Number(minprice),
    };
  }
  if (maxprice) {
    filter["price.amount"] = {
      ...filter["price.amount"],
      $lte: Number(maxprice),
    };
  }
  const products = await productModel
    .find(filter)
    .skip(Number(skip))
    .limit(Math.min(Number(limit), 20));

  return res.status(200).json({
    message: "Products fetched successfully",
    data: products,
  });
}

async function getProductById(req, res) {
  const { id } = req.params;

  try {
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ message: "Invalid product id" });
    }
    return res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const seller = req.user.id; // by auth middleware

    // Build update payload from allowed fields; map flat fields to nested price
    const update = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.description !== undefined)
      update.description = req.body.description;

    if (
      req.body.priceAmount !== undefined ||
      req.body.priceCurrency !== undefined
    ) {
      update.price = {};
      if (req.body.priceAmount !== undefined)
        update.price.amount = Number(req.body.priceAmount);
      if (req.body.priceCurrency !== undefined)
        update.price.currency = req.body.priceCurrency;
    }

    const updated = await productModel.findOneAndUpdate(
      { _id: id, seller },
      update,
      { new: true } // - > this make sure to get the new updated product not the older one
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product updated successfully",
      updatedProduct: updated,
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ message: "Invalid product id" });
    }
    return res.status(500).json({ message: error.message });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const seller = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const deleted = await productModel.findOneAndDelete({ _id: id, seller });

    if (!deleted || deleted.seller.toString() !== seller) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
      deletedProduct: deleted,
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ message: "Invalid product id" });
    }
    return res.status(500).json({ message: error.message });
  }
}

async function getSellerProducts(req, res) {
  try {
    const sellerId = req.user.id;

    const skip = Number(req.query.skip ?? 0);
    const limit = Math.min(Number(req.query.limit ?? 20), 20);

    const products = await productModel
      .find({ seller: sellerId })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({ data: products });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getSellerProducts,
};
