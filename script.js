const apiUrl = 'http://localhost:3000';  // API 엔드포인트
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // .env 파일에서 GitHub API 토큰 가져오기

// 전역 변수로 owner와 repo를 저장
let currentOwner = '';
let currentRepo = '';
let currentPath = '';
let pathStack = [];

// 리포지토리 설명을 한국어로 번역하는 함수
async function translateDescription(description) {
    // TODO: 번역 API를 사용하여 description을 한국어로 번역
    // 예시: const translatedDescription = await translateApi.translate(description, 'ko');
    // 현재는 번역 API가 없으므로 임시로 description을 그대로 반환
    return description;
}

// 추천 리포지토리 가져오기
async function loadRecommendations() {
    try {
        const response = await fetch(`${apiUrl}/recommendations`);
        if (!response.ok) {
            throw new Error(`추천 리포지토리 로드 실패: ${response.status} ${response.statusText}`);
        }
        const repos = await response.json();
        const recommendationsList = document.getElementById("recommendationsList");
        recommendationsList.innerHTML = "";

        for (const repo of repos) {
            const translatedDescription = await translateDescription(repo.description || "설명이 제공되지 않습니다.");
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <a href="#" onclick="openRepoModal('${repo.owner.login}', '${repo.name}')">${repo.name}</a>
                <p>${translatedDescription}</p>
                <p>소유자: ${repo.owner.login}</p>
                <button onclick="toggleBookmark('${repo.id}', '${repo.name}', '${repo.owner.login}', '${repo.html_url}', '${repo.description}')">북마크 추가</button>
            `;
            recommendationsList.appendChild(listItem);
        }
    } catch (error) {
        console.error("추천 리포지토리 로드 중 오류 발생:", error);
        alert(`추천 리포지토리 로드 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 로그인 폼 표시
function showLoginForm() {
    document.getElementById('authModal').style.display = 'block';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

// 회원가입 폼 표시
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// 로그인 요청: 로그인 성공 시 토큰과 userId를 localStorage에 저장
async function submitLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch(`${apiUrl}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // 토큰과 함께 사용자 아이디를 localStorage에 저장합니다.
        localStorage.setItem("token", result.token);
        localStorage.setItem("user_id", result.userId);
        console.log("로그인 성공! 저장된 토큰:", result.token);
        
        // 로그인 후 페이지 새로고침
        window.location.reload();
    } catch (error) {
        console.error("로그인 실패:", error);
        alert(`로그인 실패: ${error.message}`);
    }
}

// 회원가입 처리
async function submitRegister(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    if (response.ok) {
        alert('회원가입 성공');
        showLoginForm();
    } else {
        alert(result.error);
    }
}

// 로그아웃 처리
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    toggleLogin();
    document.getElementById('bookmarksList').innerHTML = '';
    document.getElementById('recommendationsList').innerHTML = '';
}

// 로그인 상태 확인 및 버튼 전환
function toggleLogin() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
    } else {
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
    }
}

// 토큰에서 사용자 ID 추출
function getUserIdFromToken(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || null;
    } catch (error) {
        console.error("토큰 파싱 오류:", error);
        return null;
    }
}

// 북마크 추가 및 삭제를 위한 함수 (원하는 경우 getUserIdFromToken 대신 localStorage에서 user_id 사용 가능)
async function toggleBookmark(repoId, name, owner, url, description) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }

    // 토큰에서 사용자 ID를 추출하거나 직접 localStorage에서 가져옵니다.
    const userId = getUserIdFromToken(token) || localStorage.getItem('user_id');
    if (!userId) {
        alert('잘못된 사용자 정보입니다.');
        return;
    }

    if (!repoId || !name || !owner || !url) {
        alert('필수 값이 누락되었습니다.');
        return;
    }

    const response = await fetch(`${apiUrl}/bookmarks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, repo_id: repoId, name, owner, full_name: `${owner}/${name}`, url, description })
    });

    const result = await response.json();
    if (response.ok) {
        alert('북마크 추가 성공');
        loadBookmarks();
    } else {
        alert(result.message);
    }
}

// 북마크 목록 가져오기
async function loadBookmarks() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.log("🚨 로그인 필요! 북마크 로드 중단.");
            showLoginForm();
            return;
        }

        console.log("✅ 북마크 불러오기 요청 시작, 사용된 토큰:", token);

        const response = await fetch(`${apiUrl}/bookmarks`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            console.error("서버 응답 오류:", errorResponse);
            if (response.status === 401) {
                showLoginForm();
                return;
            }
            throw new Error(`서버 응답 오류: ${response.status}`);
        }

        const bookmarks = await response.json();
        console.log("📌 받은 북마크 데이터:", bookmarks);

        if (!Array.isArray(bookmarks)) {
            throw new Error("올바른 데이터 형식이 아닙니다.");
        }

        const bookmarksList = document.getElementById("bookmarksList");
        if (!bookmarksList) {
            console.error("❌ bookmarksList 요소를 찾을 수 없습니다!");
            return;
        }

        bookmarksList.innerHTML = ""; // 기존 목록 초기화

        // 북마크 UI 업데이트
        for (const bookmark of bookmarks) {
            const translatedDescription = await translateDescription(bookmark.description || "설명이 제공되지 않습니다.");
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <a href="#" onclick="openRepoModal('${bookmark.owner}', '${bookmark.name}')">
                    ${bookmark.name}
                </a>
                <p>${translatedDescription}</p>
                <p>소유자: ${bookmark.owner}</p>
                <button onclick="removeBookmark('${bookmark.id}')">삭제</button>
            `;
            bookmarksList.appendChild(listItem);
        }

        console.log("✅ 북마크 UI 업데이트 완료!");
    } catch (error) {
        console.error("❌ 북마크 로드 중 오류 발생:", error);
    }
}

// 북마크 삭제
function removeBookmark(repoId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }

    fetch(`${apiUrl}/bookmarks/${repoId}`, {
        method: "DELETE",
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            response.json().then(err => console.error("서버 응답 오류:", err));
            throw new Error("삭제 실패: " + response.status);
        }
        return response.json();
    })
    .then(data => {
        alert(data.message);
        loadBookmarks();
    })
    .catch(error => console.error("북마크 삭제 중 오류 발생:", error));
}

// 모달 닫기
function closeModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('repoModal').style.display = 'none';
}

// 리포지토리 클릭 시 모달 열기 및 내용 가져오기
async function openRepoModal(owner, repo) {
    currentOwner = owner;
    currentRepo = repo;
    document.getElementById("repoModal").style.display = "block";
    document.getElementById("repoTitle").textContent = repo;
    currentPath = '';
    pathStack = [];
    await fetchRepoContents(owner, repo, '');
}

// 리포지토리 내부 파일 및 폴더 가져오기
async function fetchRepoContents(owner, repo, path) {
    try {
        const response = await fetch(`${apiUrl}/repo/${owner}/${repo}/contents?path=${path}`);
        if (!response.ok) throw new Error('리포지토리 내용을 불러오지 못했습니다.');
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('리포지토리 내용을 불러오지 못했습니다.');
        }

        const repoContents = document.getElementById("repoContents");
        repoContents.innerHTML = "";

        data.forEach(item => {
            const listItem = document.createElement("li");
            listItem.textContent = item.name;
            listItem.onclick = () => {
                if (item.type === "dir") {
                    enterDirectory(owner, repo, item.name);
                } else {
                    fetchFileContent(owner, repo, item.path);
                }
            };
            repoContents.appendChild(listItem);
        });

        document.getElementById("backButton").style.display = pathStack.length > 0 ? "block" : "none";
        document.getElementById("fileViewer").style.display = "none";
    } catch (error) {
        console.error("리포지토리 내용을 불러오는 중 오류 발생:", error);
    }
}

// 디렉터리 이동
function enterDirectory(owner, repo, dirName) {
    pathStack.push(currentPath);
    currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
    fetchRepoContents(owner, repo, currentPath);
}

// 뒤로 가기
function goBack() {
    if (pathStack.length > 0) {
        currentPath = pathStack.pop();
        fetchRepoContents(currentOwner, currentRepo, currentPath);
    }
}

// 파일 내용 가져오기
async function fetchFileContent(owner, repo, filePath) {
    try {
        console.log('파일 내용 가져오기 시도:', owner, repo, filePath); // 로그 추가

        if (!GITHUB_TOKEN || GITHUB_TOKEN === 'YOUR_GITHUB_TOKEN') {
            console.error('GitHub API 토큰이 설정되지 않았습니다.');
            alert('GitHub API 토큰이 설정되지 않았습니다. .env 파일을 확인하고 토큰을 입력해주세요.');
            document.getElementById("fileViewer").style.display = "block";
            document.getElementById("fileName").textContent = filePath;
            document.getElementById("fileContent").textContent = "GitHub API 토큰이 설정되지 않았습니다. .env 파일을 확인하고 토큰을 입력해주세요.";
            return;
        }

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`, // GitHub API 토큰 사용
                'Accept': 'application/vnd.github.v3.raw', // raw content를 받기 위해 추가
            },
        });

        if (response.status === 401) {
            console.error('GitHub API 인증 실패:', owner, repo, filePath); // 로그 추가
            document.getElementById("fileViewer").style.display = "block";
            document.getElementById("fileName").textContent = filePath;
            document.getElementById("fileContent").textContent = "GitHub API 인증에 실패했습니다. 토큰을 확인해주세요.";
            return;
        }

        if (response.status === 404) {
            console.log('파일을 찾을 수 없습니다:', owner, repo, filePath); // 로그 추가
            document.getElementById("fileViewer").style.display = "block";
            document.getElementById("fileName").textContent = filePath;
            document.getElementById("fileContent").textContent = "파일을 찾을 수 없습니다.";
            return;
        }

        if (!response.ok) {
            console.error('파일 내용 가져오기 실패:', owner, repo, filePath, response.status, response.statusText); // 로그 추가
            throw new Error(`파일 내용을 불러오지 못했습니다. HTTP 상태 코드: ${response.status}`);
        }

        const fileExtension = filePath.split('.').pop().toLowerCase();

        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(fileExtension)) {
            document.getElementById("fileViewer").style.display = "block";
            document.getElementById("fileName").textContent = filePath;
            document.getElementById("fileContent").textContent = "이미지 파일은 미리보기로 볼 수 없습니다.";
            return;
        }

        const data = await response.text();
        console.log('파일 내용 가져오기 성공:', owner, repo, filePath); // 로그 추가
        document.getElementById("fileViewer").style.display = "block";
        document.getElementById("fileName").textContent = filePath;
        document.getElementById("fileContent").textContent = data;

    } catch (error) {
        console.error("파일 내용을 불러오는 중 오류 발생:", error);
        document.getElementById("fileViewer").style.display = "block";
        document.getElementById("fileName").textContent = filePath;
        document.getElementById("fileContent").textContent = "파일 내용을 불러오는 중 오류가 발생했습니다.";
    }
}

// 모달 닫기
function closeRepoModal() {
    document.getElementById('repoModal').style.display = 'none';
}

// 추천 리포지토리와 검색 리포지토리 불러오기
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM 로드 완료!");
    
    function searchRepositories(event) {
        try {
            const query = event.target?.value?.trim();
            if (!query) return;
    
            fetch(`${apiUrl}/search?query=${query}`)
                .then(response => response.json())
                .then(async data => {
                    if (!Array.isArray(data)) {
                        throw new Error("잘못된 검색 응답");
                    }
                    console.log("🔍 검색 결과:", data);
                    displaySearchResults(data);
                })
                .catch(error => console.error("🚨 검색 중 오류 발생:", error));
        } catch (error) {
            console.error("🚨 검색 실행 중 오류 발생:", error);
        }
    }
    
    async function displaySearchResults(repositories) {
        const resultsList = document.getElementById("searchResultsList");
        if (!resultsList) {
            console.error("❌ 오류: searchResultsList 요소를 찾을 수 없음!");
            return;
        }
    
        resultsList.innerHTML = ""; 
    
        for (const repo of repositories) {
            const translatedDescription = await translateDescription(repo.description || "설명이 제공되지 않습니다.");
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <a href="#" onclick="openRepoModal('${repo.owner.login}', '${repo.name}')">
                    ${repo.name}
                </a>
                <p>${translatedDescription}</p>
                <p>소유자: ${repo.owner.login}</p>
                <button onclick="toggleBookmark('${repo.id}', '${repo.name}', '${repo.owner.login}', '${repo.html_url}', '${repo.description}')">
                    북마크 추가
                </button>
            `;
            resultsList.appendChild(listItem);
        }
    
        console.log("✅ 검색 결과가 화면에 추가됨!");
    }
    
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", searchRepositories);
    } else {
        console.error("❌ 오류: 검색 입력창(searchInput)을 찾을 수 없음!");
    }
});