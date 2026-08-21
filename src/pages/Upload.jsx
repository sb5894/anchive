import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { createPost } from '../lib/posts'

export default function Upload() {
  const navigate = useNavigate()
  const { uid, identity } = useIdentity()
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = subscribeEvents((list) => {
      setEvents(list)
      if (list.length > 0 && !eventId) setEventId(list[0].id)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!files.length || !eventId) {
      setError('행사 종류와 사진/동영상을 선택해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const postId = await createPost({ eventId, authorUid: uid, authorInfo: identity, files, caption })
      navigate(`/post/${postId}`)
    } catch (err) {
      console.error(err)
      setError(err.message || '업로드 중 문제가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page upload-page">
      <Link to="/feed" className="back">
        ← 이야기 길로
      </Link>
      <h1>
        <span aria-hidden="true">📷</span> 이야기 길에 사진 놓기
      </h1>
      <p className="sub">어느 정거장 이야기인지 고르고, 사진이나 동영상을 올려주세요.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>행사(정거장) 종류</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
            <option value={UNCATEGORIZED_ID}>{UNCATEGORIZED_NAME}</option>
          </select>
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
          {submitting ? '업로드 중...' : '이야기 길에 올리기'}
        </button>
      </form>
    </div>
  )
}
