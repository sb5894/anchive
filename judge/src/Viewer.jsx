import { useEffect, useRef, useState } from 'react'
import PostVideo from '../../src/components/PostVideo'
import { whoLabel } from '../../src/lib/identityLabel'

// 게시물 크게 보기. 열려 있을 때만 렌더링되므로(부모에서 조건부) 닫기가 CSS에 좌우되지 않는다.
// 이동: PC는 ←→(게시물)·↑↓(같은 게시물의 사진), 폰은 좌우 스와이프.
// 여러 장짜리 게시물은 사진 영역이 가로 스크롤 캐러셀이라, 스와이프가 먼저 사진을 넘기고
// 첫/마지막 사진에서 더 밀었을 때만 게시물을 넘긴다.
// 부모가 게시물 id를 key로 주므로, 게시물이 바뀌면 새로 마운트되어 첫 사진부터 보인다.
export default function Viewer({ post, position, total, locationName, picked, pickers, onTogglePick, onPrev, onNext, onClose }) {
  const trackRef = useRef(null)
  const touchRef = useRef(null)
  const [mediaIndex, setMediaIndex] = useState(0)
  const media = post.media || []

  function goMedia(i) {
    const track = trackRef.current
    if (!track || i < 0 || i >= media.length) return
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.('input, textarea, select')) return
      if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowDown') goMedia(mediaIndex + 1)
      else if (e.key === 'ArrowUp') goMedia(mediaIndex - 1)
      else if (e.key === 's' || e.key === 'S' || e.key === 'ㄴ') onTogglePick()
      else if (e.key === 'Escape') onClose()
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function onScroll(e) {
    const t = e.currentTarget
    setMediaIndex(Math.round(t.scrollLeft / Math.max(1, t.clientWidth)))
  }

  function onTouchStart(e) {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY, mediaIndex }
  }

  function onTouchEnd(e) {
    const start = touchRef.current
    touchRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const last = media.length - 1
    if (dx < 0 && start.mediaIndex >= last) onNext()
    else if (dx > 0 && start.mediaIndex <= 0) onPrev()
  }

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`${whoLabel(post.authorInfo)}님의 게시물`}>
      <div className="viewer-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="viewer-track" ref={trackRef} onScroll={onScroll} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {media.map((m, i) => (
            <div className="viewer-slide" key={m.url || i} onClick={(e) => e.target === e.currentTarget && onClose()}>
              {m.type === 'video' ? (
                <PostVideo media={m} mode="player" className="viewer-media" />
              ) : (
                <img className="viewer-media" src={m.url} alt={`${whoLabel(post.authorInfo)}님의 사진 ${i + 1}`} />
              )}
            </div>
          ))}
          {media.length === 0 && <div className="viewer-slide empty">사진이 없어요</div>}
        </div>

        <button className="viewer-nav prev" onClick={onPrev} disabled={position <= 1} aria-label="이전 게시물">
          ‹
        </button>
        <button className="viewer-nav next" onClick={onNext} disabled={position >= total} aria-label="다음 게시물">
          ›
        </button>
        {media.length > 1 && (
          <div className="viewer-dots" aria-label={`${media.length}장 중 ${mediaIndex + 1}번째`}>
            {media.map((m, i) => (
              <button key={m.url || i} className={i === mediaIndex ? 'on' : ''} onClick={() => goMedia(i)} aria-label={`${i + 1}번째 사진`} />
            ))}
          </div>
        )}
      </div>

      <aside className="viewer-side">
        <div className="viewer-head">
          <span className="viewer-pos">
            {position} / {total}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <h2 className="viewer-author">{whoLabel(post.authorInfo)}</h2>
        <p className="viewer-meta">
          {locationName} · ♥ {post.likeCount || 0}
          {media.length > 1 && ` · ${media.length}장`}
          {post.createdAt?.toDate && ` · ${post.createdAt.toDate().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
        </p>
        {post.caption && <p className="viewer-caption">{post.caption}</p>}
        {pickers.length > 0 && (
          <p className="viewer-pickers">
            후보로 고른 선생님 {pickers.length}명: {pickers.join(', ')}
          </p>
        )}
        <button className={`pick-btn ${picked ? 'on' : ''}`} onClick={onTogglePick} aria-pressed={picked}>
          {picked ? '⭐ 수상 후보로 골랐어요' : '☆ 수상 후보로 고르기'}
        </button>
        <p className="viewer-keys">
          <kbd>←</kbd> <kbd>→</kbd> 게시물 · <kbd>↑</kbd> <kbd>↓</kbd> 사진 · <kbd>S</kbd> 후보 · <kbd>Esc</kbd> 닫기
        </p>
      </aside>
    </div>
  )
}
