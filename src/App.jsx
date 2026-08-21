import { Navigate, Route, Routes } from 'react-router-dom'
import { useIdentity } from './lib/IdentityContext'
import Entry from './pages/Entry'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import PostDetail from './pages/PostDetail'
import Admin from './pages/Admin'
import './App.css'

function RequireIdentity({ children }) {
  const { identity, authReady } = useIdentity()
  if (!authReady) return <div className="page center">준비 중...</div>
  if (!identity) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route
        path="/feed"
        element={
          <RequireIdentity>
            <Feed />
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
