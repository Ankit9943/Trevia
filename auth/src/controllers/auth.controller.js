const userModel = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const redis = require("../db/redis");

// POST /auth/register
async function registerUser(req, res) {
  try {
    const {
      username,
      email,
      password,
      fullName: { firstName, lastName },
      role,
    } = req.body;

    //   console.log("Register payload:", req.body);

    const isUserAlreadyExists = await userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (isUserAlreadyExists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
      fullName: { firstName, lastName },
      role: role || "user",
    });

    // save info to token

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // ✅ Convert to plain object & strip password
    // const userObj = user.toObject();
    // delete userObj.password;

    // ✅ Send response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// POST /auth/login
async function loginUser(req, res) {
  try {
    const { username, email, password } = req.body;

    const user = await userModel
      .findOne({ $or: [{ email }, { username }] })
      .select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password || "");
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Logged in successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /auth/me
async function getCurrentUser(req, res) {
  return res.status(200).json({
    message: "Current user fetched successfully",
    user: req.user,
  });
}

// GET /auth/logout
async function logoutUser(req, res) {
  const token = req.cookies.token;

  if (token) {
    // Blacklist the token in Redis (non-blocking; ignore failures in tests/dev)
    try {
      // Don't await to avoid hanging if Redis is unavailable
      redis
        .set(`blacklist_${token}`, "true", "EX", 24 * 60 * 60)
        .catch(() => {});
    } catch (_) {
      // ignore
    }
  }
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(200).json({ message: "Logged out successfully" });
}

// Address handlers
async function getUserAddresses(req, res) {
  try {
    const id = req.user.id;
    const user = await userModel.findById(id).select("addresses");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      addresses: user.addresses || [], // ensure always []
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

async function addUserAddress(req, res) {
  try {
    const id = req.user.id;
    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { street, city, state, country, pincode, phone, isDefault } =
      req.body;
    const errors = [];

    // ✅ Validation
    if (!/^\d{6}$/.test(pincode)) {
      errors.push({
        msg: "Invalid pincode (must be 6 digits)",
        path: "pincode",
      });
    }
    if (!/^\d{10}$/.test(phone)) {
      errors.push({ msg: "Invalid phone (must be 10 digits)", path: "phone" });
    }
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    let newAddress = {
      street,
      city,
      state,
      country,
      pincode,
      phone,
      isDefault,
    };

    // ✅ First address → auto default
    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    // ✅ Switching default → reset others
    if (newAddress.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    user.addresses.push(newAddress);
    await user.save();

    return res.status(201).json({
      address: user.addresses[user.addresses.length - 1],
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

// removed placeholder
async function deleteAddress(req, res) {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const idx = user.addresses.findIndex((a) => a._id.toString() === addressId);
    if (idx === -1) {
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = !!user.addresses[idx].isDefault;
    user.addresses.splice(idx, 1);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses.forEach((a, i) => (a.isDefault = i === 0));
    }

    await user.save();

    return res.status(200).json({ message: "Address deleted" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getUserAddresses,
  addUserAddress,
  deleteAddress,
};
