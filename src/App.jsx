import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useIdentity } from './lib/IdentityContext'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import PostDetail from './pages/PostDetail'
import './App.css'

// 관리자 화면은 일반 사용자 경로에서는 쓰이지 않으니 별도 번들로 분리한다.
const Admin = lazy(() => import('./pages/Admin'))

// 사진 올리기처럼 "누가 썼는지"가 반드시 필요한 화면만 막는다.
// 구경(피드·게시물 상세)과 좋아요는 이름 없이도 가능하다.
function RequireIdentity({ children }) {
  const { identity, authReady } = useIdentity()
  if (!authReady) return <div className="page center">준비 중...</div>
  if (!identity) return <Navigate to="/" replace />
  return children
}

function App() {
  // 사진을 가져가는 쉬운 길(오른쪽 클릭 저장, 끌어다 놓기)을 막는다.
  // 스크린샷은 웹에서 막을 방법이 없다 — 이건 충동적인 저장을 줄이는 장치일 뿐이고,
  // 실제 보호는 사용법 안내의 약속 문구와 행사 현장의 지도에 의존한다.
  useEffect(() => {
    function blockMedia(e) {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') e.preventDefault()
    }
    document.addEventListener('contextmenu', blockMedia)
    document.addEventListener('dragstart', blockMedia)
    return () => {
      document.removeEventListener('contextmenu', blockMedia)
      document.removeEventListener('dragstart', blockMedia)
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Feed />} />
      <Route
        path="/upload"
        element={
          <RequireIdentity>
            <Upload />
          </RequireIdentity>
        }
      />
      <Route path="/post/:postId" element={<PostDetail />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<div className="page center">불러오는 중...</div>}>
            <Admin />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
