const Database = require("better-sqlite3");
const path = require("path");

const dbPath =
  process.env.NODE_ENV === "production"
    ? "/data/editorpack.db"
    : "editorpack.db";

const db = new Database(dbPath);
