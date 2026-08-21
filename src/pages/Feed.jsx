import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents } from '../lib/events'
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
        <h1>학교 아카이브</h1>
        {identity && (
          <span className="whoami">
            {identity.grade}-{identity.class} {identity.name}
          </span>
        )}
      </header>

      <div className="event-filter">
        <button className={eventId === '' ? 'chip active' : 'chip'} onClick={() => setEventId('')}>
          전체
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
      </div>

      <div className="post-grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && <p className="empty">아직 올라온 사진이 없어요.</p>}
      </div>

      <Link to="/upload" className="fab">
        +
      </Link>
    </div>
  )
}
