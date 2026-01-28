//console.log("UPLOAD:", require("../middleware/upload"));
const express = require("express");
const router = express.Router();
const { authMiddleware, roleCheck } = require("../middleware/authMiddleware");

const {
  createRequest,
  getAssignedRequests,
  approveRequest,
  getMyRequests,
  rejectRequest,
  getRequestTimeline,
  getAllRequests,
  getDelayedRequests,
  uploadIssuedDocument  
} = require("../controllers/requestController");

const upload = require("../middleware/upload");


// Student → create request
router.post(
  "/",
  authMiddleware,
  roleCheck(["student"]),
  createRequest
);

// Student → My Requests
router.get(
  "/my",
  authMiddleware,
  roleCheck(["student"]),
  getMyRequests
);


// Clerk / HOD / Office → view requests
router.get(
  "/assigned",
  authMiddleware,
  roleCheck(["clerk", "hod", "office", "accounts", "principal"]),
  getAssignedRequests
);

router.patch(
  "/reject/:id",
  authMiddleware,
  roleCheck(["clerk", "hod", "office", "accounts", "principal"]),
  rejectRequest
);


// Approve & forward
router.patch(
  "/approve/:id",
  authMiddleware,
  roleCheck(["clerk", "hod", "office", "accounts", "principal"]),
  approveRequest
);

// Admin → delayed requests
router.get(
  "/delayed",
  authMiddleware,
  roleCheck(["admin"]),
  getDelayedRequests
);

// Student → Request timeline
router.get(
  "/timeline/:id",
  authMiddleware,
  roleCheck(["student"]),
  getRequestTimeline
);

// Admin → all requests
router.get(
  "/all",
  authMiddleware,
  roleCheck(["admin","office"]),
  getAllRequests
);



router.post(
  "/upload/:id",
  authMiddleware,
  roleCheck(["office"]),
  upload.single("document"),
  uploadIssuedDocument
);


module.exports = router;
