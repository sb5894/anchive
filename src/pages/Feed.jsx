import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed } from '../lib/posts'
import PostCard from '../components/PostCard'
import Timeline from '../components/Timeline'

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

  const panelTitle = useMemo(() => {
    if (eventId === '') return '학교 이야기 전체'
    if (eventId === UNCATEGORIZED_ID) return UNCATEGORIZED_NAME
    return events.find((e) => e.id === eventId)?.name || '정거장'
  }, [eventId, events])

  return (
    <div className="page timeline-page">
      <header className="timeline-header">
        <div className="timeline-title">
          <img src="/icon-192.png" alt="" />
          <h1>안성초 이야기 길</h1>
        </div>
        {identity && (
          <span className="whoami">
            {identity.grade}-{identity.class} {identity.name}
          </span>
        )}
      </header>

      <Timeline
        events={events}
        eventId={eventId}
        onSelect={setEventId}
        uncategorizedId={UNCATEGORIZED_ID}
        uncategorizedName={UNCATEGORIZED_NAME}
      />

      <div className="station-panel">
        <div className="station-panel-header">
          <h2>{panelTitle}</h2>
          <span className="station-count">사진·동영상 {posts.length}개</span>
        </div>

        <div className="post-grid">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.length === 0 && (
            <p className="empty">이 정거장에는 아직 올라온 사진이 없어요. 첫 번째로 올려볼까요?</p>
          )}
        </div>
      </div>

      <Link to="/upload" className="fab" aria-label="사진 올리기">
        <span aria-hidden="true">＋</span>
        <span className="fab-text">올리기</span>
      </Link>
    </div>
  )
}
