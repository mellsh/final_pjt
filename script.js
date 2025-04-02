const apiUrl = 'http://localhost:3000';  // 중복 선언 방지, 한 번만 선언

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

// ✅ 로그인 요청 (토큰 저장 및 북마크 로드)
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

        localStorage.setItem("token", result.token);
        console.log("로그인 성공!");
        
        // ✅ 로그인 후 북마크 불러오기
        loadBookmarks();
    } catch (error) {
        console.error("로그인 실패:", error);
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

// 북마크 추가 및 삭제 토글
async function toggleBookmark(repoId, name, owner, url) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
        alert('잘못된 사용자 정보입니다.');
        return;
    }

    const response = await fetch(`${apiUrl}/bookmarks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, repo_id: repoId, name, owner, url })
    });

    const result = await response.json();
    if (response.ok) {
        alert('북마크 추가 성공');
        loadBookmarks();
    } else {
        alert(result.message);
    }
}

// 북마크 목록 가져오기 (디버깅 코드 추가)
async function loadBookmarks() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.log("🚨 로그인 필요! 북마크 로드 중단.");
            return;
        }

        console.log("✅ 북마크 불러오기 요청 시작");

        const response = await fetch(`${apiUrl}/bookmarks`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }

        const bookmarks = await response.json();
        
        console.log("📌 받은 북마크 데이터:", bookmarks);

        // ✅ bookmarks가 배열인지 확인
        if (!Array.isArray(bookmarks)) {
            throw new Error("올바른 데이터 형식이 아닙니다.");
        }

        const bookmarksList = document.getElementById("bookmarksList");

        // ✅ bookmarksList 요소가 존재하는지 확인
        if (!bookmarksList) {
            console.error("❌ bookmarksList 요소를 찾을 수 없습니다!");
            return;
        }

        bookmarksList.innerHTML = ""; // 기존 목록 초기화

        // 📌 북마크 목록 UI 업데이트
        bookmarks.forEach(bookmark => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <a href="${bookmark.url}" target="_blank">${bookmark.name}</a>
                <p>소유자: ${bookmark.owner}</p>
                <button onclick="removeBookmark('${bookmark.id}')">삭제</button>
            `;
            bookmarksList.appendChild(listItem);
        });

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

// 추천 리포지토리 가져오기
function fetchRecommendations() {
    fetch(`${apiUrl}/recommendations`)
        .then(response => response.json())
        .then(repos => {
            const recommendationsList = document.getElementById("recommendationsList");
            recommendationsList.innerHTML = "";
            
            repos.forEach(repo => {
                const listItem = document.createElement("li");
                listItem.innerHTML = `
                    <a href="${repo.url}" target="_blank">${repo.name}</a>
                    <p>${repo.description ? repo.description : "설명이 제공되지 않습니다."}</p>
                    <p>소유자: ${repo.owner}</p>
                `;
                recommendationsList.appendChild(listItem);
            });
        })
        .catch(error => console.error("추천 리포지토리 로드 중 오류 발생:", error));
}

async function addBookmark(repoId, name, owner, fullName, url) {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
        alert('로그인이 필요합니다.');
        return;
    }

    console.log("북마크 추가 요청:", { repoId, name, owner, fullName, url });

    const response = await fetch(`${apiUrl}/bookmarks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, repo_id: repoId, name, owner, full_name: fullName, url })
    });

    const result = await response.json();
    if (response.ok) {
        alert('북마크 추가 성공');
        loadBookmarks();  // 북마크 목록 새로고침
    } else {
        alert(result.message);
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('authModal').style.display = 'none';
}

let currentPath = "";  // 현재 탐색 중인 경로
let repoOwner = "";
let repoName = "";
let pathStack = [];  // 뒤로 가기 기능을 위한 경로 스택

// 리포지토리 클릭 시 모달 열기
function openRepoModal(owner, repo) {
    repoOwner = owner;
    repoName = repo;
    currentPath = ""; // 최상위 디렉터리부터 시작
    pathStack = [];
    fetchRepoContents();
    document.getElementById("repoModal").style.display = "block";
}

// 리포지토리 내부 파일 및 폴더 가져오기
function fetchRepoContents() {
    fetch(`/repo-contents?owner=${repoOwner}&repo=${repoName}&path=${currentPath}`)
        .then(response => response.json())
        .then(data => {
            const repoContents = document.getElementById("repoContents");
            repoContents.innerHTML = "";

            data.forEach(item => {
                const li = document.createElement("li");
                li.textContent = item.name;
                li.onclick = () => {
                    if (item.type === "dir") {
                        enterDirectory(item.name);
                    } else {
                        fetchFileContent(item.path);
                    }
                };
                repoContents.appendChild(li);
            });

            document.getElementById("backButton").style.display = pathStack.length > 0 ? "block" : "none";
            document.getElementById("fileViewer").style.display = "none";
        });
}

// 디렉터리 이동
function enterDirectory(dirName) {
    pathStack.push(currentPath);
    currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
    fetchRepoContents();
}

// 뒤로 가기
function goBack() {
    if (pathStack.length > 0) {
        currentPath = pathStack.pop();
        fetchRepoContents();
    }
}

// 파일 내용 가져오기
function fetchFileContent(filePath) {
    fetch(`/file-content?owner=${repoOwner}&repo=${repoName}&path=${filePath}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById("fileViewer").style.display = "block";
            document.getElementById("fileName").textContent = filePath;
            document.getElementById("fileContent").textContent = data.content;
        });
}

// 모달 닫기
function closeRepoModal() {
    document.getElementById("repoModal").style.display = "none";
}
    
function loadRecommendations() {
    console.log("추천 리포지토리 불러오기 실행!");  // 디버깅용 로그

    fetch(`${apiUrl}/recommendations`)
        .then(response => response.json())
        .then(repos => {
            console.log("받은 추천 리포지토리 데이터:", repos); // 데이터 확인용 로그

            const recommendationsList = document.getElementById("recommendationsList");
            if (!recommendationsList) {
                console.error("recommendationsList 요소를 찾을 수 없음!");
                return;
            }

            recommendationsList.innerHTML = "";  // 기존 목록 비우기

            repos.forEach(repo => {
                const listItem = document.createElement("li");
                listItem.innerHTML = `
                    <a href="${repo.url}" target="_blank">${repo.name}</a>
                    <p>${repo.description ? repo.description : "설명이 제공되지 않습니다."}</p>
                    <p>소유자: ${repo.owner}</p>
                    <button onclick="addBookmark('${repo.id}', '${repo.name}', '${repo.owner}', '${repo.full_name}', '${repo.url}')">
                        북마크 추가
                    </button>
                `;
                recommendationsList.appendChild(listItem);
            });
        })
        .catch(error => console.error("추천 리포지토리 로드 중 오류 발생:", error));
}

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM 로드 완료!");
    
    // ✅ 검색 기능 정의
    function searchRepositories(event) {
        try {
            const query = event.target?.value?.trim();
            if (!query) return;
    
            fetch(`${apiUrl}/search?query=${query}`)
                .then(response => response.json())
                .then(data => {
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
    
    // ✅ 검색 결과 표시 함수
    function displaySearchResults(repositories) {
        const resultsList = document.getElementById("searchResultsList");
        if (!resultsList) {
            console.error("❌ 오류: searchResultsList 요소를 찾을 수 없음!");
            return;
        }
    
        resultsList.innerHTML = ""; 
    
        repositories.forEach(repo => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <a href="#" onclick="openRepoModal('${repo.owner}', '${repo.name}')">
                    ${repo.name}
                </a>
                <p>${repo.description ? repo.description : "설명이 제공되지 않습니다."}</p>
                <p>소유자: ${repo.owner}</p>
                <button onclick="addBookmark('${repo.id}', '${repo.name}', '${repo.owner}', '${repo.full_name}', '${repo.url}')">
                    북마크 추가
                </button>
            `;
            resultsList.appendChild(listItem);
        });
    
        console.log("✅ 검색 결과가 화면에 추가됨!");
    }
    
    // ✅ 검색창 이벤트 리스너 추가
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", searchRepositories);
    } else {
        console.error("❌ 오류: 검색 입력창(searchInput)을 찾을 수 없음!");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    console.log("페이지 로드 완료");
    toggleLogin();
    loadRecommendations();
    if (localStorage.getItem('token')) {
        loadBookmarks();  // 로그인한 경우 북마크 불러오기
    }
});