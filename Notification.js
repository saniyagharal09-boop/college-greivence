const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  grievance: { type: mongoose.Schema.Types.ObjectId, ref: "Grievance", default: null },
  message: { type: String, required: true, maxlength: 500 },
  type: { type: String, enum: ["submitted", "assigned", "status", "escalation"], default: "status" },
  readAt: { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.model("Notification", notificationSchema);
