const express = require("express");
const router = express.Router();
const { authMiddleware, roleCheck } = require("../middleware/authMiddleware");

// Test token verify
router.get("/auth-test", authMiddleware, (req, res) => {
  res.json({ message: "Token valid", user: req.user });
});

// Test role check (sirf HOD ko access)
router.get("/hod-only", authMiddleware, roleCheck(["hod"]), (req, res) => {
  res.json({ message: "HOD access granted" });
});

module.exports = router;
