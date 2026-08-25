import { Navigate, Route, Routes } from 'react-router-dom'
import { useIdentity } from './lib/IdentityContext'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import PostDetail from './pages/PostDetail'
import Admin from './pages/Admin'
import './App.css'

// 사진 올리기처럼 "누가 썼는지"가 반드시 필요한 화면만 막는다.
// 구경(피드·게시물 상세)과 좋아요는 이름 없이도 가능하다.
function RequireIdentity({ children }) {
  const { identity, authReady } = useIdentity()
  if (!authReady) return <div className="page center">준비 중...</div>
  if (!identity) return <Navigate to="/" replace />
  return children
}

function App() {
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
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
