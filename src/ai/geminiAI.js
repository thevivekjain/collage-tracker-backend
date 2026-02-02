const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// STATIC KNOWLEDGE BASE — College Tracker Project
const KNOWLEDGE = `
You are an AI assistant for a College Document Tracker System.
Use ONLY the following knowledge base to answer student or staff queries.

================ KNOWLEDGE BASE ================

1. Document Types:
- Bonafide
- Character Certificate
- Fee Receipt
- Transcript
- Migration Certificate
- Provisional Certificate

2. Workflow:
Student creates request →
Clerk verifies →
HOD approves →
Office generates document →
Principal approval (if required) →
Accounts clearance (if required) →
Office uploads final PDF →
Student downloads.

3. Status Meaning:
- Pending → request processing.
- Rejected → staff rejected due to some issue.
- Completed → PDF uploaded and ready to download.

4. Login System:
- Students are created by admin.
- Staff roles: clerk, hod, office, accounts, principal.
- JWT used for authentication.

5. Timelines (Maximum deadlines for each role):
- Clerk: 2 days
- HOD: 3 days
- Office: 1 day
- Accounts: 2 days
- Principal: 2 days

6. Office Upload:
- Office uploads final PDF via Cloudinary.
- After upload, student can download.

7. Rejection Reasons:
Wrong info, incorrect name, incomplete details, mismatched documents, invalid request, etc.

8. Common Student Questions (You must answer using knowledge base):
- “Bonafide kaise milega?”
- “Timeline kya hai?”
- “Approval kis kis role se hoga?”
- “Document kaha download hoga?”
- “Meri request stuck kyu hai?”
- “Rejected kyu hua?”
- “Office ne upload kab karega?”
- “HOD approve nhi karra?”

================================================
`;

async function askGemini(question) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview"
    //   model: "gemini-2.0-flash"
    });

    // Attach knowledge + user question
    const finalPrompt = `
${KNOWLEDGE}

Now answer this question strictly using the knowledge base:
"${question}"
`;

    const result = await model.generateContent(finalPrompt);
    const text = result.response.text();

    return text;
  } catch (err) {
    console.error("Gemini Error:", err);
    return "AI error, please try again.";
  }
}

module.exports = askGemini;
