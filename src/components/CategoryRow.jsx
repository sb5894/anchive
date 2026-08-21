import { Link } from 'react-router-dom'
import PostCard from './PostCard'

const PREVIEW_COUNT = 8

export default function CategoryRow({ title, posts, categoryId }) {
  if (posts.length === 0) return null
  const preview = posts.slice(0, PREVIEW_COUNT)

  return (
    <section className="category-row">
      <div className="category-row-head">
        <h2>{title}</h2>
        <span className="category-count">사진 {posts.length}장</span>
      </div>
      <div className="category-row-scroll">
        {preview.map((p) => (
          <div className="category-row-item" key={p.id}>
            <PostCard post={p} />
          </div>
        ))}
        <Link to={`/feed/category/${categoryId}`} className="category-more">
          <span className="category-more-icon">＋</span>
          <span>{title}
            <br />
            더보기</span>
        </Link>
      </div>
    </section>
  )
}
