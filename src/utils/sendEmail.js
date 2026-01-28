const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text) => {
    console.log("🔍 DEBUG: Using Resend Key =",
         process.env.RESEND_API_KEY ? "LOADED" : "NOT LOADED");
  try {
    await resend.emails.send({
      from: "College Tracker <onboarding@resend.dev>",
      to,
      subject,
      text,
    });

    console.log("Resend Email Sent To:", to);
  } catch (error) {
    console.error("Resend Email Error:", error.message);
  }
};

module.exports = sendEmail;
