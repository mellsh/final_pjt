let token = "";  // 로그인 시 발급된 JWT 토큰을 저장하는 변수

// 로그인 함수 수정 (추가적인 오류 처리)
async function login() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) {
        showModal("아이디와 비밀번호를 입력하세요.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const data = await response.json();
            showModal(data.error || "로그인 실패");
            return;
        }

        const data = await response.json();
        if (data.message === "로그인 성공") {
            localStorage.setItem('token', data.token);  // JWT 토큰 저장
            updateUIAfterLogin();
            showModal("로그인 성공!");
            closeLoginModal();  // 로그인 모달 닫기
        } else {
            showModal("로그인 실패");
        }

    } catch (error) {
        console.error('로그인 중 오류:', error);
        showModal("로그인 중 오류가 발생했습니다.");
    }
}




// 회원가입 함수
async function signup() {
    const username = document.getElementById("signupUsername").value;
    const password = document.getElementById("signupPassword").value;

    if (!username || !password) {
        showModal("아이디와 비밀번호를 입력하세요.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.message === "회원가입 성공") {
            showModal("회원가입 성공!");
            closeSignupModal(); // 회원가입 모달 닫기
        } else {
            showModal(data.error || "회원가입 실패");
        }
    } catch (error) {
        showModal("회원가입 중 오류가 발생했습니다.");
    }
}


// 로그아웃 함수
function logout() {
    localStorage.removeItem('token');  // 로컬 스토리지에서 토큰 삭제
    updateUIAfterLogout();
    showModal("로그아웃 되었습니다.");
}

// 로그인 여부에 따른 UI 변경
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('token');
    if (token) {
        updateUIAfterLogin();
    } else {
        updateUIAfterLogout();
    }
});


// 모달 닫기
function closeLoginModal() {
    document.getElementById("loginModal").style.display = "none";
}

function closeRegisterModal() {
    document.getElementById("registerModal").style.display = "none";
}

// 로그인 버튼 클릭 시 로그인 모달 열기
function openLoginModal() {
    document.getElementById("loginModal").style.display = "flex";
}

// 회원가입 버튼 클릭 시 회원가입 모달 열기
function openRegisterModal() {
    document.getElementById("registerModal").style.display = "flex";
}
// 로그인 상태에 따라 UI 업데이트
function updateUIAfterLogin() {
    document.getElementById('loginBtn').style.display = "none";
    document.getElementById('registerBtn').style.display = "none";
    document.getElementById('logoutBtn').style.display = "inline-block";
    loadBookmarks();  // 북마크 목록 로드
}

// 로그아웃 상태에 따라 UI 업데이트
function updateUIAfterLogout() {
    document.getElementById('loginBtn').style.display = "inline-block";
    document.getElementById('registerBtn').style.display = "inline-block";
    document.getElementById('logoutBtn').style.display = "none";
    document.getElementById("bookmarkList").innerHTML = "";  // 북마크 목록 비우기
}

// 검색 기능
async function searchRepositories() {
    const query = document.getElementById("searchInput").value;

    if (!query) {
        showModal("검색어를 입력하세요.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/search?query=${encodeURIComponent(query)}`);

        if (!response.ok) {
            const errorData = await response.json();
            showModal("검색 중 오류가 발생했습니다: " + errorData.error);
            return;
        }

        const data = await response.json();

        if (data.length === 0) {
            showModal("검색 결과가 없습니다.");
        } else {
            displaySearchResults(data);  // 검색 결과 화면에 표시
        }
    } catch (error) {
        showModal("서버와의 통신 중 오류가 발생했습니다.");
    }
}


// 검색 결과 표시
function displaySearchResults(repositories) {
    const resultsDiv = document.getElementById("searchResults");
    resultsDiv.innerHTML = ""; // 기존 검색 결과 비우기

    repositories.forEach(repo => {
        const repoElement = document.createElement("div");
        repoElement.classList.add("repo");
        repoElement.innerHTML = `
            <h3>${repo.name}</h3>
            <p>작성자: ${repo.owner}</p>
            <p><a href="${repo.url}" target="_blank">리포지토리 보기</a></p>
            <button onclick="addBookmark('${repo.id}', '${repo.name}', '${repo.owner}', '${repo.full_name}', '${repo.url}')">북마크 추가</button>
        `;
        resultsDiv.appendChild(repoElement);
    });
}

// 북마크 추가 함수
async function addBookmark(repoId) {
    const token = localStorage.getItem('token');

    if (!token) {
        showModal("로그인 후 북마크를 추가할 수 있습니다.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/bookmarks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ repoId })
        });

        const data = await response.json();

        if (response.ok && data.message === "북마크 추가 성공") {
            showModal("북마크가 추가되었습니다.");
        } else {
            showModal(data.error || "북마크 추가 실패");
        }
    } catch (error) {
        showModal("북마크 추가 중 오류가 발생했습니다.");
    }
}

// 북마크 로드 함수
function loadBookmarks() {
    // 예시로 로컬 스토리지에서 북마크 데이터 로드
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    displayBookmarks(bookmarks); // 북마크를 UI에 표시하는 함수 (예: 테이블에 추가)
}

// 예시로 북마크를 UI에 표시하는 함수
function displayBookmarks(bookmarks) {
    const bookmarksContainer = document.getElementById('bookmarksContainer');
    bookmarksContainer.innerHTML = ''; // 기존 내용 비우기

    bookmarks.forEach(bookmark => {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.textContent = bookmark.name; // 북마크의 이름
        bookmarksContainer.appendChild(bookmarkElement);
    });
}

function displayBookmarks(bookmarks) {
    const bookmarksContainer = document.getElementById('bookmarksContainer');
    if (!bookmarksContainer) {
        console.error('bookmarksContainer 요소를 찾을 수 없습니다.');
        return;
    }

    bookmarksContainer.innerHTML = ''; // 기존 내용 비우기

    bookmarks.forEach(bookmark => {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.textContent = bookmark.name; // 북마크의 이름
        bookmarksContainer.appendChild(bookmarkElement);
    });
}

const bookmark = {
    repo_id: '12345',
    name: 'My Repo',
    owner: 'username',
    full_name: 'username/My Repo',
    url: 'https://github.com/username/My Repo',
    user_id: 'user123'
};

async function saveBookmark(bookmark) {
    try {
        const response = await fetch('http://localhost:3000/bookmarks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookmark)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '북마크 저장 실패');
        }

        const data = await response.json();
        console.log('북마크 저장 성공:', data);
    } catch (error) {
        console.error('북마크 저장 중 오류 발생:', error);
    }
}





// 로그인 및 회원가입 관련 함수들
async function loginUser(email, password) {
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            showModal("로그인 성공!");
            loadBookmarks(); // 로그인 후 북마크 목록 로드
        } else {
            showModal(`로그인 실패: ${data.error || "오류가 발생했습니다."}`);
        }
    } catch (error) {
        showModal("로그인 중 오류가 발생했습니다.");
        console.error(error);
    }
}

app.use((req, res, next) => {
    console.log('요청 본문:', req.body);  // 요청 본문을 로그로 출력
    next();
});



// 모달을 표시하는 함수
function showModal(message) {
    const modal = document.getElementById("modal");
    const modalMessage = document.getElementById("modalMessage");

    modalMessage.textContent = message;  // 모달에 메시지 넣기
    modal.style.display = "block";  // 모달 띄우기
}

// 모달 닫기 함수
function closeModal() {
    const modal = document.getElementById("modal");
    modal.style.display = "none";  // 모달 닫기
}

// 모달 닫기 버튼 클릭 시 호출
document.getElementById("closeModalButton").addEventListener("click", closeModal);


