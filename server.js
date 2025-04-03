const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('github_dashboard.db', (err) => {
    if (err) {
        console.error('데이터베이스 연결 실패:', err);
    } else {
        console.log('데이터베이스 연결 성공');
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                owner TEXT NOT NULL,
                full_name TEXT NOT NULL,
                url TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                description TEXT
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS repositories (
                repo_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                owner TEXT NOT NULL,
                description TEXT
            )
        `);
    }
});

// JWT 시크릿 키
const secretKey = process.env.JWT_SECRET || 'your-secret-key';

// 회원가입 API
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
                }
                console.error('회원가입 오류:', err);
                return res.status(500).json({ error: '회원가입에 실패했습니다.' });
            }

            console.log(`사용자 ${username} 회원가입 성공`);
            res.status(201).json({ message: '회원가입 성공' });
        });
    } catch (error) {
        console.error('비밀번호 해싱 오류:', error);
        res.status(500).json({ error: '회원가입에 실패했습니다.' });
    }
});

// 로그인 API
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    db.get('SELECT id, username, password FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('로그인 오류:', err);
            return res.status(500).json({ error: '로그인에 실패했습니다.' });
        }

        if (!user) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        try {
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                const token = jwt.sign({ userId: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
                console.log(`사용자 ${username} 로그인 성공`);
                res.json({ message: '로그인 성공', token: token, userId: user.id });
            } else {
                res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            }
        } catch (error) {
            console.error('비밀번호 비교 오류:', error);
            res.status(500).json({ error: '로그인에 실패했습니다.' });
        }
    });
});

// 추천 리포지토리 API
app.get('/recommendations', async (req, res) => {
    try {
        const response = await axios.get('https://api.github.com/search/repositories?q=stars:>10000&sort=stars&order=desc&per_page=10', {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`
            }
        });

        const repos = response.data.items.map(item => ({
            id: item.id,
            name: item.name,
            owner: item.owner,
            description: item.description,
            html_url: item.html_url
        }));

        // repositories 테이블에 저장
        repos.forEach(repo => {
            const { id, name, owner, description } = repo;
            const query = `INSERT OR IGNORE INTO repositories (repo_id, name, owner, description) VALUES (?, ?, ?, ?)`;
            db.run(query, [id, name, owner.login, description], (err) => {
                if (err) {
                    console.error('리포지토리 저장 중 오류 발생:', err);
                }
            });
        });

        res.json(repos);
    } catch (error) {
        console.error('추천 리포지토리 로드 중 오류 발생:', error);
        res.status(500).json({ message: '추천 리포지토리를 불러오지 못했습니다.' });
    }
});

// 검색 API
app.get('/search', async (req, res) => {
    const { query } = req.query;

    try {
        const response = await axios.get(`https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=10`, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`
            }
        });

        const repos = response.data.items.map(item => ({
            id: item.id,
            name: item.name,
            owner: item.owner,
            description: item.description,
            html_url: item.html_url
        }));

        res.json(repos);
    } catch (error) {
        console.error('리포지토리 검색 중 오류 발생:', error);
        res.status(500).json({ message: '리포지토리를 검색하지 못했습니다.' });
    }
});

// 북마크 추가 API
app.post('/bookmarks', (req, res) => {
    const { repo_id, name, owner, full_name, url, user_id, description } = req.body;

    if (!repo_id || !name || !owner || !full_name || !url || !user_id) {
        return res.status(400).json({ message: '필수 값이 누락되었습니다.' });
    }

    const query = `INSERT INTO bookmarks (repo_id, name, owner, full_name, url, user_id, description) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [repo_id, name, owner, full_name, url, user_id, description], function(err) {
        if (err) {
            console.error('북마크 저장 중 오류 발생:', err);
            return res.status(500).json({ message: '북마크를 저장하지 못했습니다.' });
        }
        res.json({ message: '북마크 저장 성공', bookmarkId: this.lastID });
    });
});

// 북마크 목록 가져오기
app.get('/bookmarks', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: '토큰이 없습니다.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('JWT 검증 오류:', err);
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.', error: err.message });
        }

        const userId = decoded.userId;
        const query = `SELECT id, repo_id, name, owner, full_name, url, description FROM bookmarks WHERE user_id = ?`;

        db.all(query, [userId], (err, rows) => {
            if (err) {
                console.error('북마크 로드 중 오류 발생:', err);
                return res.status(500).json({ message: '북마크를 불러오지 못했습니다.', error: err.message });
            }
            console.log('북마크 목록:', rows); // 로그 추가
            res.json(rows);
        });
    });
});

// 북마크 삭제 API
app.delete('/bookmarks/:id', (req, res) => {
    const bookmarkId = req.params.id;

    db.run('DELETE FROM bookmarks WHERE id = ?', [bookmarkId], function(err) {
        if (err) {
            console.error('북마크 삭제 중 오류 발생:', err);
            return res.status(500).json({ message: '북마크를 삭제하지 못했습니다.' });
        }

        if (this.changes > 0) {
            res.json({ message: '북마크 삭제 성공' });
        } else {
            res.status(404).json({ message: '북마크를 찾을 수 없습니다.' });
        }
    });
});

// 리포지토리 내용 가져오기 API
app.get('/repo/:owner/:repo/contents', async (req, res) => {
    const { owner, repo } = req.params;
    const path = req.query.path || '';

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('리포지토리 내용 가져오기 오류:', error);
        res.status(500).json({ message: '리포지토리 내용을 불러오지 못했습니다.' });
    }
});

// 파일 내용 가져오기 API
app.get('/repo/:owner/:repo/contents/:path', async (req, res) => {
    const { owner, repo, path } = req.params;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw',
            },
            responseType: 'text',
        });

        if (response.status === 200) {
            console.log('파일 내용 가져오기 성공:', url); // 로그 추가
            res.send(response.data);
        } else {
            console.error('파일 내용 가져오기 실패:', url, response.status, response.statusText); // 로그 추가
            res.status(response.status).send({ message: '파일을 불러오지 못했습니다.', status: response.status, statusText: response.statusText });
        }
    } catch (error) {
        console.error('파일 내용 가져오기 오류:', url, error.message); // 로그 추가
        res.status(500).send({ message: '파일을 불러오지 못했습니다.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});