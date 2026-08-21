import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { subscribeFeed } from '../lib/posts'
import BubbleField from '../components/BubbleField'
import CategoryRow from '../components/CategoryRow'
import PostModal from '../components/PostModal'

export default function Feed() {
  const { identity } = useIdentity()
  const [events, setEvents] = useState([])
  const [posts, setPosts] = useState([])
  const [sorted, setSorted] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)

  useEffect(() => subscribeEvents(setEvents), [])

  useEffect(() => {
    const unsub = subscribeFeed({ eventId: null }, setPosts)
    return unsub
  }, [])

  const categories = useMemo(
    () => [...events, { id: UNCATEGORIZED_ID, name: UNCATEGORIZED_NAME }],
    [events]
  )

  const postsByCategory = useMemo(() => {
    const map = new Map()
    for (const cat of categories) map.set(cat.id, [])
    for (const post of posts) {
      const key = map.has(post.eventId) ? post.eventId : UNCATEGORIZED_ID
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(post)
    }
    return map
  }, [posts, categories])

  return (
    <div className="page feed">
      <header className="feed-header">
        <div>
          <h1>학교 아카이브</h1>
          <p className="sub feed-sub">둥실둥실 떠 있는 사진을 눌러서 구경해 보세요.</p>
        </div>
        <div className="feed-header-right">
          {identity && (
            <span className="whoami">
              {identity.grade}-{identity.class} {identity.name}
            </span>
          )}
          <button
            type="button"
            className={sorted ? 'sort-toggle active' : 'sort-toggle'}
            onClick={() => setSorted((v) => !v)}
            aria-pressed={sorted}
          >
            <span className="sort-toggle-icon" aria-hidden="true">
              {sorted ? '⬒' : '◌'}
            </span>
            {sorted ? '자유롭게 보기' : '가지런히 정렬'}
          </button>
        </div>
      </header>

      {!sorted && <BubbleField posts={posts} onSelect={setSelectedPost} />}

      {sorted && (
        <div className="category-rows">
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              title={cat.name}
              categoryId={cat.id}
              posts={postsByCategory.get(cat.id) || []}
            />
          ))}
          {posts.length === 0 && <p className="empty">아직 올라온 사진이 없어요.</p>}
        </div>
      )}

      <Link to="/upload" className="fab" aria-label="사진·동영상 올리기">
        <span aria-hidden="true">＋</span>
        <span className="fab-text">올리기</span>
      </Link>

      {selectedPost && (
        <PostModal
          post={posts.find((p) => p.id === selectedPost.id) || selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  )
}
