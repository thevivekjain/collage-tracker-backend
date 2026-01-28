const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");

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