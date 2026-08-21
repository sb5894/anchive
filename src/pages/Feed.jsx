import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed } from '../lib/posts'
import PostCard from '../components/PostCard'
import CampusMap from '../components/CampusMap'

export default function Feed() {
  const { identity } = useIdentity()
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [posts, setPosts] = useState([])
  const [viewMode, setViewMode] = useState('map') // 'map' | 'list'

  useEffect(() => subscribeEvents(setEvents), [])

  useEffect(() => {
    const unsub = subscribeFeed({ eventId: eventId || null }, setPosts)
    return unsub
  }, [eventId])

  const categories = useMemo(
    () => [...events.map((e) => ({ id: e.id, name: e.name })), { id: UNCATEGORIZED_ID, name: UNCATEGORIZED_NAME }],
    [events]
  )

  const currentCategoryName = useMemo(() => {
    if (!eventId) return '전체'
    if (eventId === UNCATEGORIZED_ID) return UNCATEGORIZED_NAME
    return events.find((e) => e.id === eventId)?.name || '전체'
  }, [eventId, events])

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

      <div className="view-toggle" role="group" aria-label="카테고리 찾는 방법 선택">
        <button
          type="button"
          className={viewMode === 'map' ? 'toggle-btn active' : 'toggle-btn'}
          onClick={() => setViewMode('map')}
        >
          🗺️ 지도로 보기
        </button>
        <button
          type="button"
          className={viewMode === 'list' ? 'toggle-btn active' : 'toggle-btn'}
          onClick={() => setViewMode('list')}
        >
          📋 목록으로 보기
        </button>
      </div>

      <button
        type="button"
        className={eventId === '' ? 'chip all-chip active' : 'chip all-chip'}
        onClick={() => setEventId('')}
      >
        전체 사진 보기
      </button>

      {viewMode === 'map' ? (
        <div className="map-section">
          <p className="map-help">
            학교 지도 위 핀을 눌러 그 장소에서 있었던 행사 사진을 볼 수 있어요. 핀을 누르기 어렵다면
            아래 &quot;목록으로 보기&quot;를 이용해 주세요.
          </p>
          <CampusMap categories={categories} activeId={eventId} onSelect={setEventId} />
        </div>
      ) : (
        <div className="event-filter">
          {categories.map((c) => (
            <button
              key={c.id}
              className={eventId === c.id ? 'chip active' : 'chip'}
              onClick={() => setEventId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <p className="current-category">지금 보는 사진: {currentCategoryName}</p>

      <div className="post-grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && (
          <p className="empty">
            {eventId
              ? '이 카테고리에는 아직 사진이 없어요. 다른 핀이나 목록을 눌러보세요.'
              : '아직 올라온 사진이 없어요.'}
          </p>
        )}
      </div>

      <Link to="/upload" className="fab" aria-label="사진·동영상 올리기">
        +
      </Link>
    </div>
  )
}
