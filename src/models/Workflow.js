const mongoose = require("mongoose");

const WorkflowSchema = new mongoose.Schema({
  documentType: {
    type: String,
    required: true
  },
  steps: {
    type: [String],
    required: true
  },
  maxDaysPerStep: {
    type: [Number],
    required: true
  }
});

module.exports = mongoose.model("Workflow", WorkflowSchema);
