const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function loadLocalEnv() {
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadLocalEnv();

const PORT = process.env.PORT || 4000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOAD_DIR = path.join(ROOT, "uploads", "packs");
const MAX_JSON_BODY_SIZE = 10 * 1024 * 1024;
const MAX_PACK_FILE_SIZE = 250 * 1024 * 1024;
const JWT_SECRET = process.env.JWT_SECRET || "editorpack-dev-secret-change-me";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "karimovbdulloh@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const MONGODB_URI = process.env.MONGODB_URI;
let mongoClientPromise = null;
let memoryDb = null;
let mongoDisabledReason = "";

class PublicApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.publicMessage = message;
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

const ALLOWED_PACK_EXTENSIONS = new Set([
  ".zip",
  ".rar",
  ".7z",
  ".cpt",
  ".ccproject",
  ".aep",
  ".aepx",
  ".ffx",
  ".mogrt",
  ".prproj",
  ".prfpset",
  ".epr",
  ".cube",
  ".3dl",
  ".look",
  ".drp",
  ".drfx",
  ".setting",
  ".fcpxml",
  ".motn",
  ".mp4",
  ".mov",
  ".webm",
]);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 32, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const check = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signToken(user) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    }),
  );
  const data = `${header}.${payload}`;
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${sig}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function defaultPacks(adminId) {
  const now = new Date().toISOString();
  return [
    {
      id: 101,
      name: "Smooth Transitions Vol.1",
      desc: "60 ta silliq transition preset. CapCut va Premiere Pro uchun ideal.",
      price: "Free",
      apps: ["CapCut", "Premiere"],
      tags: ["transition", "swipe", "fade"],
      badge: "free",
      status: "live",
      img: "https://images.unsplash.com/photo-1536240478700-b869ad10e128?w=800&q=80",
      download_url: "https://example.com",
      uploaded_by: adminId,
      created_at: now,
    },
    {
      id: 102,
      name: "Cinematic LUT Pack",
      desc: "25 ta professional rang gradatsiyasi. DaVinci, Premiere va Final Cut uchun.",
      price: "$12",
      apps: ["DaVinci", "Premiere", "Final Cut"],
      tags: ["lut", "grade", "cinematic", "color"],
      badge: "hot",
      status: "live",
      img: "https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=800&q=80",
      download_url: "https://example.com",
      uploaded_by: adminId,
      created_at: now,
    },
    {
      id: 103,
      name: "Motion Blur FX",
      desc: "20 ta motion blur overlay. After Effects va Premiere Pro uchun.",
      price: "$7",
      apps: ["After Effects", "Premiere"],
      tags: ["motion", "blur", "whip", "shake"],
      badge: "new",
      status: "live",
      img: "https://images.unsplash.com/photo-1551817958-d9d86fb29431?w=800&q=80",
      download_url: "https://example.com",
      uploaded_by: adminId,
      created_at: now,
    },
    {
      id: 104,
      name: "CapCut Trending Pack",
      desc: "50 ta trending effect va sticker. TikTok va Reels uchun.",
      price: "Free",
      apps: ["CapCut"],
      tags: ["capcut", "trending", "flash", "beat"],
      badge: "hot",
      status: "live",
      img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
      download_url: "https://example.com",
      uploaded_by: adminId,
      created_at: now,
    },
  ];
}

function createDefaultDb() {
  const admin = {
    id: 1,
    name: "Admin",
    email: ADMIN_EMAIL,
    password_hash: hashPassword(ADMIN_PASSWORD),
    role: "admin",
    created_at: new Date().toISOString(),
  };
  return { users: [admin], packs: defaultPacks(admin.id), subscribers: [], scans: [] };
}

async function getMongoStateCollection() {
  if (!MONGODB_URI || mongoDisabledReason) return null;
  const { MongoClient } = require("mongodb");
  if (!mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    mongoClientPromise = client.connect();
  }
  const client = await mongoClientPromise;
  return client.db().collection("app_state");
}

function useMemoryDb(reason) {
  mongoDisabledReason = reason || "MongoDB ulanmadi";
  if (!memoryDb) memoryDb = createDefaultDb();
  console.error(`MongoDB disabled: ${mongoDisabledReason}`);
}

function isEphemeralServer() {
  return Boolean(process.env.VERCEL);
}

function assertWritableStorage() {
  if (isEphemeralServer() && (!MONGODB_URI || mongoDisabledReason) && !memoryDb) {
    useMemoryDb("MongoDB ulanmagan. Vaqtinchalik memory storage ishlatyapti.");
  }
}

async function seedDb() {
  if (MONGODB_URI) {
    try {
      const state = await getMongoStateCollection();
      if (state) {
        const exists = await state.findOne({ _id: "main" });
        if (!exists) await state.insertOne({ _id: "main", ...createDefaultDb() });
        return;
      }
    } catch (err) {
      useMemoryDb(err.message);
      return;
    }
  }

  if (process.env.VERCEL) {
    if (!memoryDb) memoryDb = createDefaultDb();
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) return;
  await writeDb(createDefaultDb());
}

async function readDb() {
  await seedDb();
  if (MONGODB_URI && !mongoDisabledReason) {
    try {
      const state = await getMongoStateCollection();
      const doc = await state.findOne({ _id: "main" });
      return {
        users: doc?.users || [],
        packs: doc?.packs || [],
        subscribers: doc?.subscribers || [],
        scans: doc?.scans || [],
      };
    } catch (err) {
      useMemoryDb(err.message);
    }
  }
  if (memoryDb) return memoryDb;
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

async function writeDb(db) {
  assertWritableStorage();
  if (MONGODB_URI && !mongoDisabledReason) {
    try {
      const state = await getMongoStateCollection();
      await state.updateOne(
        { _id: "main" },
        { $set: { users: db.users, packs: db.packs, subscribers: db.subscribers || [], scans: db.scans || [] } },
        { upsert: true },
      );
      return;
    } catch (err) {
      useMemoryDb(err.message);
    }
  }
  if (memoryDb) {
    memoryDb = db;
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2));
  try {
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    if (err.code !== "EPERM" && err.code !== "EACCES") throw err;
    fs.copyFileSync(tmpFile, DB_FILE);
    fs.unlinkSync(tmpFile);
  }
}

function publicUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function notFound(res) {
  send(res, 404, { error: "Topilmadi" });
}

function parseBody(req, maxSize = MAX_JSON_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxSize) {
        reject(new PublicApiError(413, "So'rov hajmi juda katta"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function splitMultipartBuffer(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(delimiter);
  while (start !== -1) {
    start += delimiter.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    let end = buffer.indexOf(delimiter, start);
    if (end === -1) break;
    let part = buffer.slice(start, end);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.slice(0, -2);
    }
    parts.push(part);
    start = end;
  }
  return parts;
}

function parseContentDisposition(value) {
  const result = {};
  String(value || "")
    .split(";")
    .slice(1)
    .forEach((piece) => {
      const eq = piece.indexOf("=");
      if (eq === -1) return;
      const key = piece.slice(0, eq).trim();
      const raw = piece.slice(eq + 1).trim();
      result[key] = raw.replace(/^"|"$/g, "");
    });
  return result;
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] ||
      contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
    if (!boundary) return reject(new PublicApiError(400, "Multipart boundary topilmadi"));

    const chunks = [];
    let total = 0;
    const maxSize = MAX_PACK_FILE_SIZE + MAX_JSON_BODY_SIZE;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxSize) {
        reject(new PublicApiError(413, "Pack fayli 250MB dan katta bo'lmasin"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const fields = {};
      const files = {};

      splitMultipartBuffer(buffer, boundary).forEach((part) => {
        const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
        if (headerEnd === -1) return;
        const headerText = part.slice(0, headerEnd).toString("utf8");
        const body = part.slice(headerEnd + 4);
        const headers = {};
        headerText.split(/\r\n/).forEach((line) => {
          const sep = line.indexOf(":");
          if (sep === -1) return;
          headers[line.slice(0, sep).trim().toLowerCase()] = line.slice(sep + 1).trim();
        });
        const disposition = parseContentDisposition(headers["content-disposition"]);
        if (!disposition.name) return;
        if (disposition.filename) {
          files[disposition.name] = {
            originalName: path.basename(disposition.filename),
            contentType: headers["content-type"] || "application/octet-stream",
            buffer: body,
            size: body.length,
          };
          return;
        }
        fields[disposition.name] = body.toString("utf8");
      });

      resolve({ fields, files });
    });
    req.on("error", reject);
  });
}

function parseMaybeJsonList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function hasDangerousSignature(buffer) {
  if (!buffer || buffer.length < 2) return false;
  const head = buffer.slice(0, 256).toString("utf8").trimStart().toLowerCase();
  return (
    buffer.slice(0, 2).toString("ascii") === "MZ" ||
    head.startsWith("#!") ||
    head.startsWith("<script") ||
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    head.startsWith("<?php")
  );
}

function validatePackFile(file) {
  if (!file || !file.buffer || !file.originalName) return null;
  if (file.size <= 0) throw new PublicApiError(400, "Bo'sh fayl qabul qilinmaydi");
  if (file.size > MAX_PACK_FILE_SIZE) {
    throw new PublicApiError(413, "Pack fayli 250MB dan katta bo'lmasin");
  }
  const ext = path.extname(file.originalName).toLowerCase();
  if (!ALLOWED_PACK_EXTENSIONS.has(ext)) {
    throw new PublicApiError(400, "Bu fayl turi qabul qilinmaydi. Faqat preset/pack yoki video yuklang.");
  }
  if (hasDangerousSignature(file.buffer)) {
    throw new PublicApiError(400, "Shubhali fayl qabul qilinmaydi");
  }
  return ext;
}

function savePackFile(file) {
  const ext = validatePackFile(file);
  if (!ext) return null;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const baseName = path
    .basename(file.originalName, ext)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "pack";
  const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${baseName}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, storedName);
  fs.writeFileSync(fullPath, file.buffer);
  return {
    download_url: `/uploads/packs/${storedName}`,
    file_name: file.originalName,
    file_size: file.size,
    file_type: ext.slice(1),
  };
}

async function parsePackRequest(req) {
  const contentType = req.headers["content-type"] || "";
  if (contentType.toLowerCase().startsWith("multipart/form-data")) {
    const { fields, files } = await parseMultipart(req);
    return { body: fields, upload: savePackFile(files.pack_file) };
  }
  return { body: await parseBody(req), upload: null };
}

function getAuthUser(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) return null;
  return db.users.find((u) => u.id === payload.id) || null;
}

function requireUser(req, res, db) {
  const user = getAuthUser(req, db);
  if (!user) send(res, 401, { error: "Avval login qiling" });
  return user;
}

function requireAdmin(req, res, db) {
  const user = requireUser(req, res, db);
  if (!user) return null;
  if (user.role !== "admin") {
    send(res, 403, { error: "Admin huquqi kerak" });
    return null;
  }
  return user;
}

function withUploader(pack, db) {
  const uploader = db.users.find((u) => u.id === pack.uploaded_by);
  const safeImg =
    typeof pack.img === "string" && pack.img.trim().toLowerCase().startsWith("data:image/")
      ? ""
      : pack.img;
  return {
    ...pack,
    img: safeImg,
    uploader_name: uploader?.name || pack.uploader_name || "",
    uploader_email: uploader?.email || pack.uploader_email || "",
  };
}

function publicPack(pack, db) {
  const { download_url, uploader_email, uploaded_by, ...safe } = withUploader(pack, db);
  return {
    ...safe,
    has_download: Boolean(download_url),
  };
}

function canDownloadPack(user, pack) {
  if (!user || !pack) return false;
  if (user.role === "admin") return true;
  if (pack.uploaded_by === user.id) return true;
  const isFree = !pack.price || pack.price === "Free" || pack.price === "$0";
  return pack.status === "live" && isFree;
}

function sendFileDownload(res, pack) {
  const downloadUrl = String(pack.download_url || "");
  if (/^https?:\/\//i.test(downloadUrl)) {
    res.writeHead(302, { Location: downloadUrl });
    res.end();
    return;
  }
  if (!downloadUrl.startsWith("/uploads/packs/")) {
    throw new PublicApiError(404, "Pack fayli topilmadi");
  }
  const fileName = path.basename(downloadUrl);
  const full = path.normalize(path.join(UPLOAD_DIR, fileName));
  if (!full.startsWith(UPLOAD_DIR) || !fs.existsSync(full)) {
    throw new PublicApiError(404, "Pack fayli topilmadi");
  }
  const displayName = String(pack.file_name || fileName).replace(/["\r\n]/g, "");
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(full).toLowerCase()] || "application/octet-stream",
    "Content-Length": fs.statSync(full).size,
    "Content-Disposition": `attachment; filename="${displayName}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(full).pipe(res);
}

function normalizeImageUrl(value) {
  const img = String(value || "").trim();
  if (img.toLowerCase().startsWith("data:image/")) {
    throw new PublicApiError(400, "Rasmni base64 qilib yubormang. Rasm uchun URL kiriting.");
  }
  return img;
}

async function handleApi(req, res, url) {
  const method = req.method;
  const parts = url.pathname.split("/").filter(Boolean).slice(1);

  if (method === "OPTIONS") return send(res, 200, {});

  if (method === "GET" && parts[0] === "health") {
    let storage = "unknown";
    let dbOk = false;
    let dbError = null;
    try {
      await readDb();
      dbOk = true;
      storage = MONGODB_URI && !mongoDisabledReason ? "mongodb" : memoryDb ? "memory" : "file";
    } catch (err) {
      dbError = err.message;
      storage = memoryDb ? "memory" : MONGODB_URI ? "mongodb-error" : "file-error";
    }
    return send(res, 200, {
      ok: true,
      dbOk,
      storage,
      writable: !(process.env.VERCEL && (!MONGODB_URI || mongoDisabledReason)),
      mongoConfigured: Boolean(MONGODB_URI),
      mongoError: mongoDisabledReason || dbError,
    });
  }

  const db = await readDb();

  if (method === "POST" && parts.join("/") === "auth/signup") {
    const body = await parseBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!name || !email || password.length < 4) {
      return send(res, 400, { error: "Ism, email va parol kiriting" });
    }
    if (db.users.some((u) => u.email === email)) {
      return send(res, 409, { error: "Bu email allaqachon bor" });
    }
    const user = {
      id: Date.now(),
      name,
      email,
      password_hash: hashPassword(password),
      role: "user",
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    await writeDb(db);
    return send(res, 201, { token: signToken(user), user: publicUser(user) });
  }

  if (method === "POST" && parts.join("/") === "auth/login") {
    const body = await parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPassword(String(body.password || ""), user.password_hash)) {
      return send(res, 401, { error: "Email yoki parol noto'g'ri" });
    }
    return send(res, 200, { token: signToken(user), user: publicUser(user) });
  }

  if (method === "GET" && parts.join("/") === "auth/me") {
    const user = requireUser(req, res, db);
    if (!user) return;
    return send(res, 200, publicUser(user));
  }

  if (method === "GET" && parts.length === 1 && parts[0] === "packs") {
    return send(
      res,
      200,
      db.packs.filter((p) => p.status === "live").map((p) => publicPack(p, db)),
    );
  }

  if (method === "GET" && parts.length === 3 && parts[0] === "packs" && parts[2] === "download") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const pack = db.packs.find((p) => p.id == parts[1]);
    if (!pack) return notFound(res);
    if (!canDownloadPack(user, pack)) {
      return send(res, 403, { error: "Bu packni yuklab olishga ruxsat yo'q" });
    }
    return sendFileDownload(res, pack);
  }

  if (method === "GET" && parts.length === 2 && parts[0] === "packs") {
    const pack = db.packs.find((p) => p.id == parts[1] && p.status === "live");
    if (!pack) return notFound(res);
    return send(res, 200, publicPack(pack, db));
  }

  if (method === "GET" && parts.length === 1 && parts[0] === "scans") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const scans = (db.scans || [])
      .filter((scan) => scan.user_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12);
    return send(res, 200, scans);
  }

  if (method === "POST" && parts.length === 1 && parts[0] === "scans") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const body = await parseBody(req);
    const result = body.result && typeof body.result === "object" ? body.result : {};
    const scan = {
      id: Date.now(),
      user_id: user.id,
      file_name: String(body.file_name || "Video").slice(0, 120),
      duration: Number(body.duration) || 0,
      result: {
        intensity: Number(result.intensity) || 0,
        label: String(result.label || "Low"),
        metrics: result.metrics || {},
        effects: Array.isArray(result.effects) ? result.effects.slice(0, 10) : [],
        events: Array.isArray(result.events) ? result.events.slice(0, 8) : [],
        recommendations: Array.isArray(result.recommendations) ? result.recommendations.slice(0, 5) : [],
      },
      created_at: new Date().toISOString(),
    };
    db.scans = db.scans || [];
    db.scans.push(scan);
    db.scans = db.scans.slice(-250);
    await writeDb(db);
    return send(res, 201, scan);
  }

  if (method === "GET" && parts.join("/") === "uploader/packs") {
    const user = requireUser(req, res, db);
    if (!user) return;
    if (!["uploader", "admin"].includes(user.role)) {
      return send(res, 403, { error: "Uploader huquqi kerak" });
    }
    return send(
      res,
      200,
      db.packs.filter((p) => p.uploaded_by === user.id).map((p) => withUploader(p, db)),
    );
  }

  if (method === "POST" && parts.join("/") === "uploader/packs") {
    const user = requireUser(req, res, db);
    if (!user) return;
    if (!["uploader", "admin"].includes(user.role)) {
      return send(res, 403, { error: "Uploader huquqi kerak" });
    }
    const { body, upload } = await parsePackRequest(req);
    const pack = {
      id: Date.now(),
      name: String(body.name || "").trim(),
      desc: String(body.desc || "").trim(),
      price: body.price || "Free",
      img: normalizeImageUrl(body.img),
      download_url: upload?.download_url || "",
      file_name: upload?.file_name || "",
      file_size: upload?.file_size || 0,
      file_type: upload?.file_type || "",
      badge: body.badge || "",
      apps: parseMaybeJsonList(body.apps),
      tags: parseMaybeJsonList(body.tags),
      status: user.role === "admin" ? body.status || "live" : "pending",
      uploaded_by: user.id,
      created_at: new Date().toISOString(),
    };
    if (!pack.name || !pack.desc || !pack.download_url) {
      return send(res, 400, { error: "Nomi, tavsif va pack fayli majburiy" });
    }
    db.packs.push(pack);
    await writeDb(db);
    return send(res, 201, withUploader(pack, db));
  }

  if (method === "PUT" && parts.length === 3 && parts[0] === "uploader" && parts[1] === "packs") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const pack = db.packs.find((p) => p.id == parts[2]);
    if (!pack) return notFound(res);
    if (user.role !== "admin" && pack.uploaded_by !== user.id) {
      return send(res, 403, { error: "Ruxsat yo'q" });
    }
    const { body, upload } = await parsePackRequest(req);
    const nextDownloadUrl =
      upload?.download_url ||
      (user.role === "admin" && body.download_url ? body.download_url : pack.download_url);
    Object.assign(pack, {
      name: body.name ?? pack.name,
      desc: body.desc ?? pack.desc,
      price: body.price ?? pack.price,
      img: body.img === undefined ? pack.img : normalizeImageUrl(body.img),
      download_url: nextDownloadUrl,
      file_name: upload?.file_name || pack.file_name || "",
      file_size: upload?.file_size || pack.file_size || 0,
      file_type: upload?.file_type || pack.file_type || "",
      badge: body.badge ?? pack.badge,
      apps: body.apps === undefined ? pack.apps : parseMaybeJsonList(body.apps),
      tags: body.tags === undefined ? pack.tags || [] : parseMaybeJsonList(body.tags),
      status: user.role === "admin" ? body.status || pack.status : "pending",
    });
    await writeDb(db);
    return send(res, 200, withUploader(pack, db));
  }

  if (method === "DELETE" && parts.length === 3 && parts[0] === "uploader" && parts[1] === "packs") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const pack = db.packs.find((p) => p.id == parts[2]);
    if (!pack) return notFound(res);
    if (user.role !== "admin" && pack.uploaded_by !== user.id) {
      return send(res, 403, { error: "Ruxsat yo'q" });
    }
    db.packs = db.packs.filter((p) => p.id != parts[2]);
    await writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && parts.join("/") === "admin/users") {
    if (!requireAdmin(req, res, db)) return;
    return send(res, 200, db.users.map(publicUser));
  }

  if (method === "PUT" && parts.length === 4 && parts[0] === "admin" && parts[1] === "users" && parts[3] === "role") {
    if (!requireAdmin(req, res, db)) return;
    const body = await parseBody(req);
    const user = db.users.find((u) => u.id == parts[2]);
    if (!user) return notFound(res);
    if (user.email === ADMIN_EMAIL) return send(res, 400, { error: "Asosiy admin himoyalangan" });
    if (!["user", "uploader", "admin"].includes(body.role)) {
      return send(res, 400, { error: "Role noto'g'ri" });
    }
    user.role = body.role;
    await writeDb(db);
    return send(res, 200, publicUser(user));
  }

  if (method === "DELETE" && parts.length === 3 && parts[0] === "admin" && parts[1] === "users") {
    if (!requireAdmin(req, res, db)) return;
    const user = db.users.find((u) => u.id == parts[2]);
    if (!user) return notFound(res);
    if (user.email === ADMIN_EMAIL) return send(res, 400, { error: "Asosiy admin himoyalangan" });
    db.users = db.users.filter((u) => u.id != parts[2]);
    db.packs = db.packs.filter((p) => p.uploaded_by != parts[2]);
    db.scans = (db.scans || []).filter((scan) => scan.user_id != parts[2]);
    await writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && parts.join("/") === "admin/packs") {
    if (!requireAdmin(req, res, db)) return;
    return send(res, 200, db.packs.map((p) => withUploader(p, db)));
  }

  if (method === "PUT" && parts.length === 4 && parts[0] === "admin" && parts[1] === "packs" && parts[3] === "status") {
    if (!requireAdmin(req, res, db)) return;
    const body = await parseBody(req);
    const pack = db.packs.find((p) => p.id == parts[2]);
    if (!pack) return notFound(res);
    if (!["pending", "live", "rejected"].includes(body.status)) {
      return send(res, 400, { error: "Status noto'g'ri" });
    }
    pack.status = body.status;
    await writeDb(db);
    return send(res, 200, withUploader(pack, db));
  }

  if (method === "PUT" && parts.length === 3 && parts[0] === "admin" && parts[1] === "packs") {
    if (!requireAdmin(req, res, db)) return;
    const body = await parseBody(req);
    const pack = db.packs.find((p) => p.id == parts[2]);
    if (!pack) return notFound(res);
    const updates = { ...body };
    if (body.img !== undefined) updates.img = normalizeImageUrl(body.img);
    Object.assign(pack, updates, {
      apps: Array.isArray(body.apps) ? body.apps : pack.apps,
      tags: Array.isArray(body.tags) ? body.tags : pack.tags || [],
    });
    await writeDb(db);
    return send(res, 200, withUploader(pack, db));
  }

  if (method === "DELETE" && parts.length === 3 && parts[0] === "admin" && parts[1] === "packs") {
    if (!requireAdmin(req, res, db)) return;
    db.packs = db.packs.filter((p) => p.id != parts[2]);
    await writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "POST" && parts[0] === "newsletter") {
    const body = await parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return send(res, 400, { error: "Email kiriting" });
    if (!db.subscribers.includes(email)) db.subscribers.push(email);
    await writeDb(db);
    return send(res, 201, { ok: true });
  }

  notFound(res);
}

function serveStatic(req, res, url) {
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/") filePath = "/index.html";
  if (filePath.startsWith("/uploads/")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const full = path.normalize(path.join(ROOT, filePath));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream" });
    res.end(data);
  });
}

async function appHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (err) {
    console.error(err);
    const statusCode = err.statusCode || 500;
    send(res, statusCode, {
      error:
        err.publicMessage ||
        (process.env.VERCEL ? err.message : "Server xatoligi"),
      detail: process.env.VERCEL && !err.publicMessage ? err.message : undefined,
    });
  }

}

const server = http.createServer(appHandler);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("");
    console.error(`Port ${PORT} band. Server allaqachon ishlayotgan bo'lishi mumkin.`);
    console.error(`Ochib ko'ring: http://localhost:${PORT}`);
    console.error("");
    console.error("Qayta ishga tushirish uchun:");
    console.error("  Get-Process node | Stop-Process");
    console.error("  npm start");
    console.error("");
    console.error("Yoki boshqa portda ishga tushiring:");
    console.error("  $env:PORT=5000; npm start");
    process.exit(1);
  }

  console.error("Server ishga tushmadi:", err.message);
  process.exit(1);
});

if (require.main === module) {
  server.listen(PORT, async () => {
    await seedDb();
    console.log(`EditorPack server: http://localhost:${PORT}`);
    console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  });
}

module.exports = appHandler;
