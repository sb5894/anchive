import { useState } from 'react'

// 저장소 곳곳에 흩어져 있던 <video> 렌더를 한 곳으로 모은 컴포넌트.
// media.status가 'processing'/'failed'면 재생 불가 상태를 화면에 그대로 알리고,
// 재생 자체가 실패한 경우(onError)도 같은 방식으로 안내한다 — 예전처럼
// 조용히 빈 칸만 남기지 않는다.
//
// mode="thumb"  : 피드 카드·지도 핀·클러스터·미리보기용 무음 축소판
// mode="player" : 게시물 상세의 실제 재생 플레이어(controls 있음)
export default function PostVideo({ media, mode = 'thumb', className }) {
  const [playbackError, setPlaybackError] = useState(false)

  if (!media?.url) return null

  if (media.status === 'processing') {
    return (
      <div className={joinClass('media-placeholder', className)} role="img" aria-label="영상 준비 중">
        <span className="media-placeholder-icon" aria-hidden="true">
          ⏳
        </span>
        {mode === 'player' && (
          <p className="media-placeholder-text">
            영상 준비 중이에요
            <br />
            잠시 후 다시 열어보세요
          </p>
        )}
      </div>
    )
  }

  if (media.status === 'failed' || playbackError) {
    const label = media.status === 'failed' ? '영상 처리 실패' : '재생할 수 없는 영상'
    return (
      <div className={joinClass('media-placeholder media-placeholder-error', className)} role="img" aria-label={label}>
        <span className="media-placeholder-icon" aria-hidden="true">
          ⚠️
        </span>
        {mode === 'player' && (
          <p className="media-placeholder-text">
            {media.status === 'failed'
              ? '영상을 처리하지 못했어요'
              : '이 브라우저에서는 재생할 수 없는 영상이에요'}
          </p>
        )}
      </div>
    )
  }

  if (mode === 'player') {
    return (
      <video
        className={className}
        src={media.url}
        controls
        playsInline
        poster={media.poster || undefined}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onError={() => setPlaybackError(true)}
      />
    )
  }

  return (
    <video
      className={className}
      src={`${media.url}#t=0.1`}
      muted
      playsInline
      preload="metadata"
      poster={media.poster || undefined}
      onError={() => setPlaybackError(true)}
    />
  )
}

function joinClass(...parts) {
  return parts.filter(Boolean).join(' ')
}
