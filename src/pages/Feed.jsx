import { useEffect, useMemo, useState } from 'react'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed } from '../lib/posts'
import PostCard from '../components/PostCard'

export default function Feed() {
  const { identity } = useIdentity()
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [allPosts, setAllPosts] = useState([])
  const [posts, setPosts] = useState([])

  useEffect(() => subscribeEvents(setEvents), [])
  useEffect(() => subscribeFeed({ eventId: null }, setAllPosts), [])

  useEffect(() => {
    const unsub = subscribeFeed({ eventId: eventId || null }, setPosts)
    return unsub
  }, [eventId])

  const stats = useMemo(() => {
    const totalLikes = allPosts.reduce((sum, p) => sum + (p.likeCount || 0), 0)
    const authors = new Set(allPosts.map((p) => p.authorUid))
    return { count: allPosts.length, likes: totalLikes, authors: authors.size }
  }, [allPosts])

  return (
    <div className="page profile-page">
      <header className="profile-header">
        <img
          className="profile-avatar"
          src="/안성초_로고_한글(png).png"
          alt="안성초등학교 로고"
        />
        <div className="profile-info">
          <h1 className="profile-name">안성초등학교 아카이브</h1>
          <p className="profile-bio">
            개교기념일과 학교 행사에서 남긴 사진·동영상을 함께 모아두는 우리 학교 기록 공간이에요.
          </p>
          {identity && (
            <p className="profile-whoami">
              지금 <strong>{identity.grade}학년 {identity.class}반 {identity.name}</strong> 님으로
              둘러보는 중이에요.
            </p>
          )}
          <ul className="profile-stats" aria-label="아카이브 현황">
            <li>
              <strong>{stats.count}</strong>
              <span>게시물</span>
            </li>
            <li>
              <strong>{stats.authors}</strong>
              <span>참여 학생·선생님</span>
            </li>
            <li>
              <strong>{stats.likes}</strong>
              <span>좋아요</span>
            </li>
          </ul>
        </div>
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

      <div className="grid-divider">
        <span>사진 모아보기</span>
      </div>

      <div className="post-grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {posts.length === 0 && (
          <p className="empty">아직 이 분류에는 올라온 사진이 없어요. 오른쪽 아래 + 버튼으로 올려보세요.</p>
        )}
      </div>
    </div>
  )
}
