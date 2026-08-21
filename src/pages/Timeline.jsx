import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed, toggleLike } from '../lib/posts'

function formatWhen(createdAt) {
  if (!createdAt?.toDate) return ''
  const d = createdAt.toDate()
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`
}

export default function Timeline() {
  const { uid } = useIdentity()
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [posts, setPosts] = useState([])

  useEffect(() => subscribeEvents(setEvents), [])

  useEffect(() => {
    const unsub = subscribeFeed({ eventId: eventId || null }, setPosts)
    return unsub
  }, [eventId])

  async function handleLike(postId) {
    try {
      await toggleLike(postId, uid)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="page timeline-page">
      <header className="timeline-header">
        <h1>타임라인</h1>
        <p className="sub">올라온 순서대로 사진과 동영상을 둘러봐요.</p>
      </header>

      <div className="event-filter" role="tablist" aria-label="행사 종류로 보기">
        <button
          className={eventId === '' ? 'chip active' : 'chip'}
          onClick={() => setEventId('')}
          aria-pressed={eventId === ''}
        >
          전체 보기
        </button>
        {events.map((e) => (
          <button
            key={e.id}
            className={eventId === e.id ? 'chip active' : 'chip'}
            onClick={() => setEventId(e.id)}
            aria-pressed={eventId === e.id}
          >
            {e.name}
          </button>
        ))}
        <button
          className={eventId === UNCATEGORIZED_ID ? 'chip active' : 'chip'}
          onClick={() => setEventId(UNCATEGORIZED_ID)}
          aria-pressed={eventId === UNCATEGORIZED_ID}
        >
          {UNCATEGORIZED_NAME}
        </button>
      </div>

      <div className="timeline-list">
        {posts.map((p) => {
          const first = p.media?.[0]
          const liked = false // 목록 단계에서는 내 좋아요 여부를 따로 조회하지 않고, 우선 하트를 눌러 반응만 남길 수 있게 한다.
          return (
            <article key={p.id} className="timeline-card">
              <div className="timeline-card-head">
                <span className="avatar-badge" aria-hidden="true">
                  {p.authorInfo?.name?.[0] || '학'}
                </span>
                <div className="timeline-card-who">
                  <strong>
                    {p.authorInfo?.grade}학년 {p.authorInfo?.class}반 {p.authorInfo?.name}
                  </strong>
                  <span className="timeline-card-time">{formatWhen(p.createdAt)}</span>
                </div>
              </div>

              <Link to={`/post/${p.id}`} className="timeline-media">
                {first?.type === 'video' ? (
                  <video src={first.url} muted playsInline />
                ) : (
                  first && <img src={first.url} alt="" loading="lazy" />
                )}
                {first?.type === 'video' && <span className="play-badge">▶</span>}
                {p.media?.length > 1 && <span className="album-badge">앨범 {p.media.length}</span>}
              </Link>

              <div className="timeline-card-actions">
                <button
                  className={liked ? 'like-btn active' : 'like-btn'}
                  onClick={() => handleLike(p.id)}
                >
                  ♥ 좋아요 {p.likeCount || 0}
                </button>
                <Link to={`/post/${p.id}`} className="comment-link">
                  💬 댓글 보기
                </Link>
              </div>

              {p.caption && <p className="timeline-caption">{p.caption}</p>}
            </article>
          )
        })}
        {posts.length === 0 && <p className="empty">아직 이 분류에는 올라온 사진이 없어요.</p>}
      </div>
    </div>
  )
}
