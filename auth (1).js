const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const router = express.Router();

const publicUser = user => ({
  id: user._id, name: user.name, email: user.email, role: user.role,
  department: user.department, year: user.year, studentId: user.studentId || ""
});

router.post("/register", async (req, res) => {
  try {
    const { name, studentId, email, password, department, year } = req.body;
    if (!name || !studentId || !email || !password || !department || !year)
      return res.status(400).json({ message: "Please complete all registration fields." });
    if (String(password).length < 8)
      return res.status(400).json({ message: "Password must contain at least 8 characters." });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.findOne({ $or: [{ email: normalizedEmail }, { studentId: String(studentId).trim() }] }))
      return res.status(409).json({ message: "Email or Student ID is already registered." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, studentId, email: normalizedEmail, passwordHash, department, year, role: "student" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.status(201).json({ message: "Account created successfully.", token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Could not register the account.", detail: err.code === 11000 ? "Email or Student ID already exists." : undefined });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !["student", "faculty", "admin"].includes(role))
      return res.status(400).json({ message: "Email, password and a valid role are required." });
    const user = await User.findOne({ email: String(email).trim().toLowerCase(), role }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: "Invalid email, password or selected role." });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ message: "Login successful.", token, user: publicUser(user) });
  } catch {
    res.status(500).json({ message: "Unable to log in right now." });
  }
});

router.get("/me", protect, (req, res) => res.json({ user: publicUser(req.user) }));
module.exports = router;
