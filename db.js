// db.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

// 북마크 테이블 생성
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER UNIQUE,
      name TEXT,
      full_name TEXT,
      url TEXT
    )
  `);
});

module.exports = db;
