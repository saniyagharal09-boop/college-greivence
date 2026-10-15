require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function run() {
  const [role, name, email, password, department = "Administration"] = process.argv.slice(2);
  if (!["admin", "faculty"].includes(role) || !name || !email || !password) {
    console.error('Usage: node scripts/create-user.js <admin|faculty> "<Name>" <email> <password> ["Department"]');
    process.exitCode = 1; return;
  }
  if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
  await mongoose.connect(process.env.MONGO_URI);
  const normalized = email.toLowerCase();
  const hash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate({ email: normalized }, {
    name, email: normalized, passwordHash: hash, role, department
  }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  console.log(`${role} account created/updated for ${normalized}`);
  await mongoose.disconnect();
}
run().catch(async e => { console.error(e.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
