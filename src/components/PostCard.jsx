import { Link } from 'react-router-dom'

export default function PostCard({ post }) {
  const first = post.media?.[0]
  // 인스타 프로필 그리드 느낌: 작성자/좋아요는 그리드에서 안 보이고 상세 화면에서만 보임.
  // 화면엔 안 보여도 스크린리더 사용자를 위해 접근성 라벨은 남겨둔다(UDL).
  const a11yLabel = `${post.authorInfo?.grade}-${post.authorInfo?.class} ${post.authorInfo?.name}님이 올린 사진, 좋아요 ${post.likeCount || 0}개`
  return (
    <Link to={`/post/${post.id}`} className="post-card" aria-label={a11yLabel}>
      <div className="post-card-image">
        {first?.type === 'video' && <video src={first.url} muted playsInline />}
        {first && first.type !== 'video' && <img src={first.url} alt="" loading="lazy" />}
        {first?.type === 'video' && <span className="play-badge">▶</span>}
        {post.media?.length > 1 && <span className="album-badge">앨범 {post.media.length}</span>}
      </div>
    </Link>
  )
}
