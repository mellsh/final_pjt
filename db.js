const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

// 테이블 생성
db.serialize(() => {
    // 사용자 테이블 생성
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT
        )
    `);

    // 북마크 테이블 생성
    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_id INTEGER UNIQUE,
          name TEXT,
          full_name TEXT,
          url TEXT,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
});

module.exports = db;
