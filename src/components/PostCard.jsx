import { Link } from 'react-router-dom'

export default function PostCard({ post }) {
  const first = post.media?.[0]
  return (
    <Link to={`/post/${post.id}`} className="post-card">
      <div className="post-card-image">
        {first?.type === 'video' && <video src={first.url} muted playsInline />}
        {first && first.type !== 'video' && <img src={first.url} alt="" loading="lazy" />}
        {first?.type === 'video' && (
          <span className="play-badge">
            <span aria-hidden="true">▶</span> 영상
          </span>
        )}
        {post.media?.length > 1 && <span className="album-badge">📎 {post.media.length}장</span>}
      </div>
      <div className="post-card-meta">
        <span className="author">
          {post.authorInfo?.grade}-{post.authorInfo?.class} {post.authorInfo?.name}
        </span>
        <span className="likes">♥ {post.likeCount || 0}</span>
      </div>
    </Link>
  )
}
