require("dotenv").config();
const express = require("express");
const axios = require("axios");
const db = require("./db");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// ✅ GitHub 리포지토리 검색 API
app.get("/search", async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "검색어를 입력하세요." });

    try {
        const response = await axios.get("https://api.github.com/search/repositories", {
            params: { q: query },
            headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
        });

        res.json(response.data.items);
    } catch (error) {
        res.status(500).json({ error: "GitHub API 요청 실패", details: error.response?.data || error.message });
    }
});

// ✅ 2. 리포지토리 북마크 추가
app.post("/bookmarks", (req, res) => {
  const { repo_id, name, owner, full_name, url } = req.body;

  if (!repo_id || !name || !owner || !full_name || !url) {
    console.error("필요한 데이터가 부족합니다.");
    return res.status(400).json({ error: "필요한 데이터가 부족합니다." });
  }

  // 쿼리 실행 전에 데이터 확인
  console.log("저장할 데이터:", { repo_id, name, owner, full_name, url });

  const query = `INSERT INTO bookmarks (repo_id, name, owner, full_name, url) VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [repo_id, name, owner, full_name, url], function (err) {
    if (err) {
      console.error("DB 에러:", err.message); // DB 에러 확인
      return res.status(500).json({ error: "북마크 저장 실패", details: err.message });
    }

    console.log(`북마크 저장 완료, ID: ${this.lastID}`);
    res.json({ message: "북마크 저장 완료", id: this.lastID });
  });
});

// ✅ 3. 북마크한 리포지토리 조회
app.get("/bookmarks", (req, res) => {
  db.all("SELECT * FROM bookmarks", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "북마크 조회 실패" });
    res.json(rows);
  });
});

// ✅ 4. 북마크 삭제
app.delete("/bookmarks/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM bookmarks WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "북마크 삭제 실패" });
    res.json({ message: "북마크 삭제 완료" });
  });
});

app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
