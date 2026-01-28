const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= STUDENT SELF REGISTER =================
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      isActive: true
    });

    res.status(201).json({
      message: "Student registered successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= ADMIN REGISTER STAFF =================
exports.registerStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const allowedRoles = [
      "clerk",
      "hod",
      "office",
      "accounts",
      "principal"
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (role === "admin") {
      return res.status(403).json({
      message: "Admin cannot be created"
    });
}


    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true
    });

    res.status(201).json({
      message: `${role} registered successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGIN (FINAL FIXED) =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // ❌ email exist na ho → generic message
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    // 🔒 DISABLED ACCOUNT CHECK (PASSWORD SE PEHLE)
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is disabled. Please contact admin."
      });
    }

    // 🔐 PASSWORD CHECK
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
