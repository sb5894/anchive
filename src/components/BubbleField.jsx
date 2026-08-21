import { useEffect, useRef, useState } from 'react'
import { computeBubbleLayout } from './bubbleLayout'

export default function BubbleField({ posts, onSelect }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(320)

  useEffect(() => {
    function measure() {
      if (containerRef.current) setWidth(containerRef.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const { items, height } = computeBubbleLayout(posts, width)

  return (
    <div className="bubble-field" ref={containerRef} style={{ height: `${Math.max(height, 220)}px` }}>
      {items.map(({ post, left, top, size, duration, delay, drift }) => {
        const first = post.media?.[0]
        return (
          <button
            key={post.id}
            type="button"
            className="bubble"
            onClick={() => onSelect(post)}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${size}px`,
              height: `${size}px`,
              '--float-duration': `${duration}s`,
              '--float-delay': `${delay}s`,
              '--float-drift': `${drift}px`,
            }}
            aria-label={`${post.authorInfo?.grade ?? ''}-${post.authorInfo?.class ?? ''} ${post.authorInfo?.name ?? ''}님 사진, 좋아요 ${post.likeCount || 0}개`}
          >
            <span className="bubble-media">
              {first?.type === 'video' ? (
                <video src={first.url} muted playsInline />
              ) : (
                first && <img src={first.url} alt="" loading="lazy" />
              )}
              {first?.type === 'video' && <span className="bubble-play">▶</span>}
            </span>
            {post.media?.length > 1 && <span className="bubble-count">+{post.media.length - 1}</span>}
            <span className="bubble-like">♥ {post.likeCount || 0}</span>
          </button>
        )
      })}
      {posts.length === 0 && <p className="empty">아직 올라온 사진이 없어요.</p>}
    </div>
  )
}
