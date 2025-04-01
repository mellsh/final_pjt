const apiUrl = 'http://localhost:3000';  // 백엔드 API URL

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

// 로그인 처리
async function submitLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    if (response.ok) {
        localStorage.setItem('token', result.token);
        toggleLogin();
        fetchBookmarks();
        fetchRecommendations();
        closeModal();
    } else {
        alert(result.error);
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

// 로그인 상태에 따라 버튼 전환
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

// 검색어로 GitHub 리포지토리 검색
async function searchRepositories() {
    const query = document.getElementById('searchQuery').value;
    if (!query) return;

    const response = await fetch(`${apiUrl}/search?query=${query}`);
    const repos = await response.json();

    const repoList = document.getElementById('repoList');
    repoList.innerHTML = '';
    repos.forEach(repo => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <a href="${repo.html_url}" target="_blank">${repo.name}</a><br>
            Owner: ${repo.owner.login}
        `;
        const bookmarkButton = document.createElement('button');
        bookmarkButton.textContent = 'Bookmark';
        bookmarkButton.onclick = () => addBookmark(repo.id, repo.name, repo.owner.login, repo.full_name, repo.html_url);
        listItem.appendChild(bookmarkButton);
        repoList.appendChild(listItem);
    });
}

// 북마크 추가
async function addBookmark(repoId) {
    const token = localStorage.getItem('token');  // localStorage에서 토큰 가져오기
    const userId = localStorage.getItem('user_id');  // 사용자의 user_id 가져오기

    if (!token || !userId) {
        console.error('로그인이 필요합니다.');
        return;
    }

    fetch(`${apiUrl}/bookmarks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, repo_id: repoId })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('북마크 추가 실패');
        }
        return response.json();
    })
    .then(data => {
        console.log(data.message);
        // UI 업데이트
    })
    .catch(error => {
        console.error('오류 발생:', error);
    });
}

// 토큰에서 사용자 ID 추출
function getUserIdFromToken(token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
}

// 북마크 목록 가져오기
async function fetchBookmarks() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`${apiUrl}/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        console.error('북마크 조회 실패');
        return;
    }

    const bookmarks = await response.json();
    const bookmarksList = document.getElementById('bookmarksList');
    bookmarksList.innerHTML = '';  // 기존 내용 지우기

    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<li>북마크가 없습니다.</li>';
    } else {
        bookmarks.forEach(bookmark => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <a href="${bookmark.url}" target="_blank">${bookmark.full_name}</a><br>
                Owner: ${bookmark.owner}
            `;
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteBookmark(bookmark.id);
            listItem.appendChild(deleteButton);

            bookmarksList.appendChild(listItem);
        });
    }
}

// 예시로 deleteBookmark 함수가 있을 경우
async function deleteBookmark(repoId) {
    const token = localStorage.getItem('token');  // localStorage에서 토큰 가져오기
    const userId = localStorage.getItem('user_id');  // 사용자의 user_id 가져오기

    if (!token || !userId) {
        console.error('로그인이 필요합니다.');
        return;
    }

    fetch(`${apiUrl}/bookmarks/${repoId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })  // user_id를 함께 보내기
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('북마크 삭제 실패');
        }
        return response.json();
    })
    .then(data => {
        console.log(data.message);
        // UI 업데이트
    })
    .catch(error => {
        console.error('오류 발생:', error);
    });
}





// 추천 리포지토리 가져오기
async function fetchRecommendations() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiUrl}/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        console.error('추천 리포지토리 조회 실패');
        return;
    }

    const recommendations = await response.json();
    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';  // 기존 내용 지우기

    if (recommendations.length === 0) {
        recommendationsList.innerHTML = '<li>추천 리포지토리가 없습니다.</li>';
    } else {
        recommendations.forEach(repo => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <a href="${repo.html_url}" target="_blank">${repo.name}</a><br>
                Owner: ${repo.owner.login}
            `;
            const bookmarkButton = document.createElement('button');
            bookmarkButton.textContent = 'Bookmark';
            bookmarkButton.onclick = () => addBookmark(repo.id, repo.name, repo.owner.login, repo.full_name, repo.html_url);
            listItem.appendChild(bookmarkButton);
            recommendationsList.appendChild(listItem);
        });
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('authModal').style.display = 'none';
}

// 초기화: 로그인 상태에 따라 버튼 전환 및 북마크, 추천 리포지토리 로드
document.addEventListener('DOMContentLoaded', () => {
    toggleLogin();
    if (localStorage.getItem('token')) {
        fetchBookmarks();
        fetchRecommendations();
    }
});
