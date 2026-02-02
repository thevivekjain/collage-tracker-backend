const express = require("express");
const router = express.Router();
const askGemini = require("../ai/geminiAI");

router.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question required" });
    }

    const answer = await askGemini(question);

    res.json({ answer });
  } catch (err) {
    console.error("AI Route Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;



// const express = require("express");
// const askAI = require("../ai/askAI");
// const router = express.Router();

// router.post("/ask", async (req, res) => {
//   try {
//     const { question } = req.body;
//     const answer = await askAI(question);
//     res.json({ answer });
//   } catch (err) {
//     res.json({ error: err.message });
//   }
// });
// router.get("/test",(req,res)=>{
//     res.send("ALL routes ok");
// });

// module.exports = router;
