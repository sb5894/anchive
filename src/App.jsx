import { Navigate, Route, Routes } from 'react-router-dom'
import { useIdentity } from './lib/IdentityContext'
import MainLayout from './components/MainLayout'
import Entry from './pages/Entry'
import Timeline from './pages/Timeline'
import Feed from './pages/Feed'
import About from './pages/About'
import Upload from './pages/Upload'
import PostDetail from './pages/PostDetail'
import Admin from './pages/Admin'
import './App.css'

function RequireIdentity({ children }) {
  const { identity, authReady, isAnonymous } = useIdentity()
  if (!authReady) return <div className="page center">준비 중...</div>
  // 관리자 계정(비익명 로그인)으로는 학생 화면에 못 들어가게 막는다.
  // 안 막으면 관리자 세션에 남아있는 예전 학생 신원으로 글/댓글을 쓸 수 있는데,
  // 화면엔 학생 이름으로 보이지만 실제 authorUid는 관리자 uid로 저장돼 소유권이 꼬인다.
  if (!isAnonymous) return <Navigate to="/" replace />
  if (!identity) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route
        path="/timeline"
        element={
          <RequireIdentity>
            <MainLayout>
              <Timeline />
            </MainLayout>
          </RequireIdentity>
        }
      />
      <Route
        path="/feed"
        element={
          <RequireIdentity>
            <MainLayout>
              <Feed />
            </MainLayout>
          </RequireIdentity>
        }
      />
      <Route
        path="/about"
        element={
          <RequireIdentity>
            <MainLayout>
              <About />
            </MainLayout>
          </RequireIdentity>
        }
      />
      <Route
        path="/upload"
        element={
          <RequireIdentity>
            <Upload />
          </RequireIdentity>
        }
      />
      <Route
        path="/post/:postId"
        element={
          <RequireIdentity>
            <PostDetail />
          </RequireIdentity>
        }
      />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
