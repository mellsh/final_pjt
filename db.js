const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

// 테이블 생성
db.serialize(() => {
    // 사용자 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT
        )
    `);

    // 북마크 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_id INTEGER UNIQUE,
          name TEXT,
          owner TEXT,
          full_name TEXT,
          url TEXT,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // 검색 기록 테이블 추가 ✅
    db.run(`
        CREATE TABLE IF NOT EXISTS search_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          query TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
});

module.exports = db;
