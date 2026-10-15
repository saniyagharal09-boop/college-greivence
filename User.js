const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  studentId: { type: String, trim: true, sparse: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  department: { type: String, default: "Other", trim: true },
  year: { type: String, default: "" },
  role: { type: String, enum: ["student", "faculty", "admin"], default: "student" },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
