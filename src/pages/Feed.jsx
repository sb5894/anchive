import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeLocations } from '../lib/locations'
import { subscribeFeedByLocation } from '../lib/posts'
import PostCard from '../components/PostCard'
import CampusMap from '../components/CampusMap'

const UNTAGGED_ID = 'untagged'
const UNTAGGED_NAME = '위치 미지정'

export default function Feed() {
  const { identity } = useIdentity()
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [posts, setPosts] = useState([])
  const [viewMode, setViewMode] = useState('map') // 'map' | 'list'

  useEffect(() => subscribeLocations(setLocations), [])

  useEffect(() => {
    const unsub = subscribeFeedByLocation(locationId || null, setPosts)
    return unsub
  }, [locationId])

  const categories = useMemo(
    () => [...locations, { id: UNTAGGED_ID, name: UNTAGGED_NAME }],
    [locations]
  )

  const currentCategoryName = useMemo(() => {
    if (!locationId) return '전체'
    if (locationId === UNTAGGED_ID) return UNTAGGED_NAME
    return locations.find((l) => l.id === locationId)?.name || '전체'
  }, [locationId, locations])

  const visiblePosts = useMemo(() => {
    if (locationId === UNTAGGED_ID) return posts.filter((p) => !p.locationId)
    return posts
  }, [posts, locationId])

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

      <div className="view-toggle" role="group" aria-label="장소 찾는 방법 선택">
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
        className={locationId === '' ? 'chip all-chip active' : 'chip all-chip'}
        onClick={() => setLocationId('')}
      >
        전체 사진 보기
      </button>

      {viewMode === 'map' ? (
        <div className="map-section">
          <p className="map-help">
            학교 지도 위 핀을 눌러 그 장소에서 있었던 사진을 볼 수 있어요. 핀을 누르기 어렵다면
            아래 &quot;목록으로 보기&quot;를 이용해 주세요.
          </p>
          <CampusMap categories={locations} activeId={locationId} onSelect={setLocationId} />
        </div>
      ) : (
        <div className="event-filter">
          {categories.map((c) => (
            <button
              key={c.id}
              className={locationId === c.id ? 'chip active' : 'chip'}
              onClick={() => setLocationId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <p className="current-category">지금 보는 장소: {currentCategoryName}</p>

      <div className="post-grid">
        {visiblePosts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {visiblePosts.length === 0 && (
          <p className="empty">
            {locationId
              ? '이 장소에는 아직 사진이 없어요. 다른 핀이나 목록을 눌러보세요.'
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
