import { useEffect, useRef, useState } from 'react'
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
  const [mediaIndex, setMediaIndex] = useState(0)
  const [showSpotMap, setShowSpotMap] = useState(false)
  const trackRef = useRef(null)
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

  const mediaCount = post.media?.length || 0

  // 스와이프로 넘겼을 때도 "2 / 4" 표시가 따라오도록 스크롤 위치에서 현재 장을 역산한다.
  function handleTrackScroll(e) {
    const el = e.currentTarget
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== mediaIndex) setMediaIndex(Math.max(0, Math.min(mediaCount - 1, idx)))
  }

  function goToMedia(idx) {
    const el = trackRef.current
    if (!el) return
    const next = Math.max(0, Math.min(mediaCount - 1, idx))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setMediaIndex(next)
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

      {/* 여러 장은 세로로 쌓지 않고 옆으로 넘겨 본다.
          터치 기기에서는 스와이프(scroll-snap), 그 외에는 ‹ › 버튼으로 — 두 경로 모두 제공. */}
      <div className="media-viewer">
        <div className="images" ref={trackRef} onScroll={handleTrackScroll}>
          {post.media?.map((m) =>
            m.type === 'video' ? (
              <video key={m.url} src={m.url} controls playsInline />
            ) : (
              <img key={m.url} src={m.url} alt="" />
            )
          )}
        </div>

        {mediaCount > 1 && (
          <>
            <button
              type="button"
              className="media-nav prev"
              onClick={() => goToMedia(mediaIndex - 1)}
              disabled={mediaIndex === 0}
              aria-label="이전 사진"
            >
              ‹
            </button>
            <button
              type="button"
              className="media-nav next"
              onClick={() => goToMedia(mediaIndex + 1)}
              disabled={mediaIndex >= mediaCount - 1}
              aria-label="다음 사진"
            >
              ›
            </button>
            <p className="media-counter">
              {mediaIndex + 1} / {mediaCount}
            </p>
          </>
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

      {/* 사진 보러 들어온 화면이라 지도는 기본으로 접어 두고, 원할 때만 펼친다. */}
      {post.spot && (
        <div className="spot-preview">
          <p className="hint spot-line">
            <span>
              <strong>{spotLocationName}</strong>에서 찍은 사진이에요
            </span>
            <button
              type="button"
              className="spot-toggle-btn"
              onClick={() => setShowSpotMap((v) => !v)}
              aria-expanded={showSpotMap}
            >
              {showSpotMap ? '접기' : '정확한 위치 보기'}
            </button>
          </p>
          {showSpotMap && (
            <CampusMap categories={[]} activeId={null} onSelect={() => {}} spot={post.spot} />
          )}
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
          <>
            {/* 누구 이름으로 남기는지 쓰기 직전에 보여준다. 태블릿을 돌려 쓸 때
                앞사람 이름으로 올라가는 걸 여기서 알아채고 바꿀 수 있다. */}
            <p className="writing-as">
              <span>
                <strong>
                  {identity.grade}-{identity.class} {identity.name}
                </strong>{' '}
                이름으로 남겨요
              </span>
              <button type="button" className="change-name-btn" onClick={() => setShowPicker(true)}>
                바꾸기
              </button>
            </p>
            <form className="comment-form" onSubmit={handleAddComment}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="댓글을 남겨보세요"
              />
              <button type="submit">등록</button>
            </form>
          </>
        ) : (
          <div className="comment-locked">
            <p className="hint">댓글에 누가 썼는지 표시하려면 이름이 필요해요.</p>
            <button type="button" className="primary" onClick={() => setShowPicker(true)}>
              이름 고르고 댓글 쓰기
            </button>
          </div>
        )}
      </section>

      {showPicker && (
        <IdentityPicker
          reason={
            identity
              ? '다른 사람이 쓸 차례라면 이름을 새로 골라 주세요.'
              : '댓글에 누가 썼는지 표시하려면 이름이 필요해요.'
          }
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
