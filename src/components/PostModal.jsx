import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { addComment, toggleLike } from '../lib/posts'

export default function PostModal({ post, onClose }) {
  const { uid, identity } = useIdentity()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!post) return null

  async function handleLike() {
    try {
      await toggleLike(post.id, uid)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      await addComment({ postId: post.id, authorUid: uid, authorInfo: identity, text: text.trim() })
      setText('')
      setSent(true)
    } catch (err) {
      console.error(err)
      setError('댓글을 남기지 못했어요. 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  const first = post.media?.[0]

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="사진 크게 보기"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
          ✕ <span className="modal-close-text">닫기</span>
        </button>

        <div className="modal-media">
          {first?.type === 'video' ? (
            <video src={first.url} controls playsInline />
          ) : (
            first && <img src={first.url} alt="" />
          )}
          {post.media?.length > 1 && (
            <span className="modal-album-badge">앨범 사진 {post.media.length}장</span>
          )}
        </div>

        <div className="modal-body">
          <div className="modal-meta">
            <span className="author">
              {post.authorInfo?.grade}-{post.authorInfo?.class} {post.authorInfo?.name}
            </span>
            <button type="button" className="like-btn" onClick={handleLike}>
              ♥ 좋아요 {post.likeCount || 0}
            </button>
          </div>

          {post.caption && <p className="caption">{post.caption}</p>}

          <form className="comment-form" onSubmit={handleComment}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기서 바로 댓글을 남겨보세요"
              aria-label="댓글 입력"
            />
            <button type="submit" disabled={sending}>
              {sending ? '보내는 중' : '등록'}
            </button>
          </form>
          {sent && <p className="hint modal-sent">댓글을 남겼어요. 고마워요!</p>}
          {error && <p className="error">{error}</p>}

          <Link to={`/post/${post.id}`} className="modal-detail-link">
            댓글 전체 보기 · 사진 자세히 보기 →
          </Link>
        </div>
      </div>
    </div>
  )
}
