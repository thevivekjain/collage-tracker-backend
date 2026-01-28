const express = require("express");
const router = express.Router();
const { authMiddleware, roleCheck } = require("../middleware/authMiddleware");
const sendEmail = require("../utils/sendEmail");

// Test token verify
router.get("/auth-test", authMiddleware, (req, res) => {
  res.json({ message: "Token valid", user: req.user });
});

// Test role check (sirf HOD ko access)
router.get("/hod-only", authMiddleware, roleCheck(["hod"]), (req, res) => {
  res.json({ message: "HOD access granted" });
});

router.get("/email-test", async (req, res) => {
  try {
    const response = await sendEmail(
      "vivekjain.patna@gmail.com",
      "Render Email Test",
      "Hello, this is a test email from Render."
    );
    res.json({ message: "Triggered" });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
