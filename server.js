require("dotenv").config();   // LOAD .env

const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const testRoutes = require("./src/routes/testRoutes");
const requestRoutes = require("./src/routes/requestRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// DB CONNECT
connectDB();

// routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static("uploads"));



// test route
app.get("/", (req, res) => {
  res.send("College Tracker Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
