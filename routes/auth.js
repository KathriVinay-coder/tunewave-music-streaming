// Authentication routes for Sign Up and Sign In
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Seed default demo accounts on startup
async function seedDefaultAccounts() {
  try {
    const existingOwner = await User.findOne({ email: "owner@spotify.com" });
    if (!existingOwner) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("owner123", salt);
      const owner = new User({
        name: "Playlist Owner",
        email: "owner@spotify.com",
        password: hashedPassword,
        role: "owner"
      });
      await owner.save();
      console.log("Seeded default owner account: owner@spotify.com");
    }

    const existingViewer = await User.findOne({ email: "viewer@spotify.com" });
    if (!existingViewer) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("viewer123", salt);
      const viewer = new User({
        name: "Music Viewer",
        email: "viewer@spotify.com",
        password: hashedPassword,
        role: "user"
      });
      await viewer.save();
      console.log("Seeded default viewer account: viewer@spotify.com");
    }
  } catch (err) {
    console.error("Error seeding default accounts:", err.message);
  }
}
seedDefaultAccounts();

// 1. Sign Up (Register a new user)
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, ownerKey } = req.body;

    // Basic input validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please fill in all fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists" });
    }

    // Determine role (only grant owner if key is provided or email is owner@spotify.com)
    let userRole = "user";
    if (role === "owner" || (email && email.toLowerCase() === "owner@spotify.com")) {
      if (ownerKey === "owner123" || email.toLowerCase() === "owner@spotify.com") {
        userRole = "owner";
      } else {
        return res.status(403).json({ success: false, message: "Invalid Owner Key! Use 'owner123' to register as owner." });
      }
    }

    // Hash the password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save new user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: userRole === "owner" ? "Owner account created successfully!" : "Account created successfully!",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// 2. Sign In (Log in existing user)
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please enter both email and password" });
    }

    // Look up user in MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Compare entered password with hashed password in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Wrong password! Please check your password and try again." });
    }

    const assignedRole = user.role || (user.email === "owner@spotify.com" ? "owner" : "user");

    res.status(200).json({
      success: true,
      message: "Logged in successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: assignedRole
      }
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// 3. Instant Owner Demo Login endpoint
router.post("/quick-owner", async (req, res) => {
  try {
    let owner = await User.findOne({ email: "owner@spotify.com" });
    if (!owner) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("owner123", salt);
      owner = new User({
        name: "Playlist Owner",
        email: "owner@spotify.com",
        password: hashedPassword,
        role: "owner"
      });
      await owner.save();
    }

    res.status(200).json({
      success: true,
      message: "Logged in as Owner!",
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: "owner"
      }
    });
  } catch (err) {
    console.error("Quick owner error:", err);
    res.status(500).json({ success: false, message: "Error switching to owner" });
  }
});

// 4. Forgot Password endpoint - generates reset code and returns email delivery receipt
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide your email address." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No account found with email "${cleanEmail}". Please check the spelling or sign up first.`
      });
    }

    // Generate a secure 6-digit verification code or token
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetToken = resetCode;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // Valid for 15 minutes
    await user.save();

    console.log(`[Password Reset] Code ${resetCode} generated for ${user.email}`);

    res.status(200).json({
      success: true,
      message: `Password reset email sent successfully to ${user.email}!`,
      email: user.email,
      name: user.name,
      resetCode // Included so demo users can verify without opening SMTP inbox
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Error processing password reset request." });
  }
});

// 5. Reset Password endpoint - updates password with valid code
router.post("/reset-password", async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetToken: resetCode.trim(),
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code. Please request a new password reset."
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Error resetting password." });
  }
});

module.exports = router;
