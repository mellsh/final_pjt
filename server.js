const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const db = new sqlite3.Database('./database.sqlite');

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
            params: { q: query, per_page: 10 },
            headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
        });

        res.json(response.data.items);
    } catch (error) {
        res.status(500).json({ error: 'GitHub API 요청 실패', details: error.response?.data || error.message });
    }
});

// 북마크 추가
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

// 검색 시 검색어 저장 (로그인된 사용자만)
app.post('/search-history', (req, res) => {
  const { user_id, query } = req.body;

  if (!user_id || !query) {
      return res.status(400).json({ error: 'user_id와 검색어(query)가 필요합니다.' });
  }

  const insertQuery = `INSERT INTO search_history (user_id, query) VALUES (?, ?)`;

  db.run(insertQuery, [user_id, query], function (err) {
      if (err) {
          return res.status(500).json({ error: '검색 기록 저장 실패', details: err.message });
      }
      res.json({ message: '검색 기록 저장 완료' });
  });
});


// 추천 API
app.get('/recommendations', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
      return fetchTrendingRepos(res);
  }

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      db.all(`
          SELECT DISTINCT full_name FROM bookmarks WHERE user_id = ?
          UNION
          SELECT DISTINCT query FROM search_history WHERE user_id = ?
          LIMIT 8
      `, [userId, userId], async (err, rows) => {
          if (err) {
              console.error('추천 데이터 조회 오류:', err);
              return res.status(500).json({ error: '추천 데이터 조회 실패', details: err.message });
          }

          if (rows.length === 0) {
              return fetchTrendingRepos(res);
          }

          const searchQueries = rows.map(row => row.full_name || row.query).join(' ');

          try {
              const response = await axios.get('https://api.github.com/search/repositories', {
                  params: { q: searchQueries, per_page: 8 },
                  headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
              });

              let recommendations = response.data.items;

              if (recommendations.length < 5) {
                  const extraResponse = await axios.get('https://api.github.com/search/repositories', {
                      params: { q: 'stars:>10000', sort: 'stars', order: 'desc', per_page: 8 },
                      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
                  });

                  recommendations = recommendations.concat(extraResponse.data.items).slice(0, 8);
              }

              res.json(recommendations);
          } catch (error) {
              res.status(500).json({ error: 'GitHub API 요청 실패', details: error.response?.data || error.message });
          }
      });

  } catch (error) {
      return fetchTrendingRepos(res);
  }
});


// 인기 리포지토리 가져오기 (최소 5개, 최대 8개)
function fetchTrendingRepos(res) {
    axios.get('https://api.github.com/search/repositories', {
        params: { q: 'stars:>10000', sort: 'stars', order: 'desc', per_page: 8 },
        headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
    })
    .then(response => {
        const trendingRepos = response.data.items;

        // 최소 5개 이하일 경우 추가 요청
        if (trendingRepos.length < 5) {
            axios.get('https://api.github.com/search/repositories', {
                params: { q: 'stars:>5000', sort: 'stars', order: 'desc', per_page: 8 },
                headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
            })
            .then(extraResponse => {
                res.json(trendingRepos.concat(extraResponse.data.items).slice(0, 8));
            })
            .catch(err => res.json(trendingRepos));
        } else {
            res.json(trendingRepos);
        }
    })
    .catch(error => res.status(500).json({ error: '인기 리포지토리 조회 실패', details: error.response?.data || error.message }));
}

// 북마크 조회 API (로그인된 사용자만)
app.get('/bookmarks', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      db.all('SELECT * FROM bookmarks WHERE user_id = ?', [userId], (err, rows) => {
          if (err) {
              return res.status(500).json({ error: '북마크 조회 실패', details: err.message });
          }
          res.json(rows); // 북마크 목록 반환
      });
  } catch (error) {
      return res.status(401).json({ error: '유효하지 않은 토큰' });
  }
});


// 리포지토리의 폴더 및 파일 목록을 가져오는 API
app.get('/repo/:owner/:repo/contents', async (req, res) => {
  const { owner, repo } = req.params;
  const { path = '' } = req.query;

  try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
          headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`
          }
      });
      res.json(response.data);
  } catch (error) {
      console.error('GitHub API 요청 실패:', error.message); // 오류 메시지 출력
      res.status(500).json({ error: 'GitHub API 요청 실패', details: error.message });
  }
});


// 리포지토리 파일의 내용을 가져오는 API
app.get('/repo/:owner/:repo/contents/:filePath', async (req, res) => {
  const { owner, repo, filePath } = req.params;

  try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
          headers: {
              Authorization: `token ${GITHUB_TOKEN}`
          }
      });

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      res.json({ content });
  } catch (error) {
      res.status(500).json({ error: 'GitHub API 요청 실패', details: error.message });
  }
});

// 북마크 삭제 함수
function deleteBookmarkFromDatabase(repoId) {
  return new Promise((resolve, reject) => {
      const query = 'DELETE FROM bookmarks WHERE id = ?';
      
      db.run(query, [repoId], function(err) {
          if (err) {
              console.error('DB 오류 발생:', err.message);  // DB 오류 로그 추가
              reject(err);
          } else {
              if (this.changes > 0) {  // 삭제된 레코드가 있으면
                  resolve(true);  // 성공
              } else {
                  resolve(false);  // 삭제된 레코드가 없으면
              }
          }
      });
  });
}

// 북마크 삭제 (경로 수정)
app.delete('/bookmarks/:repoId', async (req, res) => { // 수정된 경로
  const repoId = req.params.repoId;

  try {
      // DB에서 해당 repoId에 해당하는 북마크 삭제하는 로직
      const result = await deleteBookmarkFromDatabase(repoId); 
      
      if (result) {
          return res.json({ message: '북마크가 삭제되었습니다.' });
      } else {
          return res.status(404).json({ error: '북마크를 찾을 수 없습니다.' });
      }
  } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '서버 오류' });
  }
});







const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
