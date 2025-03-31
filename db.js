const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

// 북마크 테이블 생성
db.serialize(() => {
    // 테이블이 없으면 생성
    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_id INTEGER UNIQUE,
          name TEXT,
          full_name TEXT,
          url TEXT
        )
      `);

    // owner 컬럼이 없으면 추가
    db.run(`
        ALTER TABLE bookmarks
        ADD COLUMN owner TEXT
      `, (err) => {
        if (err) {
            console.log("owner 컬럼 추가 실패:", err.message);
        } else {
            console.log("owner 컬럼이 추가되었습니다.");
        }
    });
});

module.exports = db;
