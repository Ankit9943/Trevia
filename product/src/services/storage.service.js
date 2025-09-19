const { urlencoded } = require("express");
const ImageKit = require("imagekit");
const uniqid = require("uniqid");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const uploadImage = async (file) => {
  try {
    const response = await imagekit.upload({
      file: file.buffer,
      fileName: uniqid(),
      folder: "/products",
    });
    return {
      url: response.url,
      thumbnail: response.thumbnailUrl || response.url,
      fileId: response.fileId,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

module.exports = { uploadImage };
