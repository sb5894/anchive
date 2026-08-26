import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import CampusMap from '../components/CampusMap'
import ConfirmDialog from '../components/ConfirmDialog'
import IdentityPicker from '../components/IdentityPicker'
import { ETC_ID, ETC_NAME, locationIdForSpot } from '../lib/campusRegions'
import { subscribeLocations } from '../lib/locations'
import {
  addComment,
  editComment,
  editPost,
  softDeleteComment,
  softDeletePost,
  subscribeComments,
  subscribeLiked,
  subscribePost,
  toggleLike,
} from '../lib/posts'

export default function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { uid, identity, isAnonymous } = useIdentity()
  const [post, setPost] = useState(null)
  // postId별로 스냅샷을 한 번이라도 받았는지 추적한다(로딩 vs. 존재하지 않음 구분용).
  const [checkedPostId, setCheckedPostId] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')
  const [actionError, setActionError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [locations, setLocations] = useState([])
  const [liked, setLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [deletingComment, setDeletingComment] = useState(null)
  const [confirmingPostDelete, setConfirmingPostDelete] = useState(false)

  useEffect(
    () =>
      subscribePost(postId, (data) => {
        setPost(data)
        setCheckedPostId(postId)
      }),
    [postId]
  )
  useEffect(() => subscribeComments(postId, setComments), [postId])
  useEffect(() => subscribeLocations(setLocations), [])
  useEffect(() => subscribeLiked(postId, uid, setLiked), [postId, uid])

  if (checkedPostId !== postId) return <div className="page center">불러오는 중...</div>

  if (!post) {
    return (
      <div className="page center post-not-found">
        <p>게시물을 찾을 수 없어요.</p>
        <Link to="/" className="primary">
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  // 저장된 장소가 아니라 찍힌 좌표에서 계산한다(Feed·Upload와 같은 기준).
  const spotLocationId = post.spot ? locationIdForSpot(post.spot) : null
  const spotLocationName =
    spotLocationId === ETC_ID
      ? ETC_NAME
      : locations.find((l) => l.id === spotLocationId)?.name || ETC_NAME

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
    if (!identity) {
      setShowPicker(true)
      return
    }
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

  function handleDeleteComment(comment) {
    setDeletingComment(comment)
  }

  async function confirmDeleteComment() {
    const comment = deletingComment
    setDeletingComment(null)
    await runAction(() =>
      softDeleteComment({ postId, commentId: comment.id, previousText: comment.text })
    )
  }

  function handleDeletePost() {
    setConfirmingPostDelete(true)
  }

  async function confirmDeletePost() {
    setConfirmingPostDelete(false)
    await runAction(async () => {
      await softDeletePost(postId, post.caption)
      navigate('/')
    })
  }

  async function handleSaveCaption() {
    await runAction(async () => {
      await editPost({ postId, newCaption: captionDraft.trim(), previousCaption: post.caption })
      setEditingCaption(false)
    })
  }

  async function handleToggleLike() {
    if (liking) return
    setLiking(true)
    try {
      await runAction(() => toggleLike(postId, uid))
    } finally {
      setLiking(false)
    }
  }

  // 관리자는 남의 글/댓글도 지울 수 있게 한다(행사 당일 즉시 대응용).
  const isAdmin = !isAnonymous
  const canEditPost = post.authorUid === uid
  const canDeletePost = canEditPost || isAdmin

  return (
    <div className="page post-detail">
      <Link to="/" className="back">
        ← 지도로
      </Link>

      {isAdmin && <p className="admin-banner">관리자 모드 — 모든 글과 댓글을 지울 수 있어요</p>}

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
        <button
          className={liked ? 'like-btn active' : 'like-btn'}
          onClick={handleToggleLike}
          disabled={liking}
          aria-pressed={liked}
        >
          ♥ {post.likeCount || 0}
        </button>
        {!editingCaption && canEditPost && (
          <button
            className="delete-btn"
            onClick={() => {
              setCaptionDraft(post.caption || '')
              setEditingCaption(true)
            }}
          >
            수정
          </button>
        )}
        {!editingCaption && canDeletePost && (
          <button className="delete-btn" onClick={handleDeletePost}>
            삭제
          </button>
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

      {post.spot && (
        <div className="spot-preview">
          <p className="hint">
            <strong>{spotLocationName}</strong>에서 찍은 사진이에요
          </p>
          <CampusMap categories={[]} activeId={null} onSelect={() => {}} spot={post.spot} />
        </div>
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
              {editingId !== c.id && (c.authorUid === uid || isAdmin) && (
                <div className="comment-actions">
                  {c.authorUid === uid && (
                    <button
                      onClick={() => {
                        setEditingId(c.id)
                        setEditText(c.text)
                      }}
                    >
                      수정
                    </button>
                  )}
                  <button onClick={() => handleDeleteComment(c)}>삭제</button>
                </div>
              )}
            </div>
          ))}

        {identity ? (
          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 남겨보세요"
            />
            <button type="submit">등록</button>
          </form>
        ) : (
          <div className="comment-locked">
            <p className="hint">이름을 고르면 댓글을 쓸 수 있어요.</p>
            <button type="button" className="primary" onClick={() => setShowPicker(true)}>
              이름 고르기
            </button>
          </div>
        )}
      </section>

      {showPicker && (
        <IdentityPicker
          reason="댓글에 누가 썼는지 표시하려면 이름이 필요해요."
          onCancel={() => setShowPicker(false)}
          onDone={() => setShowPicker(false)}
        />
      )}

      {deletingComment && (
        <ConfirmDialog
          title="댓글을 삭제할까요?"
          confirmLabel="삭제"
          danger
          onCancel={() => setDeletingComment(null)}
          onConfirm={confirmDeleteComment}
        />
      )}

      {confirmingPostDelete && (
        <ConfirmDialog
          title="게시물을 삭제할까요?"
          confirmLabel="삭제"
          danger
          onCancel={() => setConfirmingPostDelete(false)}
          onConfirm={confirmDeletePost}
        />
      )}
    </div>
  )
}
