import { Link } from 'react-router-dom'

export default function PostCard({ post }) {
  return (
    <Link to={`/post/${post.id}`} className="post-card">
      <div className="post-card-image">
        {post.imageUrls?.[0] && <img src={post.imageUrls[0]} alt="" loading="lazy" />}
        {post.imageUrls?.length > 1 && <span className="album-badge">앨범 {post.imageUrls.length}</span>}
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
