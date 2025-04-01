db.serialize(() => {

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

    // 검색 기록 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS search_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          query TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // 인덱스 추가 (검색 성능 개선)
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_user_id_search_history ON search_history(user_id);
    `);
});
