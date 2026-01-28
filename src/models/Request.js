const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  documentType: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    required: true
  },
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  currentStep: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Delayed", "Completed", "Rejected"],
    default: "Pending"
  },
  history: [
    {
      role: String,
      status: String,
      reason: String,
      actionDate: Date,
      deadline: Date,
      
    }
  ],
  submissionDate: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date
},
  issuedDocument: {
    type: String ,  // file path / URL
    default: null
},


  expectedCompletion: Date
});

module.exports = mongoose.model("Request", RequestSchema);
