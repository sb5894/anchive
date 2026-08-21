import { useEffect, useState } from 'react'
import {
  adminSignIn,
  adminSignOut,
  subscribeAdminAuth,
  subscribeDeletedPosts,
  subscribeEditedComments,
  subscribeEditedPosts,
} from '../lib/admin'

export default function Admin() {
  const [user, setUser] = useState(undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [deletedPosts, setDeletedPosts] = useState([])
  const [editedPosts, setEditedPosts] = useState([])
  const [editedComments, setEditedComments] = useState([])

  useEffect(() => subscribeAdminAuth(setUser), [])

  useEffect(() => {
    if (!user || user.isAnonymous) return
    const unsub1 = subscribeDeletedPosts(setDeletedPosts)
    const unsub2 = subscribeEditedComments(setEditedComments)
    const unsub3 = subscribeEditedPosts(setEditedPosts)
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [user])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    try {
      await adminSignIn(email, password)
    } catch (err) {
      console.error(err)
      setError('로그인에 실패했습니다.')
    }
  }

  if (user === undefined) return <div className="page center">확인 중...</div>

  if (!user || user.isAnonymous) {
    return (
      <div className="page admin-login">
        <h1>관리자 로그인</h1>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit">
            로그인
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="page admin">
      <header className="feed-header">
        <h1>관리자 로그</h1>
        <button onClick={() => adminSignOut()}>로그아웃</button>
      </header>

      <section>
        <h2>삭제된 게시물</h2>
        {deletedPosts.length === 0 && <p className="empty">없음</p>}
        {deletedPosts.map((p) => (
          <div key={p.id} className="log-item">
            <span>
              {p.authorInfo?.grade}-{p.authorInfo?.class} {p.authorInfo?.name}
            </span>
            <span>{p.caption}</span>
          </div>
        ))}
      </section>

      <section>
        <h2>수정된 게시물</h2>
        {editedPosts.length === 0 && <p className="empty">없음</p>}
        {editedPosts.map((p) => (
          <div key={p.id} className="log-item">
            <span>
              {p.authorInfo?.grade}-{p.authorInfo?.class} {p.authorInfo?.name}
            </span>
            <span>현재: {p.caption}</span>
            <details>
              <summary>이력 ({p.history?.length || 0})</summary>
              {p.history?.map((h, i) => (
                <div key={i} className="history-entry">
                  {h.caption}
                </div>
              ))}
            </details>
          </div>
        ))}
      </section>

      <section>
        <h2>수정/삭제된 댓글</h2>
        {editedComments.length === 0 && <p className="empty">없음</p>}
        {editedComments.map((c) => (
          <div key={c.id} className="log-item">
            <span>
              {c.authorInfo?.grade}-{c.authorInfo?.class} {c.authorInfo?.name}
            </span>
            <span>{c.deleted ? '삭제됨' : '수정됨'}: {c.text}</span>
            <details>
              <summary>이력 ({c.history?.length || 0})</summary>
              {c.history?.map((h, i) => (
                <div key={i} className="history-entry">
                  {h.text}
                </div>
              ))}
            </details>
          </div>
        ))}
      </section>
    </div>
  )
}
