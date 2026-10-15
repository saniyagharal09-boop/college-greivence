require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const Grievance = require("./models/Grievance");
const User = require("./models/User");
const Notification = require("./models/Notification");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "College Grievance Redressal System API" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/grievances", require("./routes/grievances"));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});
app.use(express.static(path.join(__dirname, "..")));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ message: "API route not found." });
  res.sendFile(path.join(__dirname, "..", "index.html"), err => err && next(err));
});

async function checkSlaEscalations() {
  try {
    const overdue = await Grievance.find({ status: { $nin: ["Resolved", "Rejected"] }, dueAt: { $lte: new Date() }, escalatedAt: null });
    if (!overdue.length) return;
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    for (const grievance of overdue) {
      grievance.escalatedAt = new Date();
      grievance.history.push({ status: grievance.status, note: `SLA deadline exceeded; escalated to administration. Current department: ${grievance.department}.` });
      await grievance.save();
      if (admins.length) await Notification.insertMany(admins.map(a => ({ recipient: a._id, grievance: grievance._id, type: "escalation", message: `SLA escalation: ${grievance.ticketId} (${grievance.title}) is overdue.` })));
    }
    console.log(`SLA monitor escalated ${overdue.length} overdue grievance(s).`);
  } catch (err) { console.error("SLA monitor error:", err.message); }
}

connectDB().then(() => {
  app.listen(PORT, () => console.log(`College Grievance System running at http://localhost:${PORT}`));
  checkSlaEscalations();
  setInterval(checkSlaEscalations, 30 * 60 * 1000);
}).catch(err => {
  console.error("MongoDB connection failed:", err.message);
  console.error("Check Backend/.env and make sure MongoDB is running/reachable.");
  process.exit(1);
});
