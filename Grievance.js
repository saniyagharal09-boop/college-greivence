const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  status: { type: String, enum: ["Submitted", "Pending", "Under Review", "Resolved", "Rejected"] },
  note: { type: String, trim: true, maxlength: 1000 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const grievanceSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  category: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  studentName: { type: String, default: "Anonymous" },
  anonymous: { type: Boolean, default: false },
  attachment: { type: String, default: "" },
  status: { type: String, enum: ["Submitted", "Pending", "Under Review", "Resolved", "Rejected"], default: "Submitted" },
  actionSummary: { type: String, default: "" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  history: { type: [historySchema], default: [] },
  dueAt: { type: Date, default: () => new Date(Date.now() + (Number(process.env.SLA_DAYS) || 5) * 86400000) },
  resolvedAt: { type: Date, default: null },
  escalatedAt: { type: Date, default: null }
}, { timestamps: true });

grievanceSchema.pre("validate", function(next) {
  if (!this.ticketId) {
    this.ticketId = `GRV-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model("Grievance", grievanceSchema);
