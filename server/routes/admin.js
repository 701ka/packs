const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAuth = require("../middleware/auth");

function requireAdmin(req, res, next) {
  const user = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(req.user.id);
  if (!user || user.role !== "admin")
    return res.status(403).json({ error: "Access denied" });
  next();
}

// GET /api/admin/users
router.get("/users", requireAuth, requireAdmin, (req, res) => {
  const users = db
    .prepare(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC",
    )
    .all();
  res.json(users);
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", requireAuth, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!["user", "uploader", "moderator", "admin"].includes(role))
    return res.status(400).json({ error: "Invalid role" });
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  res.json({ success: true });
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", requireAuth, requireAdmin, (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// GET /api/admin/packs
router.get("/packs", requireAuth, requireAdmin, (req, res) => {
  const packs = db
    .prepare(
      `
    SELECT p.*, u.name as uploader_name, u.email as uploader_email
    FROM packs p
    LEFT JOIN users u ON p.uploaded_by = u.id
    ORDER BY p.created_at DESC
  `,
    )
    .all();
  res.json(packs.map((p) => ({ ...p, apps: JSON.parse(p.apps || "[]") })));
});

// PUT /api/admin/packs/:id/status
router.put("/packs/:id/status", requireAuth, requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!["live", "pending", "rejected"].includes(status))
    return res.status(400).json({ error: "Invalid status" });
  db.prepare("UPDATE packs SET status = ? WHERE id = ?").run(
    status,
    req.params.id,
  );
  res.json({ success: true });
});

// DELETE /api/admin/packs/:id
router.delete("/packs/:id", requireAuth, requireAdmin, (req, res) => {
  db.prepare("DELETE FROM packs WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// PUT /api/admin/packs/:id
router.put("/packs/:id", requireAuth, requireAdmin, (req, res) => {
  const { name, desc, price, apps, badge, status, img, download_url } =
    req.body;
  db.prepare(
    `
    UPDATE packs SET name=?, desc=?, price=?, apps=?, badge=?, status=?, img=?, download_url=? WHERE id=?
  `,
  ).run(
    name,
    desc,
    price,
    JSON.stringify(apps),
    badge,
    status,
    img,
    download_url,
    req.params.id,
  );
  res.json({ success: true });
});

module.exports = router;
