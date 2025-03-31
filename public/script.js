// GitHub 리포지토리 검색
async function searchRepositories(event) {
    event.preventDefault(); // 폼 제출 시 새로고침 방지

    const query = document.getElementById("searchInput").value;
    if (!query) {
        alert("검색어를 입력하세요!");
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/search?query=${query}`);
        if (!response.ok) throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);

        const data = await response.json();
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";  // 기존 검색 결과 비우기

        if (data.length === 0) {
            resultsDiv.innerHTML = "<p>검색 결과가 없습니다.</p>";
        } else {
            data.forEach(repo => {
                const repoElement = document.createElement("div");
                repoElement.classList.add("repo");
                repoElement.innerHTML = `
                    <h3>${repo.name}</h3>
                    <p>작성자: ${repo.owner.login}</p>
                    <button onclick="addBookmark('${repo.id}', '${repo.name}', '${repo.owner.login}', '${repo.full_name}', '${repo.html_url}')">북마크 추가</button>
                `;
                resultsDiv.appendChild(repoElement);
            });
        }
    } catch (error) {
        console.error("❌ 검색 실패:", error);
    }
}

// 북마크 추가
async function addBookmark(repo_id, name, owner, full_name, url) {
    console.log("북마크 추가 요청:", { repo_id, name, owner, full_name, url });

    try {
        const response = await fetch("http://localhost:3000/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repo_id, name, owner, full_name, url })
        });

        const data = await response.json();
        console.log("서버 응답:", data);

        if (response.ok) {
            showModal(`✅ '${name}' 리포지토리가 북마크에 추가되었습니다!`);
            loadBookmarks();  // 북마크 목록 갱신
        } else {
            showModal(`❌ 북마크 추가 실패: ${data.error}`);
        }
    } catch (error) {
        console.error("❌ 북마크 추가 실패:", error);
        showModal(`❌ 북마크 추가 실패: ${error.message}`);
    }
}

// 북마크 목록 로드
async function loadBookmarks() {
    try {
        const response = await fetch("http://localhost:3000/bookmarks");
        if (!response.ok) throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);

        const data = await response.json();
        const bookmarksDiv = document.getElementById("bookmarkList");
        bookmarksDiv.innerHTML = "";  // 기존 북마크 내용 비우기

        if (data.length === 0) {
            bookmarksDiv.innerHTML = "<p>저장된 북마크가 없습니다.</p>";
        } else {
            data.forEach(bookmark => {
                const bookmarkElement = document.createElement("div");
                bookmarkElement.classList.add("bookmark");
                bookmarkElement.innerHTML = `
                    <p>${bookmark.name} (작성자: ${bookmark.owner})</p>
                    <button onclick="deleteBookmark(${bookmark.id})">삭제</button>
                `;
                bookmarksDiv.appendChild(bookmarkElement);
            });
        }
    } catch (error) {
        console.error("❌ 북마크 로드 실패:", error);
    }
}

// 홈 버튼 클릭 시: 검색어와 검색 내용 초기화, 북마크만 표시
function goHome() {
    document.getElementById("searchInput").value = "";
    document.getElementById("results").innerHTML = "";
    loadBookmarks();
}

// 북마크 삭제
async function deleteBookmark(id) {
    try {
        const response = await fetch(`http://localhost:3000/bookmarks/${id}`, { method: "DELETE" });
        const data = await response.json();
        if (response.ok) {
            showModal(`✅ 북마크가 삭제되었습니다!`);
            loadBookmarks();  // 북마크 목록 갱신
        } else {
            showModal(`❌ 북마크 삭제 실패: ${data.error}`);
        }
    } catch (error) {
        console.error("❌ 북마크 삭제 실패:", error);
        showModal(`❌ 북마크 삭제 실패: ${error.message}`);
    }
}

// 모달 표시
function showModal(message) {
    const modal = document.getElementById("modal");
    const modalMessageText = document.getElementById("modalMessageText");
    modalMessageText.textContent = message;
    modal.style.display = "flex";
}

// 모달 닫기
function closeModal() {
    document.getElementById("modal").style.display = "none";
}

// 페이지 로드 시 북마크 목록 로드
window.onload = loadBookmarks;
