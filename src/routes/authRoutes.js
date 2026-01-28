const express = require("express");
const router = express.Router();
const { login, registerStudent, registerStaff } = require("../controllers/authController");
const { authMiddleware, roleCheck } = require("../middleware/authMiddleware");

router.post("/login", login);

// ✅ Student self-register
router.post("/register", registerStudent);

// ✅ Admin registers staff
router.post(
  "/register-staff",
  authMiddleware,
  roleCheck(["admin"]),
  registerStaff
);

module.exports = router;
