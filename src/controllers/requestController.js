const Request = require("../models/Request");
const User = require("../models/User");

const workflowMap = require("../utils/workflowMap");
const delayRules = require("../utils/delayRules");
const sendEmail = require("../utils/sendEmail");
const uploadToCloudinary = require("../utils/cloudinary");

// ================= STUDENT → CREATE REQUEST =================
exports.createRequest = async (req, res) => {
  try {
    const { documentType, purpose } = req.body;

    if (!documentType || !purpose) {
      return res.status(400).json({ message: "All fields required" });
    }

    const requestId = `REQ-${Date.now()}`;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + delayRules["clerk"]);

    const newRequest = await Request.create({
      studentId: req.user.id,
      documentType,
      purpose,
      requestId,
      currentStep: "clerk",
      status: "Pending",
      deadline,
      history: [
        {
          role: "student",
          status: "Submitted",
          actionDate: new Date()
        }
      ]
    });

    const student = await User.findById(req.user.id);

    sendEmail(
      student.email,
      "Request Submitted",
      `Your ${documentType} request (${requestId}) has been submitted successfully.`
    ).catch(err => console.error("Email error:", err.message));

    res.status(201).json({
      message: "Request submitted successfully",
      request: newRequest
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= STAFF → ASSIGNED REQUESTS =================
exports.getAssignedRequests = async (req, res) => {
  try {
    const role = req.user.role;

    const requests = await Request.find({ currentStep: role })
      .populate("studentId", "name email")
      .sort({ submissionDate: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= STAFF → REJECT REQUEST =================
exports.rejectRequest = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Rejection reason required" });
    }

    const request = await Request.findById(req.params.id)
      .populate("studentId", "email");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "Rejected";
    request.currentStep = "rejected";
    request.deadline = null;

    request.history.push({
      role: req.user.role,
      status: "Rejected",
      reason,
      actionDate: new Date()
    });

    await request.save();

    if (request.studentId?.email) {
      sendEmail(
        request.studentId.email,
        "Request Rejected",
        `Your request ${request.requestId} was rejected.\nReason: ${reason}`
      ).catch(err => console.error("Email error:", err.message));
    }

    res.json({ message: "Request rejected successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= STAFF → APPROVE & AUTO-FORWARD =================
exports.approveRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("studentId", "name email");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status === "Completed") {
      return res.status(400).json({ message: "Request already completed" });
    }

    const workflow = workflowMap[request.documentType];
    if (!workflow) {
      return res.status(400).json({ message: "Workflow not defined" });
    }

    const currentIndex = workflow.indexOf(request.currentStep);

    request.history.push({
      role: req.user.role,
      status: "Approved",
      actionDate: new Date()
    });

    if (currentIndex === workflow.length - 1) {
      request.status = "Completed";
      request.currentStep = "completed";
      request.deadline = null;

      sendEmail(
        request.studentId.email,
        "Request Completed",
        `Your ${request.documentType} request (${request.requestId}) has been completed.`
      ).catch(err => console.error("Email error:", err.message));

    } else {
      const nextRole = workflow[currentIndex + 1];
      request.currentStep = nextRole;

      const nextDeadline = new Date();
      nextDeadline.setDate(nextDeadline.getDate() + delayRules[nextRole]);
      request.deadline = nextDeadline;

      sendEmail(
        request.studentId.email,
        "Request Status Updated",
        `Your request ${request.requestId} has been approved by ${req.user.role}.
Current step: ${nextRole}`
      ).catch(err => console.error("Email error:", err.message));
    }

    await request.save();

    res.json({
      message: "Request processed successfully",
      currentStep: request.currentStep,
      status: request.status
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= STUDENT → MY REQUESTS =================
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({ studentId: req.user.id })
      .sort({ submissionDate: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= ADMIN → DELAYED REQUESTS =================
exports.getDelayedRequests = async (req, res) => {
  try {
    const now = new Date();

    const delayed = await Request.find({
      deadline: { $lt: now },
      status: "Pending"
    }).populate("studentId", "name email");

    res.json(delayed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= ADMIN / OFFICE → ALL REQUESTS 
exports.getAllRequests = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "office") query = { status: "Completed" };
    if (req.user.role === "admin") query = {};

    const requests = await Request.find(query)
      .populate("studentId", "name email")
      .sort({ submissionDate: -1 });

    res.json(requests);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= STUDENT → REQUEST TIMELINE =================
exports.getRequestTimeline = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("studentId", "name email");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({
      requestId: request.requestId,
      documentType: request.documentType,
      status: request.status,
      currentStep: request.currentStep,
      deadline: request.deadline,
      history: request.history
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= OFFICE → UPLOAD ISSUED DOCUMENT (CLOUDINARY) =================
exports.uploadIssuedDocument = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("studentId", "name email");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (req.user.role !== "office") {
      return res.status(403).json({ message: "Only office can upload document" });
    }

    if (request.currentStep !== "office") {
      return res.status(400).json({ message: "Request not at office step" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    // ✅ CORRECT Cloudinary upload
    const result = await uploadToCloudinary(req.file.buffer);

    request.issuedDocument = result.secure_url;
    request.status = "Completed";
    request.currentStep = "archived";
    request.deadline = null;

    request.history.push({
      role: "office",
      status: "Document Uploaded",
      actionDate: new Date()
    });

    await request.save();

    sendEmail(
      request.studentId.email,
      "Document Uploaded",
      `Hello ${request.studentId.name},

Your requested document has been uploaded.
Please login to download it.

College Tracker`
    ).catch(err => console.error("Email error:", err.message));

    res.json({
      message: "Document uploaded successfully",
      file: request.issuedDocument
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// const Request = require("../models/Request");
// const User = require("../models/User");

// const workflowMap = require("../utils/workflowMap");
// const delayRules = require("../utils/delayRules");
// const sendEmail = require("../utils/sendEmail");
// const cloudinary = require("../utils/cloudinary"); 


// // ================= STUDENT → CREATE REQUEST =================
// exports.createRequest = async (req, res) => {
//   try {
//     const { documentType, purpose } = req.body;

//     if (!documentType || !purpose) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     const requestId = `REQ-${Date.now()}`;

//     const deadline = new Date();
//     deadline.setDate(deadline.getDate() + delayRules["clerk"]);

//     const newRequest = await Request.create({
//       studentId: req.user.id,
//       documentType,
//       purpose,
//       requestId,
//       currentStep: "clerk",
//       status: "Pending",
//       deadline,
//       history: [
//         {
//           role: "student",
//           status: "Submitted",
//           actionDate: new Date()
//         }
//       ]
//     });

//     const student = await User.findById(req.user.id);

//     // ✅ NON-BLOCKING EMAIL
//     try {
//       sendEmail(
//         student.email,
//         "Request Submitted",
//         `Your ${documentType} request (${requestId}) has been submitted successfully.`
//       );
//     } catch (err) {
//       console.error("Email failed:", err.message);
//     }

//     res.status(201).json({
//       message: "Request submitted successfully",
//       request: newRequest
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= STAFF → ASSIGNED REQUESTS =================
// exports.getAssignedRequests = async (req, res) => {
//   try {
//     const role = req.user.role;

//     const requests = await Request.find({ currentStep: role })
//       .populate("studentId", "name email")
//       .sort({ submissionDate: -1 });

//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= STAFF → REJECT REQUEST =================
// exports.rejectRequest = async (req, res) => {
//   try {
//     const { reason } = req.body;

//     if (!reason || !reason.trim()) {
//       return res.status(400).json({ message: "Rejection reason required" });
//     }

//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     request.status = "Rejected";
//     request.currentStep = "rejected";
//     request.deadline = null;

//     request.history.push({
//       role: req.user.role,
//       status: "Rejected",
//       reason,
//       actionDate: new Date()
//     });

//     await request.save();

//     // ✅ NON-BLOCKING EMAIL
//     try {
//       if (request.studentId?.email) {
//         sendEmail(
//           request.studentId.email,
//           "Request Rejected",
//           `Your request ${request.requestId} was rejected.\nReason: ${reason}`
//         );
//       }
//     } catch (err) {
//       console.error("Email failed:", err.message);
//     }

//     res.json({ message: "Request rejected successfully" });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= STAFF → APPROVE & AUTO-FORWARD =================
// exports.approveRequest = async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "name email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     if (request.status === "Completed") {
//       return res.status(400).json({ message: "Request already completed" });
//     }

//     const workflow = workflowMap[request.documentType];
//     if (!workflow) {
//       return res.status(400).json({ message: "Workflow not defined" });
//     }

//     const currentIndex = workflow.indexOf(request.currentStep);

//     request.history.push({
//       role: req.user.role,
//       status: "Approved",
//       actionDate: new Date()
//     });

//     if (currentIndex === workflow.length - 1) {
//       request.status = "Completed";
//       request.currentStep = "completed";
//       request.deadline = null;

//       // ✅ NON-BLOCKING EMAIL
//       try {
//         sendEmail(
//           request.studentId.email,
//           "Request Completed",
//           `Your ${request.documentType} request (${request.requestId}) has been completed.`
//         );
//       } catch (err) {
//         console.error("Email failed:", err.message);
//       }

//     } else {
//       const nextRole = workflow[currentIndex + 1];
//       request.currentStep = nextRole;

//       const nextDeadline = new Date();
//       nextDeadline.setDate(nextDeadline.getDate() + delayRules[nextRole]);
//       request.deadline = nextDeadline;

//       // ✅ NON-BLOCKING EMAIL
//       try {
//         sendEmail(
//           request.studentId.email,
//           "Request Status Updated",
//           `Your request ${request.requestId} has been approved by ${req.user.role}.
// Current step: ${nextRole}`
//         );
//       } catch (err) {
//         console.error("Email failed:", err.message);
//       }
//     }

//     await request.save();

//     res.json({
//       message: "Request processed successfully",
//       currentStep: request.currentStep,
//       status: request.status
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= STUDENT → MY REQUESTS =================
// exports.getMyRequests = async (req, res) => {
//   try {
//     const requests = await Request.find({ studentId: req.user.id })
//       .sort({ submissionDate: -1 });

//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= ADMIN → DELAYED REQUESTS =================
// exports.getDelayedRequests = async (req, res) => {
//   try {
//     const now = new Date();

//     const delayed = await Request.find({
//       deadline: { $lt: now },
//       status: "Pending"
//     }).populate("studentId", "name email");

//     res.json(delayed);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= ADMIN / OFFICE → ALL REQUESTS =================
// exports.getAllRequests = async (req, res) => {
//   try {
//     let query = {};

//     if (req.user.role === "office") {
//       query = { status: "Completed" };
//     }

//     if (req.user.role === "admin") {
//       query = {};
//     }

//     const requests = await Request.find(query)
//       .populate("studentId", "name email")
//       .sort({ submissionDate: -1 });

//     res.json(requests);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= STUDENT → REQUEST TIMELINE =================
// exports.getRequestTimeline = async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "name email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     if (request.studentId._id.toString() !== req.user.id) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     res.json({
//       requestId: request.requestId,
//       documentType: request.documentType,
//       status: request.status,
//       currentStep: request.currentStep,
//       deadline: request.deadline,
//       history: request.history
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= OFFICE → UPLOAD ISSUED DOCUMENT (CLOUDINARY) =================


// exports.uploadIssuedDocument = async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "name email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     if (req.user.role !== "office") {
//       return res.status(403).json({ message: "Only office can upload document" });
//     }

//     if (request.currentStep !== "office") {
//       return res.status(400).json({ message: "Request not at office step" });
//     }

//     if (!req.file) {
//       return res.status(400).json({ message: "PDF file is required" });
//     }

//     // ⬆️ Upload PDF to Cloudinary
//     const result = await cloudinary.uploader.upload(
//       `data:application/pdf;base64,${req.file.buffer.toString("base64")}`,
//       {
//         folder: "college-tracker/documents",
//         resource_type: "raw"
//       }
//     );

//     // ✅ Save Cloudinary URL instead of local path
//     request.issuedDocument = result.secure_url;
//     request.status = "Completed";
//     request.currentStep = "archived";
//     request.deadline = null;

//     request.history.push({
//       role: "office",
//       status: "Document Uploaded",
//       actionDate: new Date()
//     });

//     await request.save();

//     // ✅ NON-BLOCKING EMAIL
//     try {
//       sendEmail(
//         request.studentId.email,
//         "Document Uploaded",
//         `Hello ${request.studentId.name},

// Your requested document has been uploaded.
// Please login to download it.

// College Tracker`
//       );
//     } catch (err) {
//       console.error("Email failed:", err.message);
//     }

//     res.json({
//       message: "Document uploaded successfully",
//       file: request.issuedDocument
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// const Request = require("../models/Request");
// const User = require("../models/User");

// const workflowMap = require("../utils/workflowMap");
// const delayRules = require("../utils/delayRules");
// const sendEmail = require("../utils/sendEmail");

// // ================= STUDENT → CREATE REQUEST =================
// exports.createRequest = async (req, res) => {
//   try {
//     const { documentType, purpose } = req.body;

//     if (!documentType || !purpose) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     const requestId = `REQ-${Date.now()}`;

//     const deadline = new Date();
//     deadline.setDate(deadline.getDate() + delayRules["clerk"]);

//     const newRequest = await Request.create({
//       studentId: req.user.id,
//       documentType,
//       purpose,
//       requestId,
//       currentStep: "clerk",
//       status: "Pending",
//       deadline,
//       history: [
//         {
//           role: "student",
//           status: "Submitted",
//           actionDate: new Date()
//         }
//       ]
//     });

//     // ✅ CORRECT EMAIL LOGIC
//     const student = await User.findById(req.user.id);

//     await sendEmail(
//       student.email,
//       "Request Submitted",
//       `Your ${documentType} request (${requestId}) has been submitted successfully.`
//     );

//     res.status(201).json({
//       message: "Request submitted successfully",
//       request: newRequest
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getAssignedRequests = async (req, res) => {
//   try {
//     const role = req.user.role;

//     const requests = await Request.find({
//       currentStep: role
//     })
//       .populate("studentId", "name email")
//       .sort({ submissionDate: -1 });

//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// // ================= STAFF → REJECT REQUEST =================
// exports.rejectRequest = async (req, res) => {
//   try {
//     console.log("REJECT ID:", req.params.id);
//     console.log("REJECT REASON:", req.body.reason);

//     const { reason } = req.body;

//     if (!reason || !reason.trim()) {
//       return res.status(400).json({ message: "Rejection reason required" });
//     }

//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     request.status = "Rejected";
//     request.currentStep = "rejected";
//     request.deadline = null;

//     request.history.push({
//       role: req.user.role,
//       status: "Rejected",
//       reason,
//       actionDate: new Date()
//     });

//     await request.save();

//     // ✅ SAFE EMAIL SEND
//     if (request.studentId?.email) {
//       await sendEmail(
//         request.studentId.email,
//         "Request Rejected",
//         `Your request ${request.requestId} was rejected.\nReason: ${reason}`
//       );
//     }

//     res.json({ message: "Request rejected successfully" });

//   } catch (error) {
//     console.error("REJECT ERROR:", error);
//     res.status(500).json({ message: error.message });
//   }
// };


// // ================= STAFF → APPROVE & AUTO-FORWARD =================
// exports.approveRequest = async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "name email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     // Guard → already completed
//     if (request.status === "Completed") {
//       return res.status(400).json({ message: "Request already completed" });
//     }

//     const workflow = workflowMap[request.documentType];
//     if (!workflow) {
//       return res.status(400).json({ message: "Workflow not defined" });
//     }

//     const currentIndex = workflow.indexOf(request.currentStep);

//     request.history.push({
//       role: req.user.role,
//       status: "Approved",
//       actionDate: new Date()
//     });

//     // Final step
//     if (currentIndex === workflow.length - 1) {
//       request.status = "Completed";
//       request.currentStep = "completed";
//       request.deadline = null;

//       // Email → completed
//       await sendEmail(
//         request.studentId.email,
//         "Request Completed",
//         `Your ${request.documentType} request (${request.requestId}) has been completed.`
//       );
//     } else {
//       const nextRole = workflow[currentIndex + 1];
//       request.currentStep = nextRole;

//       const nextDeadline = new Date();
//       nextDeadline.setDate(
//         nextDeadline.getDate() + delayRules[nextRole]
//       );
//       request.deadline = nextDeadline;

//       // Email → status update
//       await sendEmail(
//         request.studentId.email,
//         "Request Status Updated",
//         `Your request ${request.requestId} has been approved by ${req.user.role}.
// Current step: ${nextRole}`
//       );
//     }

//     await request.save();

//     res.json({
//       message: "Request processed successfully",
//       currentStep: request.currentStep,
//       status: request.status
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= STUDENT → MY REQUESTS =================
// exports.getMyRequests = async (req, res) => {
//   try {
//     const requests = await Request.find({ studentId: req.user.id })
//       .sort({ submissionDate: -1 });

//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= ADMIN → DELAYED REQUESTS =================
// exports.getDelayedRequests = async (req, res) => {
//   try {
//     const now = new Date();

//     const delayed = await Request.find({
//       deadline: { $lt: now },
//       status: "Pending"
//     }).populate("studentId", "name email");

//     res.json(delayed);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ================= ADMIN → ALL REQUESTS =================
// // ================= ADMIN / OFFICE → ALL REQUESTS =================
// exports.getAllRequests = async (req, res) => {
//   try {
//     let query = {};

//     // ✅ OFFICE → sirf completed requests
//     if (req.user.role === "office") {
//       query = { status: "Completed" };
//     }

//     // ✅ ADMIN → sab requests
//     if (req.user.role === "admin") {
//       query = {};
//     }

//     const requests = await Request.find(query)
//       .populate("studentId", "name email")
//       .sort({ submissionDate: -1 });

//     res.json(requests);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// // ================= STUDENT → REQUEST TIMELINE =================
// exports.getRequestTimeline = async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "name email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     if (request.studentId._id.toString() !== req.user.id) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     res.json({
//       requestId: request.requestId,
//       documentType: request.documentType,
//       status: request.status,
//       currentStep: request.currentStep,
//       deadline: request.deadline,
//       history: request.history
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// exports.uploadIssuedDocument = async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("studentId", "name email");

//     if (!request) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     // ✅ Only office can upload
//     if (req.user.role !== "office") {
//       return res.status(403).json({
//         message: "Only office can upload document"
//       });
//     }

//     // ✅ Must be at office step
//     if (request.currentStep !== "office") {
//       return res.status(400).json({
//         message: "Request not at office step"
//       });
//     }

//     // ✅ File check (IMPORTANT)
//     if (!req.file) {
//       return res.status(400).json({
//         message: "PDF file is required"
//       });
//     }

//     // ✅ Save file path
//     request.issuedDocument = req.file.path;

//     // ✅ Mark completed AFTER upload
//     request.status = "Completed";
//     request.currentStep = "archived";
//     request.deadline = null;

//     request.history.push({
//       role: "office",
//       status: "Document Uploaded",
//       actionDate: new Date()
//     });

//     await request.save();

//     // 📧 EMAIL NOTIFICATION TO STUDENT
//     await sendEmail(
//       request.studentId.email,
//       "Document Uploaded",
//       `Hello ${request.studentId.name},

// Your requested document has been uploaded to your College Tracker account.

// You can now login and download it from the "My Requests" section.

// Thank you,
// College Tracker`
//     );

//     res.json({
//       message: "Document uploaded successfully & student notified",
//       file: request.issuedDocument
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




