const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing)
    return res.status(409).json({ error: "Email already registered" });

  const hashed = await bcrypt.hash(password, 10);
  const role = email === "karimovbdulloh@gmail.com" ? "admin" : "user";

  const result = db
    .prepare(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    )
    .run(name, email, hashed, role);

  const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token, user: { id: result.lastInsertRowid, name, email, role } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user)
    return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({
    token,
    user: { id: user.id, name: user.name, email, role: user.role },
  });
});

// GET /api/auth/me  ← module.exports DAN OLDIN bo'lishi shart!
router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

module.exports = router; // ← eng oxirida
