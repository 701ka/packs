const Database = require("better-sqlite3");
const db = new Database("editorpack.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    email     TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    name      TEXT NOT NULL,
    role      TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS packs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    desc    TEXT,
    price   TEXT DEFAULT 'Free',
    apps    TEXT,
    badge   TEXT DEFAULT '',
    status  TEXT DEFAULT 'live',
    img     TEXT,
    download_url TEXT,
    uploaded_by INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Admin rolini o'rnatish
const adminEmail = "karimovbdulloh@gmail.com";
const adminUser = db
  .prepare("SELECT id FROM users WHERE email = ?")
  .get(adminEmail);
if (adminUser) {
  db.prepare("UPDATE users SET role = ? WHERE email = ?").run(
    "admin",
    adminEmail,
  );
}

// DEFAULT_PACKS ni DBga yuklash (faqat bo'sh bo'lsa)
const packCount = db.prepare("SELECT COUNT(*) as count FROM packs").get();
if (packCount.count === 0) {
  const DEFAULT_PACKS = [
    {
      name: "Smooth Transitions Vol.1",
      desc: "60 buttery smooth transition presets. Works with all popular editors.",
      price: "Free",
      apps: ["CapCut", "Premiere"],
      badge: "free",
      img: "https://p16-capcut-cms-sg-useast5.capcutcdn-us.com/tos-useast5-i-6rr7idwo9f-tx/1697361085079.30%20-1~tplv-6rr7idwo9f-image.image",
      download_url: "",
    },
    {
      name: "Cinematic LUT Pack",
      desc: "25 professional color grades inspired by Hollywood films.",
      price: "$12",
      apps: ["DaVinci", "Premiere", "Final Cut"],
      badge: "hot",
      img: "https://i.ytimg.com/vi/bVlTlTRhRDc/maxresdefault.jpg",
      download_url: "",
    },
    {
      name: "Motion Blur FX",
      desc: "20 customizable motion blur overlays for dynamic edits.",
      price: "$7",
      apps: ["After Effects", "Premiere"],
      badge: "new",
      img: "https://i.ytimg.com/vi/mTa5Tu3oEgk/maxresdefault.jpg",
      download_url: "",
    },
    {
      name: "CapCut Trending Pack",
      desc: "50 trending effects and stickers for CapCut short-form content.",
      price: "Free",
      apps: ["CapCut"],
      badge: "hot",
      img: "https://i.redd.it/cj907zkvfsqb1.png",
      download_url: "",
    },
    {
      name: "Glitch & Distortion FX",
      desc: "35 glitch effects and digital distortion overlays.",
      price: "$9",
      apps: ["After Effects", "Premiere"],
      badge: "",
      img: "https://dfjx2uxqg3cgi.cloudfront.net/img/eps/E9756_2x/c/E9756_00.jpg?20230817023226",
      download_url: "",
    },
    {
      name: "Sound FX Starter Kit",
      desc: "100 essential sound effects for any video project.",
      price: "Free",
      apps: ["All Apps"],
      badge: "free",
      img: "https://framerusercontent.com/images/8YGBGAccmjMQ1piyPRrvVtzRQA.png?width=1200&height=900",
      download_url: "",
    },
    {
      name: "Title & Text Animations",
      desc: "40 animated title cards and lower thirds.",
      price: "$15",
      apps: ["After Effects", "Premiere", "Final Cut"],
      badge: "new",
      img: "https://elements-resized.envatousercontent.com/elements-video-cover-images/files/642170171/1920x1080_000050.png?w=500&cf_fit=cover&q=85&format=auto&s=dc8116735a41842a2bb45aad8b15441fc74c48bedc57354b63a8863856ebee14",
      download_url: "",
    },
    {
      name: "DaVinci Color Toolkit",
      desc: "30 nodes and macros to speed up your color workflow.",
      price: "$19",
      apps: ["DaVinci"],
      badge: "",
      img: "https://images.blackmagicdesign.com/images/products/davinciresolve/color/hero/hero-still.jpg?_v=1592449833",
      download_url: "",
    },
  ];

  const insert = db.prepare(`
    INSERT INTO packs (name, desc, price, apps, badge, status, img, download_url, uploaded_by)
    VALUES (?, ?, ?, ?, ?, 'live', ?, ?, NULL)
  `);

  DEFAULT_PACKS.forEach((p) => {
    insert.run(
      p.name,
      p.desc,
      p.price,
      JSON.stringify(p.apps),
      p.badge,
      p.img,
      p.download_url,
    );
  });

  console.log("✅ Default packlar DBga yuklandi!");
}

module.exports = db;
