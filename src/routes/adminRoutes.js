const express = require("express");
const router = express.Router();
const { authMiddleware, roleCheck } = require("../middleware/authMiddleware");
const { 
  getAllStaff,
  disableStaff, 
  enableStaff,
  getAdminSummary,
  getPendingByRole,
  getAverageProcessingTime,
  getAllStudents,
  disableStudent,
  enableStudent
 } = require("../controllers/adminController");


router.get(
  "/summary",
  authMiddleware,
  roleCheck(["admin"]),
  getAdminSummary
);


router.get(
  "/pending-by-role",
  authMiddleware,
  roleCheck(["admin"]),
  getPendingByRole
);

// Avg processing time
router.get(
  "/avg-processing-time",
  authMiddleware,
  roleCheck(["admin"]),
  getAverageProcessingTime
);

router.patch(
  "/disable/:id",
  authMiddleware,
  roleCheck(["admin"]),
  disableStaff
);

router.patch(
  "/enable/:id",
  authMiddleware,
  roleCheck(["admin"]),
  enableStaff
);



router.get(
  "/staffs",
  authMiddleware,
  roleCheck(["admin"]),
  getAllStaff
);

// ================= STUDENT MANAGEMENT =================
router.get(
  "/students",
  authMiddleware,
  roleCheck(["admin"]),
  getAllStudents
);

router.patch(
  "/student/disable/:id",
  authMiddleware,
  roleCheck(["admin"]),
  disableStudent
);

router.patch(
  "/student/enable/:id",
  authMiddleware,
  roleCheck(["admin"]),
  enableStudent
);




module.exports = router;
