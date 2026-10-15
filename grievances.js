const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Grievance = require("../models/Grievance");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect, allowRoles } = require("../middleware/auth");
const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG or PDF attachments are allowed."), ok);
  }
});

function detectDepartment(category, title, description) {
  const text = `${category} ${title} ${description}`.toLowerCase();
  if (/wi.?fi|internet|computer|ip address|network|it support/.test(text)) return "IT Department";
  if (/exam|timetable|marks|result|hall ticket/.test(text)) return "Examination Department";
  if (/fee|fees|receipt|scholarship|account/.test(text)) return "Accounts Department";
  if (/hostel|room|warden/.test(text)) return "Hostel Administration";
  if (/fan|light|water|building|classroom|bench|infrastructure|maintenance|clean/.test(text)) return "Maintenance";
  if (/academic|teacher|lecture|syllabus|class/.test(text)) return "Academic Department";
  return "Administration";
}
router.use(protect);

router.post("/", allowRoles("student"), (req, res, next) => {
  upload.single("attachment")(req, res, err => err ? res.status(400).json({ message: err.message }) : next());
}, async (req, res) => {
  try {
    const { title, description, category, department, anonymous } = req.body;
    if (!title || !description || !category)
      return res.status(400).json({ message: "Title, description and category are required." });
    const isAnonymous = String(anonymous) === "true";
    const assignedDepartment = department && department !== "Auto-assign based on category"
      ? department : detectDepartment(category, title, description);
    const grievance = await Grievance.create({
      title, description, category, department: assignedDepartment,
      student: req.user._id,
      studentName: isAnonymous ? "Anonymous" : req.user.name,
      anonymous: isAnonymous,
      attachment: req.file ? `/api/grievances/files/${path.basename(req.file.filename)}` : "",
      status: "Submitted",
      history: [{ status: "Submitted", note: "Grievance submitted", changedBy: req.user._id }]
    });
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    if (admins.length) await Notification.insertMany(admins.map(a => ({ recipient: a._id, grievance: grievance._id, type: "submitted", message: `New grievance ${grievance.ticketId} submitted: ${grievance.title}` })));
    res.status(201).json({ message: "Grievance submitted successfully.", grievance });
  } catch (err) { res.status(500).json({ message: "Could not save grievance." }); }
});

router.get("/mine", allowRoles("student"), async (req, res) => {
  const items = await Grievance.find({ student: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ grievances: items });
});
router.get("/files/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const item = await Grievance.findOne({ attachment: `/api/grievances/files/${filename}` }).select("student anonymous");
  if (!item) return res.status(404).json({ message: "Attachment not found." });
  if (req.user.role === "student" && String(item.student) !== String(req.user._id) && !item.anonymous)
    return res.status(403).json({ message: "Not allowed to view this attachment." });
  res.sendFile(path.join(uploadDir, filename));
});
router.get("/faculty", allowRoles("admin"), async (req, res) => {
  const { department } = req.query;
  const filter = { role: "faculty" };
  if (department) filter.department = department;
  const faculty = await User.find(filter).select("name email department").sort({ department: 1, name: 1 }).lean();
  res.json({ faculty });
});

router.get("/", allowRoles("faculty", "admin"), async (req, res) => {
  const filter = req.user.role === "faculty"
    ? { department: req.user.department, $or: [{ assignedTo: req.user._id }, { assignedTo: null }] }
    : {};
  const items = await Grievance.find(filter).sort({ createdAt: -1 }).populate("assignedTo", "name email").lean();
  res.json({ grievances: items });
});

router.patch("/:id/assign", allowRoles("admin"), async (req, res) => {
  try {
    const { department, facultyId } = req.body;
    if (!department || typeof department !== "string")
      return res.status(400).json({ message: "Please select a department." });
    const item = await Grievance.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Grievance not found." });
    let faculty = null;
    if (facultyId) {
      faculty = await User.findOne({ _id: facultyId, role: "faculty", department });
      if (!faculty) return res.status(400).json({ message: "Select a faculty member from the selected department." });
    }
    item.department = department;
    item.assignedTo = faculty ? faculty._id : null;
    if (item.status === "Submitted") item.status = "Pending";
    item.history.push({ status: item.status, note: faculty ? `Assigned to ${faculty.name} (${department})` : `Assigned to ${department}`, changedBy: req.user._id });
    await item.save();
    if (faculty) await Notification.create({ recipient: faculty._id, grievance: item._id, type: "assigned", message: `Grievance ${item.ticketId} assigned to you: ${item.title}` });
    if (item.student) await Notification.create({ recipient: item.student, grievance: item._id, type: "assigned", message: `Your grievance ${item.ticketId} was routed to ${department}.` });
    res.json({ message: "Grievance assigned successfully.", grievance: item });
  } catch (err) {
    res.status(500).json({ message: "Could not assign grievance." });
  }
});
router.patch("/:id/status", allowRoles("faculty", "admin"), async (req, res) => {
  try {
    const { status, actionSummary } = req.body;
    if (!["Pending", "Under Review", "Resolved", "Rejected"].includes(status))
      return res.status(400).json({ message: "Invalid grievance status." });
    const filter = { _id: req.params.id };
    if (req.user.role === "faculty") {
      filter.department = req.user.department;
      filter.$or = [{ assignedTo: req.user._id }, { assignedTo: null }];
    }
    const item = await Grievance.findOne(filter);
    if (!item) return res.status(404).json({ message: "Grievance not found in your assigned department queue." });
    item.status = status;
    item.actionSummary = String(actionSummary || "").slice(0, 1000);
    if (status === "Resolved") item.resolvedAt = new Date();
    item.history.push({ status, note: item.actionSummary || `Status changed to ${status}`, changedBy: req.user._id });
    await item.save();
    if (item.student) await Notification.create({ recipient: item.student, grievance: item._id, type: "status", message: `Your grievance ${item.ticketId} status is now ${status}${item.actionSummary ? `: ${item.actionSummary}` : "."}` });
    res.json({ message: "Grievance updated.", grievance: item });
  } catch { res.status(500).json({ message: "Could not update grievance." }); }
});
router.get("/notifications", async (req, res) => {
  try {
    const items = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    res.json({ notifications: items, unread: items.filter(n => !n.readAt).length });
  } catch { res.status(500).json({ message: "Could not load notifications." }); }
});
router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { readAt: new Date() }, { new: true });
    if (!item) return res.status(404).json({ message: "Notification not found." });
    res.json({ notification: item });
  } catch { res.status(500).json({ message: "Could not update notification." }); }
});
router.get("/escalations", allowRoles("admin"), async (_req, res) => {
  const items = await Grievance.find({ status: { $nin: ["Resolved", "Rejected"] }, dueAt: { $lte: new Date() } }).sort({ dueAt: 1 }).populate("assignedTo", "name email").lean();
  res.json({ escalations: items });
});

router.get("/stats/summary", allowRoles("faculty", "admin"), async (req, res) => {
  const match = req.user.role === "faculty" ? { department: req.user.department } : {};
  const [total, grouped, departments] = await Promise.all([
    Grievance.countDocuments(match),
    Grievance.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Grievance.aggregate([{ $match: match }, { $group: { _id: "$department", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } }, pending: { $sum: { $cond: [{ $in: ["$status", ["Submitted", "Pending"]] }, 1, 0] } } } }])
  ]);
  const counts = Object.fromEntries(grouped.map(x => [x._id, x.count]));
  res.json({ total, counts, departments });
});
module.exports = router;
