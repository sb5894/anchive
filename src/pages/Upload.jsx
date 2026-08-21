import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { subscribeEvents, UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '../lib/events'
import { createPost } from '../lib/posts'
import Masthead from '../components/Masthead'

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
    <>
      <Masthead identity={identity} />
      <div className="page upload">
      <p className="article-kicker">새 기사 쓰기</p>
      <h1>사진·동영상 올리기</h1>
      <p className="sub">우리 반, 우리 행사의 순간을 지면에 실어보세요.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="event-select">행사 종류</label>
          <select id="event-select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
            <option value={UNCATEGORIZED_ID}>{UNCATEGORIZED_NAME}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="file-input">사진·동영상 (여러 개 선택 가능, 동영상은 50MB까지)</label>
          <input
            id="file-input"
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
                    ✕ 삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length > 0 && <p className="hint">{files.length}개 선택됨 — 더 고르려면 다시 눌러주세요</p>}
        </div>

        <div className="field">
          <label htmlFor="caption-input">설명 (선택)</label>
          <textarea
            id="caption-input"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? '업로드 중...' : '지면에 싣기 →'}
        </button>
      </form>
      </div>
    </>
  )
}
