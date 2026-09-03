import { Link } from 'react-router-dom'
import PostVideo from './PostVideo'

export default function PostCard({ post, onAdminDelete }) {
  const first = post.media?.[0]
  // 준비 중/실패 상태에서는 재생을 유도하는 ▶ 배지를 보여주지 않는다.
  const isPlayable = first?.type === 'video' && !first.status
  // 이름·좋아요 줄을 없애 사진만 남겼으니, 그 정보는 스크린리더용 라벨로 옮긴다.
  // 카드 전체가 Link로 감싸여 있어 안쪽 img의 alt은 링크 이름 계산에서 무시되므로,
  // 캡션도 여기 라벨에 함께 넣는다(img alt=""는 그대로 두는 게 맞다).
  const who = `${post.authorInfo?.grade}-${post.authorInfo?.class} ${post.authorInfo?.name}님이 올린 사진`
  const a11yLabel = post.caption
    ? `${who}: ${post.caption}, 좋아요 ${post.likeCount || 0}개`
    : `${who}, 좋아요 ${post.likeCount || 0}개`
  return (
    <div className="post-card-wrap">
      <Link to={`/post/${post.id}`} className="post-card" aria-label={a11yLabel}>
        <div className="post-card-image">
          {first?.type === 'video' && <PostVideo media={first} mode="thumb" />}
          {first && first.type !== 'video' && <img src={first.url} alt="" loading="lazy" />}
          {isPlayable && <span className="play-badge">▶</span>}
          {post.media?.length > 1 && <span className="album-badge">앨범 {post.media.length}</span>}
        </div>
      </Link>
      {onAdminDelete && (
        <button
          type="button"
          className="card-delete-btn"
          onClick={() => onAdminDelete(post)}
          aria-label={`${post.authorInfo?.grade}-${post.authorInfo?.class} ${post.authorInfo?.name}님의 게시물 삭제`}
        >
          삭제
        </button>
      )}
    </div>
  )
}
