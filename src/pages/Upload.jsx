import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { UNCATEGORIZED_ID } from '../lib/events'
import { subscribeLocations } from '../lib/locations'
import { createPost } from '../lib/posts'
import CampusMap from '../components/CampusMap'

export default function Upload() {
  const navigate = useNavigate()
  const { uid, identity } = useIdentity()
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [spot, setSpot] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = subscribeLocations((list) => {
      setLocations(list)
      if (list.length > 0 && !locationId) setLocationId(list[0].id)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!files.length || !locationId) {
      setError('장소와 사진/동영상을 선택해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const postId = await createPost({
        eventId: UNCATEGORIZED_ID, // 이 디자인은 행사 종류 대신 장소로 분류하므로 고정값 사용
        locationId,
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
          <label>장소</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <button
            type="button"
            className="spot-toggle"
            onClick={() => setShowPicker((v) => !v)}
          >
            📍 {showPicker ? '정확한 위치 접기' : '정확한 위치 콕 찍기 (선택)'}
          </button>
          {showPicker && (
            <>
              <p className="hint">
                지도를 탭해서 정확히 어디서 찍었는지 표시할 수 있어요. 안 찍어도 위에서 고른
                장소로 잘 올라가니 걱정 마세요.
              </p>
              <CampusMap categories={locations} activeId={locationId} onSelect={setLocationId} spot={spot} onMapClick={setSpot} />
              {spot && (
                <button type="button" className="spot-clear" onClick={() => setSpot(null)}>
                  ✕ 콕 찍은 위치 지우기
                </button>
              )}
            </>
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
