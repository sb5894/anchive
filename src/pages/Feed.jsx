import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed } from '../lib/posts'
import PostCard from '../components/PostCard'

export default function Feed() {
  const { identity } = useIdentity()
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [posts, setPosts] = useState([])

  useEffect(() => subscribeEvents(setEvents), [])

  useEffect(() => {
    const unsub = subscribeFeed({ eventId: eventId || null }, setPosts)
    return unsub
  }, [eventId])

  return (
    <div className="page feed">
      <header className="feed-header">
        <h1>추억 앨범 게시판</h1>
        {identity && (
          <span className="whoami">
            {identity.grade}학년 {identity.class}반 {identity.name}
          </span>
        )}
      </header>

      <nav className="event-filter" aria-label="앨범 페이지(행사) 고르기">
        <button className={eventId === '' ? 'chip active' : 'chip'} onClick={() => setEventId('')}>
          📖 전체보기
        </button>
        {events.map((e) => (
          <button
            key={e.id}
            className={eventId === e.id ? 'chip active' : 'chip'}
            onClick={() => setEventId(e.id)}
          >
            {e.name}
          </button>
        ))}
        <button
          className={eventId === UNCATEGORIZED_ID ? 'chip active' : 'chip'}
          onClick={() => setEventId(UNCATEGORIZED_ID)}
        >
          {UNCATEGORIZED_NAME}
        </button>
      </nav>

      <div className="post-grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && <p className="empty">📌 아직 붙은 사진이 없어요. 첫 사진을 올려 보세요!</p>}
      </div>

      <Link to="/upload" className="fab">
        <span className="fab-icon" aria-hidden="true">＋</span>
        사진 올리기
      </Link>
    </div>
  )
}
