const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Express 서버 설정
const app = express();
app.use(express.json());
app.use(cors());

// SQLite3 데이터베이스 연결
const db = new sqlite3.Database('./database.sqlite');

// 테이블 생성
db.serialize(() => {
    // Users 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    // Bookmarks 테이블
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
});

// 로그인, 회원가입을 위한 비밀번호 해시화
const saltRounds = 10;

// 회원가입
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '이름과 비밀번호를 입력해주세요.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(query, [username, hashedPassword], function (err) {
        if (err) {
            return res.status(500).json({ error: '회원가입 실패', details: err.message });
        }
        res.json({ message: '회원가입 성공', userId: this.lastID });
    });
});

// 로그인
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '이름과 비밀번호를 입력해주세요.' });
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.get(query, [username], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: '로그인 실패', details: err.message });
        }

        if (!row || !(await bcrypt.compare(password, row.password))) {
            return res.status(400).json({ error: '로그인 실패: 잘못된 비밀번호' });
        }

        // JWT 토큰 발급
        const token = jwt.sign({ userId: row.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: '로그인 성공', token });
    });
});

// 검색 API (GitHub 리포지토리 검색)
app.get('/search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: '검색어를 입력하세요.' });

    try {
        const response = await axios.get('https://api.github.com/search/repositories', {
            params: { q: query },
            headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
        });

        res.json(response.data.items);
    } catch (error) {
        res.status(500).json({ error: 'GitHub API 요청 실패', details: error.response?.data || error.message });
    }
});

// 북마크 추가 (로그인된 사용자만 가능)
app.post('/bookmarks', (req, res) => {
  const { repo_id, name, owner, full_name, url, user_id } = req.body;

  if (!repo_id || !name || !owner || !full_name || !url || !user_id) {
      return res.status(400).json({ message: '필수 값이 누락되었습니다.' });
  }

  const query = `INSERT INTO bookmarks (repo_id, name, owner, full_name, url, user_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(query, [repo_id, name, owner, full_name, url, user_id], function(err) {
      if (err) {
          console.error('북마크 저장 중 오류 발생:', err);
          return res.status(500).json({ message: '북마크 저장 실패' });
      }

      res.status(201).json({ message: '북마크가 성공적으로 저장되었습니다.' });
  });
});


// 북마크 목록 조회 (로그인된 사용자만)
app.post('/bookmarks', (req, res) => {
  const { repo_id, name, owner, full_name, url, user_id } = req.body;

  // 필수 데이터가 없는 경우
  if (!repo_id || !name || !owner || !full_name || !url || !user_id) {
      return res.status(400).json({ message: '필수 값이 누락되었습니다.' });
  }

  // 데이터베이스에 저장
  const query = `INSERT INTO bookmarks (repo_id, name, owner, full_name, url, user_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

  // 데이터베이스 연결 및 저장 (예시)
  db.run(query, [repo_id, name, owner, full_name, url, user_id], function(err) {
      if (err) {
          console.error('북마크 저장 중 오류 발생:', err);
          return res.status(500).json({ message: '북마크 저장 실패' });
      }

      res.status(201).json({ message: '북마크가 성공적으로 저장되었습니다.' });
  });
});



// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
