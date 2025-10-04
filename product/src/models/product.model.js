const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ["USD", "INR"],
      default: "INR",
    },
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  images: [
    {
      url: {
        type: String,
      },
      thumbnail: {
        type: String,
      },
      id: {
        type: String,
      },
    },
  ],
  stock: {
    type: Number,
    default: 0,
  },
});

productSchema.index({ title: "text", description: "text" });
module.exports = mongoose.model("product", productSchema);
