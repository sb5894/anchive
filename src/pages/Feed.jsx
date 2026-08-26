import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeLocations } from '../lib/locations'
import { subscribeFeedByLocation, softDeletePost } from '../lib/posts'
import PostCard from '../components/PostCard'
import CampusMap from '../components/CampusMap'
import ConfirmDialog from '../components/ConfirmDialog'
import IdentityPicker from '../components/IdentityPicker'
import { ETC_ID, ETC_NAME, locationIdForSpot } from '../lib/campusRegions'

export default function Feed() {
  const navigate = useNavigate()
  const { identity, isAnonymous } = useIdentity()
  // 관리자(비익명 로그인)는 피드에서 바로 남의 글을 지울 수 있다(행사 당일 즉시 대응용).
  const isAdmin = !isAnonymous
  // 이름 선택 후 업로드로 이어갈지(true), 이름만 정하고 그대로 있을지(false)
  const [pickerIntent, setPickerIntent] = useState(null)
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  // 전체 게시물 하나만 구독하고, 통계(counts)와 화면 표시(posts) 모두 여기서 계산한다.
  const [allPosts, setAllPosts] = useState([])
  const [viewMode, setViewMode] = useState('map') // 'map' | 'list'
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => subscribeLocations(setLocations), [])

  useEffect(() => subscribeFeedByLocation(null, setAllPosts), [])

  const posts = useMemo(
    () =>
      locationId ? allPosts.filter((p) => locationIdForSpot(p.spot) === locationId) : allPosts,
    [allPosts, locationId]
  )

  // 어느 건물에도 안 걸치는 자리(통로·나무 등)에 찍힌 사진을 모아 보는 칸
  const categories = useMemo(() => [...locations, { id: ETC_ID, name: ETC_NAME }], [locations])

  const currentCategoryName = useMemo(() => {
    if (!locationId) return '전체'
    if (locationId === ETC_ID) return ETC_NAME
    return locations.find((l) => l.id === locationId)?.name || '전체'
  }, [locationId, locations])

  const counts = useMemo(() => {
    const map = {}
    for (const p of allPosts) {
      const key = locationIdForSpot(p.spot)
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [allPosts])

  const mapSpots = useMemo(
    () =>
      allPosts
        .filter((p) => p.spot)
        .map((p) => ({
          id: p.id,
          x: p.spot.x,
          y: p.spot.y,
          thumbUrl: p.media?.[0]?.url,
        })),
    [allPosts]
  )

  function handleAdminDelete(post) {
    setDeleteError('')
    setDeleteTarget(post)
  }

  async function confirmAdminDelete() {
    const post = deleteTarget
    setDeleteTarget(null)
    try {
      await softDeletePost(post.id, post.caption)
    } catch (err) {
      console.error(err)
      setDeleteError('삭제하지 못했어요. 다시 시도해 주세요.')
    }
  }

  return (
    <div className="page feed">
      {isAdmin && <p className="admin-banner">관리자 모드 — 모든 글과 댓글을 지울 수 있어요</p>}
      {deleteError && <p className="error">{deleteError}</p>}
      <header className="feed-header">
        <div className="brand">
          <h1>안성초 추억지도</h1>
          <p className="brand-sub">124주년 개교기념일 팝업 게시판</p>
        </div>
        {/* 이름을 눌러 다시 고를 수 있게 한다. 태블릿을 여러 학생이 돌려 쓸 때
            앞사람 이름으로 글이 올라가는 걸 막는 유일한 수단이라 꼭 필요하다. */}
        <button
          type="button"
          className="whoami-btn"
          onClick={() => setPickerIntent('name')}
          title={identity ? '눌러서 이름 바꾸기' : undefined}
        >
          {identity ? `${identity.grade}-${identity.class} ${identity.name}` : '이름 고르기'}
        </button>
      </header>

      <div className="map-toolbar">
        <div className="view-toggle" role="group" aria-label="보기 방법 선택">
          <button
            type="button"
            className={viewMode === 'map' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setViewMode('map')}
          >
            지도
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setViewMode('list')}
          >
            목록
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
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onAdminDelete={isAdmin ? handleAdminDelete : undefined} />
        ))}
        {posts.length === 0 && (
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
              : identity
                ? '다른 사람이 쓸 차례라면 이름을 새로 골라 주세요.'
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

      {deleteTarget && (
        <ConfirmDialog
          title="이 게시물을 삭제할까요?"
          message="관리자 로그에 기록이 남아요."
          confirmLabel="삭제"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmAdminDelete}
        />
      )}
    </div>
  )
}
