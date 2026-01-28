const jwt = require("jsonwebtoken");

// 1️⃣ AUTH MIDDLEWARE → Token verify karega
exports.authMiddleware = (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // Token format expected: "Bearer xxxxxxx"
    const actualToken = token.split(" ")[1];

    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    // decoded me id + role hota hai
    req.user = decoded; 
    next();

  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// 2️⃣ ROLE CHECK MIDDLEWARE → Sirf allowed roles ko access
exports.roleCheck = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }
    next();
  };
};
