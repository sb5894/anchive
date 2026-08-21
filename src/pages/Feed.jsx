import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed } from '../lib/posts'
import PostCard from '../components/PostCard'
import Masthead from '../components/Masthead'

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

  const [coverPost, ...restPosts] = posts

  return (
    <>
      <Masthead identity={identity} />
      <div className="page feed">
        <div className="section-tabs" role="tablist" aria-label="행사 종류 고르기">
          <button
            className={eventId === '' ? 'chip active' : 'chip'}
            onClick={() => setEventId('')}
          >
            전체 지면
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
        </div>

        {posts.length === 0 && <p className="empty">아직 올라온 사진이 없어요. 첫 기사를 올려볼까요?</p>}

        {coverPost && (
          <Link to={`/post/${coverPost.id}`} className="cover-story">
            <div className="cover-story-media">
              {coverPost.media?.[0]?.type === 'video' ? (
                <video src={coverPost.media[0].url} muted playsInline />
              ) : (
                <img src={coverPost.media?.[0]?.url} alt="" />
              )}
              <span className="cover-story-tag">커버 스토리</span>
            </div>
            <div className="cover-story-overlay">
              <p className="cover-story-headline">
                {coverPost.caption || '오늘의 순간을 기록했어요'}
              </p>
              <div className="cover-story-meta">
                <span>
                  {coverPost.authorInfo?.grade}-{coverPost.authorInfo?.class}{' '}
                  {coverPost.authorInfo?.name}
                </span>
                <span>♥ 좋아요 {coverPost.likeCount || 0}</span>
              </div>
            </div>
          </Link>
        )}

        {restPosts.length > 0 && (
          <div className="masonry">
            {restPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}

        <Link to="/upload" className="fab">
          <span className="ico" aria-hidden="true">
            +
          </span>
          <span>글쓰기</span>
        </Link>
      </div>
    </>
  )
}
