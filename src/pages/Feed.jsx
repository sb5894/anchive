import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeLocations } from '../lib/locations'
import { subscribeFeedByLocation, softDeletePost } from '../lib/posts'
import PostCard from '../components/PostCard'
import CampusMap from '../components/CampusMap'
import IdentityPicker from '../components/IdentityPicker'

const UNTAGGED_ID = 'untagged'
const UNTAGGED_NAME = '위치 미지정'

export default function Feed() {
  const navigate = useNavigate()
  const { identity, isAnonymous } = useIdentity()
  // 관리자(비익명 로그인)는 피드에서 바로 남의 글을 지울 수 있다(행사 당일 즉시 대응용).
  const isAdmin = !isAnonymous
  // 이름 선택 후 업로드로 이어갈지(true), 이름만 정하고 그대로 있을지(false)
  const [pickerIntent, setPickerIntent] = useState(null)
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [posts, setPosts] = useState([])
  const [allPosts, setAllPosts] = useState([]) // 핀 숫자 배지 + 지도 위 콕 찍은 위치 표시용(필터와 무관하게 항상 전체)
  const [viewMode, setViewMode] = useState('map') // 'map' | 'list'

  useEffect(() => subscribeLocations(setLocations), [])

  useEffect(() => {
    const unsub = subscribeFeedByLocation(locationId || null, setPosts)
    return unsub
  }, [locationId])

  useEffect(() => subscribeFeedByLocation(null, setAllPosts), [])

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

  const counts = useMemo(() => {
    const map = {}
    for (const p of allPosts) {
      const key = p.locationId || UNTAGGED_ID
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [allPosts])

  const mapSpots = useMemo(
    () => allPosts.filter((p) => p.spot).map((p) => ({ id: p.id, x: p.spot.x, y: p.spot.y })),
    [allPosts]
  )

  async function handleAdminDelete(post) {
    if (!confirm('이 게시물을 삭제할까요? (관리자 로그에 기록이 남아요)')) return
    try {
      await softDeletePost(post.id, post.caption)
    } catch (err) {
      console.error(err)
      alert('삭제하지 못했어요. 다시 시도해 주세요.')
    }
  }

  return (
    <div className="page feed">
      {isAdmin && <p className="admin-banner">관리자 모드 — 모든 글과 댓글을 지울 수 있어요</p>}
      <header className="feed-header">
        <div className="brand">
          <h1>안성초 추억지도</h1>
          <p className="brand-sub">124주년 개교기념일 팝업 게시판</p>
        </div>
        {identity ? (
          <span className="whoami">
            {identity.grade}-{identity.class} {identity.name}
          </span>
        ) : (
          <button type="button" className="whoami-btn" onClick={() => setPickerIntent('name')}>
            이름 고르기
          </button>
        )}
      </header>

      <div className="map-toolbar">
        <div className="view-toggle" role="group" aria-label="보기 방법 선택">
          <button
            type="button"
            className={viewMode === 'map' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setViewMode('map')}
          >
            🗺️ 지도
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setViewMode('list')}
          >
            📋 목록
          </button>
        </div>
        <button
          type="button"
          className={locationId === '' ? 'chip all-chip active' : 'chip all-chip'}
          onClick={() => setLocationId('')}
        >
          전체 보기
        </button>
      </div>

      {viewMode === 'map' ? (
        <div className="map-section">
          <p className="map-help">
            사진을 눌러 구경하고, 건물이나 아래 장소 이름을 눌러 골라 보세요.
          </p>
          <CampusMap
            categories={locations}
            activeId={locationId}
            onSelect={setLocationId}
            counts={counts}
            spots={mapSpots}
          />
        </div>
      ) : null}

      <div className="event-filter">
        {categories.map((c) => (
          <button
            key={c.id}
            className={locationId === c.id ? 'chip active' : 'chip'}
            onClick={() => setLocationId(c.id)}
          >
            {c.name} {counts[c.id] ? `(${counts[c.id]})` : ''}
          </button>
        ))}
      </div>

      <p className="current-category">지금 보는 장소: {currentCategoryName}</p>

      <div className="post-grid">
        {visiblePosts.map((p) => (
          <PostCard key={p.id} post={p} onAdminDelete={isAdmin ? handleAdminDelete : undefined} />
        ))}
        {visiblePosts.length === 0 && (
          <p className="empty">
            {locationId
              ? '이 장소에는 아직 사진이 없어요. 다른 장소를 눌러보세요.'
              : '아직 올라온 사진이 없어요.'}
          </p>
        )}
      </div>

      {identity ? (
        <Link to="/upload" className="fab" aria-label="사진·동영상 올리기">
          +
        </Link>
      ) : (
        <button
          type="button"
          className="fab"
          aria-label="사진·동영상 올리기"
          onClick={() => setPickerIntent('upload')}
        >
          +
        </button>
      )}

      {pickerIntent && (
        <IdentityPicker
          reason={
            pickerIntent === 'upload'
              ? '사진을 올리려면 누가 올렸는지 알 수 있게 이름이 필요해요.'
              : '이름을 골라 두면 사진과 댓글을 남길 수 있어요.'
          }
          onCancel={() => setPickerIntent(null)}
          onDone={() => {
            const intent = pickerIntent
            setPickerIntent(null)
            if (intent === 'upload') navigate('/upload')
          }}
        />
      )}
    </div>
  )
}
