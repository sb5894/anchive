import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeLocations } from '../lib/locations'
import { subscribeFeedByLocation, softDeletePost } from '../lib/posts'
import { adminSignOut } from '../lib/admin'
import PostCard from '../components/PostCard'
import CampusMap from '../components/CampusMap'
import ConfirmDialog from '../components/ConfirmDialog'
import IdentityPicker from '../components/IdentityPicker'
import Modal from '../components/Modal'
import { ETC_ID, ETC_NAME, locationIdForSpot } from '../lib/campusRegions'
import { GridIcon, HelpIcon, MapIcon } from '../components/icons'

const HELP_SEEN_KEY = 'anchive_help_seen'

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
  const [viewMode, setViewMode] = useState('map') // 'map' | 'grid'
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [loadError, setLoadError] = useState('')
  // 처음 온 사람에게는 사용법을 자동으로 띄운다. 한 번 닫으면 다시 뜨지 않고,
  // 이후에는 위쪽 '사용법' 버튼으로 언제든 다시 볼 수 있다.
  const [showHelp, setShowHelp] = useState(() => {
    try {
      return !localStorage.getItem(HELP_SEEN_KEY)
    } catch {
      // 시크릿 모드 등 저장이 막힌 환경에서는 자동으로 띄우지 않는다.
      return false
    }
  })
  const [showPlacePicker, setShowPlacePicker] = useState(false)

  function closeHelp() {
    setShowHelp(false)
    try {
      localStorage.setItem(HELP_SEEN_KEY, '1')
    } catch {
      /* 저장 실패는 무시 — 다음에 한 번 더 뜨는 것뿐이다 */
    }
  }

  useEffect(() => subscribeLocations(setLocations), [])

  useEffect(
    () =>
      subscribeFeedByLocation(
        null,
        (posts) => {
          setAllPosts(posts)
          setLoadError('')
        },
        (err) => {
          console.error(err)
          setLoadError('연결이 불안정해요. 잠시 후 다시 시도해 주세요.')
        }
      ),
    []
  )

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

  // 지도 위 사진 핀도 지금 고른 장소만 남긴다(전체를 볼 때는 posts === allPosts).
  const mapSpots = useMemo(
    () =>
      posts
        .filter((p) => p.spot)
        .map((p) => ({
          id: p.id,
          x: p.spot.x,
          y: p.spot.y,
          thumbUrl: p.media?.[0]?.url,
          thumbType: p.media?.[0]?.type,
        })),
    [posts]
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
      {isAdmin && (
        <p className="admin-banner">
          관리자 모드 — 모든 글과 댓글을 고치고 지울 수 있어요
          <button type="button" className="admin-signout" onClick={() => adminSignOut()}>
            로그아웃
          </button>
        </p>
      )}
      {deleteError && <p className="error">{deleteError}</p>}
      {loadError && (
        <p className="error">
          {loadError}{' '}
          <button type="button" className="ghost-btn" onClick={() => window.location.reload()}>
            다시 시도
          </button>
        </p>
      )}
      <header className="feed-header">
        {/* 이름은 헤더에 상시 띄우지 않는다. 글·댓글을 쓰려는 순간에만 보여주고
            거기서 바꿀 수 있게 한다(Upload/PostDetail 참고). */}
        <div className="brand">
          <img
            className="brand-mascot"
            src="/mascot-bonghwang.webp"
            alt=""
            aria-hidden="true"
            width="72"
            height="72"
          />
          <h1 className="brand-title">
            {/* 온글잎 박다현체로 미리 뽑아낸 SVG 로고(scripts/make-title-svg.mjs).
                웹폰트로 쓰면 964KB를 통째로 받아야 해서, 제목 글자만 그림으로 떴다. */}
            <img src="/title-anchive.svg" alt="안성초 추억지도" width="260" height="50" />
          </h1>
          {/* 손으로 그은 듯한 밑줄. 장식이라 스크린리더에서는 숨긴다. */}
          <svg
            className="brand-underline"
            viewBox="0 0 200 12"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M4 8 C 40 3, 62 10, 98 5 S 160 9, 196 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <p className="brand-sub">124주년 개교기념일 팝업 게시판</p>
        </div>
      </header>

      <div className="map-toolbar">
        <div className="view-toggle" role="group" aria-label="보기 방법 선택">
          <button
            type="button"
            className={viewMode === 'map' ? 'toggle-btn active' : 'toggle-btn'}
            aria-pressed={viewMode === 'map'}
            onClick={() => setViewMode('map')}
          >
            <MapIcon />
            지도
          </button>
          <button
            type="button"
            className={viewMode === 'grid' ? 'toggle-btn active' : 'toggle-btn'}
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
          >
            <GridIcon />
            모아 보기
          </button>
        </div>
        <button type="button" className="chip help-chip" onClick={() => setShowHelp(true)}>
          <HelpIcon size={18} />
          사용법
        </button>
      </div>

      {/* 장소 필터는 '보기 방식'과 성격이 달라 따로 두고, 지도 뷰·모아 보기 뷰 모두에 보여준다.
          장소가 바뀌면 스크린리더가 알 수 있도록 aria-live로 감싼다. */}
      <div className="place-bar" aria-live="polite">
        <button
          type="button"
          className={locationId === '' ? 'chip place-chip active' : 'chip place-chip'}
          aria-pressed={locationId === ''}
          onClick={() => setLocationId('')}
        >
          전체 장소
        </button>
        <button
          type="button"
          className={locationId ? 'chip place-chip active' : 'chip place-chip'}
          onClick={() => setShowPlacePicker(true)}
          aria-haspopup="dialog"
        >
          {locationId ? currentCategoryName : '장소 선택'} ▾
        </button>
      </div>

      {viewMode === 'map' ? (
        <div className="map-section">
          <p className="map-help">
            사진을 눌러 구경하고, 건물이나 위쪽 &lsquo;장소 선택&rsquo;을 눌러 골라 보세요.
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

      {viewMode === 'grid' ? (
        <div className="post-grid">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onAdminDelete={isAdmin ? handleAdminDelete : undefined} />
          ))}
          {posts.length === 0 && !loadError && (
            <p className="empty">
              {locationId
                ? '이 장소에는 아직 사진이 없어요. 다른 장소를 눌러보세요.'
                : '아직 올라온 사진이 없어요.'}
            </p>
          )}
        </div>
      ) : null}

      {/* 지도 확대 버튼과 헷갈리지 않도록 기호만 두지 않고 글자를 함께 넣는다. */}
      {identity ? (
        <Link to="/upload" className="fab">
          ＋ 올리기
        </Link>
      ) : (
        <button type="button" className="fab" onClick={() => setPickerIntent('upload')}>
          ＋ 올리기
        </button>
      )}

      {showHelp && (
        <Modal label="사용법" onClose={closeHelp}>
          <h2 className="modal-title">이렇게 쓰면 돼요</h2>
          <p className="modal-sub">
            이곳은 안성초등학교 개교기념일을 맞아, 학교를 사랑하는 우리의 모습을 함께 담는 공간이에요.
          </p>
            <ol className="help-list">
              <li>
                <strong>사진 구경하기</strong>
                <span>
                  지도 위 사진을 누르면 크게 볼 수 있어요. 여러 장이 겹친 자리는 눌러서 펼쳐 보세요.
                  &lsquo;모아 보기&rsquo;를 누르면 사진만 한눈에 볼 수 있어요.
                </span>
              </li>
              <li>
                <strong>장소별로 보기</strong>
                <span>
                  건물을 누르거나 위쪽 &lsquo;장소 선택&rsquo;을 누르면 그곳에서 찍은 사진만 모여요.
                </span>
              </li>
              <li>
                <strong>지도 크게 보기</strong>
                <span>지도 오른쪽 위 버튼으로 지도를 크게, 작게 볼 수 있어요.</span>
              </li>
              <li>
                <strong>사진 올리기</strong>
                <span>＋ 올리기를 누르고, 사진을 찍은 자리를 지도에서 골라 주세요.</span>
              </li>
              <li>
                <strong>댓글 남기기</strong>
                <span>사진을 눌러 들어가면 좋아요를 누르고 댓글도 쓸 수 있어요.</span>
              </li>
            </ol>
            <p className="promise-note">
              <strong>우리의 약속</strong>
              친구가 나온 사진을 저장하거나 다른 곳에 올리지 않기로 약속해요.
            </p>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={closeHelp}>
                알겠어요
              </button>
            </div>
        </Modal>
      )}

      {showPlacePicker && (
        <Modal label="장소 고르기" onClose={() => setShowPlacePicker(false)}>
          <h2 className="modal-title">장소 고르기</h2>
            <p className="modal-sub">사진을 찍은 곳을 눌러 보세요.</p>
            <div className="place-list">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={locationId === c.id ? 'place-item active' : 'place-item'}
                  aria-pressed={locationId === c.id}
                  onClick={() => {
                    setLocationId(c.id)
                    setShowPlacePicker(false)
                  }}
                >
                  <span className="place-item-name">{c.name}</span>
                  <span className="place-item-count">{counts[c.id] || 0}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={() => setShowPlacePicker(false)}>
                닫기
              </button>
            </div>
        </Modal>
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
