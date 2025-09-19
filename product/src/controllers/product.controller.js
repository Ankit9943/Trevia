const productModel = require("../models/product.model");
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

module.exports = { createProduct };
