const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAuth = require("../middleware/auth");

// GET /api/packs — faqat live packlar
router.get("/", (req, res) => {
  const { app, search, free } = req.query;
  let packs = db.prepare("SELECT * FROM packs WHERE status = 'live'").all();
  packs = packs.map(p => ({ ...p, apps: JSON.parse(p.apps || "[]") }));

  if (free === "true") packs = packs.filter(p => p.price === "Free" || p.price === "$0");
  if (app && app !== "All") packs = packs.filter(p => p.apps.includes(app));
  if (search) {
    const q = search.toLowerCase();
    packs = packs.filter(p => p.name.toLowerCase().includes(q) || (p.desc || "").toLowerCase().includes(q));
  }
  res.json(packs);
});

// GET /api/packs/my/list — /:id dan OLDIN bo'lishi SHART!
router.get("/my/list", requireAuth, (req, res) => {
  const packs = db.prepare("SELECT * FROM packs WHERE uploaded_by = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(packs.map(p => ({ ...p, apps: JSON.parse(p.apps || "[]") })));
});

// GET /api/packs/:id
router.get("/:id", (req, res) => {
  const pack = db.prepare("SELECT * FROM packs WHERE id = ?").get(req.params.id);
  if (!pack) return res.status(404).json({ error: "Pack not found" });
  res.json({ ...pack, apps: JSON.parse(pack.apps || "[]") });
});

// POST /api/packs — uploader yoki admin pack qo'shadi
router.post("/", requireAuth, (req, res) => {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
  if (!user || !["uploader", "admin"].includes(user.role))
    return res.status(403).json({ error: "Only uploaders can add packs" });

  const { name, desc, price, apps, badge, img, download_url } = req.body;
  const status = user.role === "admin" ? "live" : "pending";

  const result = db.prepare(`
    INSERT INTO packs (name, desc, price, apps, badge, status, img, download_url, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, desc, price, JSON.stringify(apps || []), badge || "", status, img, download_url, req.user.id);

  res.json({ id: result.lastInsertRowid, status });
});

// PUT /api/packs/:id
router.put("/:id", requireAuth, (req, res) => {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
  const pack = db.prepare("SELECT * FROM packs WHERE id = ?").get(req.params.id);

  if (!pack) return res.status(404).json({ error: "Pack not found" });
  if (user.role !== "admin" && pack.uploaded_by !== req.user.id)
    return res.status(403).json({ error: "Access denied" });

  const { name, desc, price, apps, badge, img, download_url } = req.body;
  const newStatus = user.role === "admin" ? (req.body.status || pack.status) : "pending";

  db.prepare(`
    UPDATE packs SET name=?, desc=?, price=?, apps=?, badge=?, status=?, img=?, download_url=? WHERE id=?
  `).run(name, desc, price, JSON.stringify(apps || []), badge || "", newStatus, img, download_url, req.params.id);

  res.json({ success: true, status: newStatus });
});

// DELETE /api/packs/:id
router.delete("/:id", requireAuth, (req, res) => {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
  const pack = db.prepare("SELECT * FROM packs WHERE id = ?").get(req.params.id);

  if (!pack) return res.status(404).json({ error: "Pack not found" });
  if (user.role !== "admin" && pack.uploaded_by !== req.user.id)
    return res.status(403).json({ error: "Access denied" });

  db.prepare("DELETE FROM packs WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;