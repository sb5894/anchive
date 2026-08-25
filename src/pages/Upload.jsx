import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { UNCATEGORIZED_ID } from '../lib/events'
import { subscribeLocations } from '../lib/locations'
import { createPost } from '../lib/posts'
import { ETC_ID, ETC_NAME, locationIdForSpot, regionCenter } from '../lib/campusRegions'
import CampusMap from '../components/CampusMap'

export default function Upload() {
  const navigate = useNavigate()
  const { uid, identity } = useIdentity()
  const [locations, setLocations] = useState([])
  const [spot, setSpot] = useState(null)
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => subscribeLocations(setLocations), [])

  // 찍은 좌표가 어느 장소인지는 좌표에서 바로 계산한다(따로 고르지 않는다).
  const pickedLocationId = useMemo(() => (spot ? locationIdForSpot(spot) : null), [spot])
  const pickedLocationName = useMemo(() => {
    if (!pickedLocationId) return null
    if (pickedLocationId === ETC_ID) return ETC_NAME
    return locations.find((l) => l.id === pickedLocationId)?.name || ETC_NAME
  }, [pickedLocationId, locations])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!spot) {
      setError('사진을 찍은 위치를 지도에서 골라 주세요.')
      return
    }
    if (!files.length) {
      setError('올릴 사진이나 동영상을 선택해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const postId = await createPost({
        eventId: UNCATEGORIZED_ID,
        spot,
        authorUid: uid,
        authorInfo: identity,
        files,
        caption,
      })
      navigate(`/post/${postId}`)
    } catch (err) {
      console.error(err)
      setError(err.message || '업로드 중 문제가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page upload">
      <h1>사진·동영상 올리기</h1>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>사진을 찍은 곳</label>
          <p className="hint">지도에서 사진을 찍은 자리를 눌러 주세요.</p>
          <CampusMap categories={locations} activeId={null} onSelect={() => {}} spot={spot} onMapClick={setSpot} />

          {/* 지도 탭과 완전히 동등한 또 하나의 입력 수단. 고르면 그 구역 한가운데에 찍힌다. */}
          <p className="hint pick-list-title">정해진 장소에서 고르기</p>
          <div className="event-filter">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className={pickedLocationId === loc.id ? 'chip active' : 'chip'}
                onClick={() => setSpot(regionCenter(loc.id))}
              >
                {loc.name}
              </button>
            ))}
          </div>

          {spot ? (
            <p className="picked-where">
              지금 고른 곳: <strong>{pickedLocationName}</strong>
            </p>
          ) : (
            <p className="picked-where empty-where">아직 위치를 고르지 않았어요</p>
          )}
        </div>

        <div className="field">
          <label>사진·동영상 (여러 개 선택 가능, 동영상은 50MB까지)</label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files)
              e.target.value = ''
              setFiles((prev) => [...prev, ...picked])
            }}
          />
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${f.lastModified}-${i}`}>
                  <span>
                    {f.type.startsWith('video/') ? '🎬 ' : '🖼️ '}
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length > 0 && <p className="hint">{files.length}개 선택됨 — 더 고르려면 다시 눌러주세요</p>}
        </div>

        <div className="field">
          <label>설명 (선택)</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
        </div>

        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? '업로드 중...' : '올리기'}
        </button>
      </form>
    </div>
  )
}
