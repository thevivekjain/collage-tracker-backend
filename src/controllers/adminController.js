const Request = require("../models/Request");
const User = require("../models/User");

// 1️⃣ SUMMARY STATS
exports.getAdminSummary = async (req, res) => {
  try {
    const total = await Request.countDocuments();
    const completed = await Request.countDocuments({ status: "Completed" });
    const pending = await Request.countDocuments({ status: "Pending" });
    const delayed = await Request.countDocuments({ status: "Pending", deadline: { $lt: new Date() } });

    res.json({
      totalRequests: total,
      completed,
      pending,
      delayed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2️⃣ ROLE-WISE PENDING COUNT
exports.getPendingByRole = async (req, res) => {
  try {
    const roles = ["clerk", "hod", "accounts", "principal", "office"];
    const result = {};

    for (let role of roles) {
      result[role] = await Request.countDocuments({
        currentStep: role,
        status: "Pending"
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3️⃣ AVERAGE PROCESSING TIME (Completed only)
exports.getAverageProcessingTime = async (req, res) => {
  try {
    const completedRequests = await Request.find({ status: "Completed" });

    if (completedRequests.length === 0) {
      return res.json({ averageDays: 0 });
    }

    let totalDays = 0;

    completedRequests.forEach(reqst => {
      const start = reqst.submissionDate;
      const end = reqst.history[reqst.history.length - 1].actionDate;
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      totalDays += diffDays;
    });

    const avg = Math.round(totalDays / completedRequests.length);
    res.json({ averageDays: avg });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// DISABLE STAFF
exports.disableStaff = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === "admin") {
  return res.status(403).json({
    message: "Admin account cannot be modified"
  });
}


  user.isActive = false;
  await user.save();

  res.json({ message: "Staff disabled successfully" });
};

// ENABLE STAFF
exports.enableStaff = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === "admin") {
  return res.status(403).json({
    message: "Admin account cannot be modified"
  });
}


  user.isActive = true;
  await user.save();

  res.json({ message: "Staff enabled successfully" });
};

// ✅ GET ALL STAFF (excluding students)
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({
      role: { $in: ["clerk", "hod", "office", "accounts", "principal"] }
    }).select("-password");

    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET ALL STUDENTS =================
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("-password")
      .sort({ name: 1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= DISABLE STUDENT =================
exports.disableStudent = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user || user.role !== "student") {
    return res.status(404).json({ message: "Student not found" });
  }

  user.isActive = false;
  await user.save();

  res.json({ message: "Student disabled successfully" });
};

// ================= ENABLE STUDENT =================
exports.enableStudent = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user || user.role !== "student") {
    return res.status(404).json({ message: "Student not found" });
  }

  user.isActive = true;
  await user.save();

  res.json({ message: "Student enabled successfully" });
};


