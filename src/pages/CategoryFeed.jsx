import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed } from '../lib/posts'
import PostCard from '../components/PostCard'

export default function CategoryFeed() {
  const { eventId } = useParams()
  const [events, setEvents] = useState([])
  const [posts, setPosts] = useState([])

  useEffect(() => subscribeEvents(setEvents), [])
  useEffect(() => {
    const query = eventId === UNCATEGORIZED_ID ? UNCATEGORIZED_ID : eventId
    return subscribeFeed({ eventId: query }, setPosts)
  }, [eventId])

  const title =
    eventId === UNCATEGORIZED_ID
      ? UNCATEGORIZED_NAME
      : events.find((e) => e.id === eventId)?.name || '사진 모음'

  return (
    <div className="page category-feed">
      <Link to="/feed" className="back">
        ← 전체 아카이브로
      </Link>
      <header className="feed-header">
        <h1>{title}</h1>
        <span className="whoami">사진 {posts.length}장</span>
      </header>

      <div className="post-grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && <p className="empty">아직 이 항목에는 사진이 없어요.</p>}
      </div>
    </div>
  )
}
