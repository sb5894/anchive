import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import {
  addComment,
  editComment,
  editPost,
  softDeleteComment,
  softDeletePost,
  subscribeComments,
  subscribePost,
  toggleLike,
} from '../lib/posts'

export default function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { uid, identity } = useIdentity()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => subscribePost(postId, setPost), [postId])
  useEffect(() => subscribeComments(postId, setComments), [postId])

  if (!post) return <div className="page center">불러오는 중...</div>

  async function runAction(fn) {
    try {
      setActionError('')
      await fn()
    } catch (err) {
      console.error(err)
      setActionError('처리 중 문제가 발생했습니다. 다시 시도해 주세요.')
    }
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    await runAction(async () => {
      await addComment({ postId, authorUid: uid, authorInfo: identity, text: commentText.trim() })
      setCommentText('')
    })
  }

  async function handleSaveEdit(comment) {
    if (!editText.trim()) return
    await runAction(async () => {
      await editComment({ postId, commentId: comment.id, newText: editText.trim(), previousText: comment.text })
      setEditingId(null)
    })
  }

  async function handleDeleteComment(comment) {
    if (!confirm('댓글을 삭제할까요?')) return
    await runAction(() =>
      softDeleteComment({ postId, commentId: comment.id, previousText: comment.text })
    )
  }

  async function handleDeletePost() {
    if (!confirm('게시물을 삭제할까요?')) return
    await runAction(async () => {
      await softDeletePost(postId, post.caption)
      navigate('/feed')
    })
  }

  async function handleSaveCaption() {
    await runAction(async () => {
      await editPost({ postId, newCaption: captionDraft.trim(), previousCaption: post.caption })
      setEditingCaption(false)
    })
  }

  async function handleToggleLike() {
    await runAction(() => toggleLike(postId, uid))
  }

  const isOwnPost = post.authorUid === uid

  return (
    <div className="page post-detail">
      <Link to="/feed" className="back">
        ← 앨범으로 돌아가기
      </Link>

      <div className="images">
        {post.media?.map((m) =>
          m.type === 'video' ? (
            <video key={m.url} src={m.url} controls playsInline />
          ) : (
            <img key={m.url} src={m.url} alt="" />
          )
        )}
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <div className="post-meta">
        <span className="author">
          {post.authorInfo?.grade}-{post.authorInfo?.class} {post.authorInfo?.name}
        </span>
        <button className="like-btn" onClick={handleToggleLike}>
          ♥ 좋아요 {post.likeCount || 0}
        </button>
        {isOwnPost && !editingCaption && (
          <>
            <button
              className="delete-btn"
              onClick={() => {
                setCaptionDraft(post.caption || '')
                setEditingCaption(true)
              }}
            >
              수정
            </button>
            <button className="delete-btn" onClick={handleDeletePost}>
              삭제
            </button>
          </>
        )}
      </div>

      {editingCaption ? (
        <div className="comment-edit caption-edit">
          <input value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} />
          <button onClick={handleSaveCaption}>저장</button>
          <button onClick={() => setEditingCaption(false)}>취소</button>
        </div>
      ) : (
        post.caption && (
          <p className="caption">
            {post.caption}
            {post.editedAt && <span className="edited-tag"> (수정됨)</span>}
          </p>
        )
      )}

      <section className="comments">
        <h2>댓글 {comments.filter((c) => !c.deleted).length}</h2>

        {comments
          .filter((c) => !c.deleted)
          .map((c) => (
            <div key={c.id} className="comment">
              <span className="comment-author">
                {c.authorInfo?.grade}-{c.authorInfo?.class} {c.authorInfo?.name}
              </span>
              {editingId === c.id ? (
                <div className="comment-edit">
                  <input value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <button onClick={() => handleSaveEdit(c)}>저장</button>
                  <button onClick={() => setEditingId(null)}>취소</button>
                </div>
              ) : (
                <p className="comment-text">
                  {c.text}
                  {c.editedAt && <span className="edited-tag"> (수정됨)</span>}
                </p>
              )}
              {c.authorUid === uid && editingId !== c.id && (
                <div className="comment-actions">
                  <button
                    onClick={() => {
                      setEditingId(c.id)
                      setEditText(c.text)
                    }}
                  >
                    수정
                  </button>
                  <button onClick={() => handleDeleteComment(c)}>삭제</button>
                </div>
              )}
            </div>
          ))}

        <form className="comment-form" onSubmit={handleAddComment}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 남겨보세요"
          />
          <button type="submit">등록</button>
        </form>
      </section>
    </div>
  )
}
