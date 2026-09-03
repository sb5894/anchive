import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import CampusMap from '../components/CampusMap'
import ConfirmDialog from '../components/ConfirmDialog'
import IdentityPicker from '../components/IdentityPicker'
import { ETC_ID, ETC_NAME, locationIdForSpot, regionCenter } from '../lib/campusRegions'
import { subscribeLocations } from '../lib/locations'
import {
  addComment,
  editComment,
  MAX_VIDEO_BYTES,
  softDeleteComment,
  softDeletePost,
  subscribeComments,
  subscribeLiked,
  subscribePost,
  toggleLike,
  updatePost,
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
  // 수정 모드에서 임시로 들고 있는 값들. 저장을 눌러야 실제 게시물에 반영된다.
  const [editing, setEditing] = useState(false)
  const [draftCaption, setDraftCaption] = useState('')
  const [draftSpot, setDraftSpot] = useState(null)
  const [draftMedia, setDraftMedia] = useState([]) // 남길 기존 사진 {url, type}
  const [newFiles, setNewFiles] = useState([]) // 새로 고른 File 객체
  const [editMapOpen, setEditMapOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [actionError, setActionError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [locations, setLocations] = useState([])
  const [liked, setLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [deletingComment, setDeletingComment] = useState(null)
  const [mediaIndex, setMediaIndex] = useState(0)
  const [showSpotMap, setShowSpotMap] = useState(false)
  const trackRef = useRef(null)
  const [confirmingPostDelete, setConfirmingPostDelete] = useState(false)
  // 내가 방금 삭제하고 첫 화면으로 이동하는 중임을 표시한다. 이게 없으면 삭제 직후
  // Firestore가 deleted:true를 먼저 반영해 navigate('/')가 끝나기 전 한 프레임 동안
  // "게시물을 찾을 수 없어요"가 스쳐 지나간다.
  const [leaving, setLeaving] = useState(false)

  // 관리자는 남의 글/댓글도 지울 수 있고, 삭제된 글도 계속 볼 수 있다(행사 당일 즉시 대응·확인용).
  const isAdmin = !isAnonymous

  useEffect(
    () =>
      subscribePost(
        postId,
        (data) => {
          setPost(data)
          setCheckedPostId(postId)
          setLoadError('')
        },
        (err) => {
          console.error(err)
          setLoadError('연결이 불안정해요. 잠시 후 다시 시도해 주세요.')
        }
      ),
    [postId]
  )
  useEffect(() => subscribeComments(postId, setComments), [postId])
  useEffect(() => subscribeLocations(setLocations), [])
  useEffect(() => subscribeLiked(postId, uid, setLiked), [postId, uid])

  // 수정 모드에서 새로 고른 파일의 임시 미리보기 주소. Upload.jsx와 같은 방식.
  const newPreviews = useMemo(
    () =>
      newFiles.map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        isVideo: f.type.startsWith('video/'),
      })),
    [newFiles]
  )
  useEffect(() => () => newPreviews.forEach((p) => URL.revokeObjectURL(p.url)), [newPreviews])

  if (loadError && checkedPostId !== postId) {
    return (
      <div className="page center post-not-found">
        <p>{loadError}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    )
  }

  if (leaving || checkedPostId !== postId) return <div className="page center">불러오는 중...</div>

  // 삭제된 게시물은 일반 사용자에게는 "찾을 수 없음"과 동일하게 처리한다.
  // 데이터 자체(및 Storage 파일)는 지워지지 않으므로 완전한 삭제는 별도 관리 스크립트가 필요하다.
  if (!post || (post.deleted && !isAdmin)) {
    return (
      <div className="page center post-not-found">
        <p>게시물을 찾을 수 없어요.</p>
        <Link to="/" className="primary">
          지도로 돌아가기
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

  // 수정 모드에서 지금 고른 위치의 이름. draftSpot 기준으로 같은 방식 계산.
  const draftLocationId = draftSpot ? locationIdForSpot(draftSpot) : null
  const draftLocationName = draftLocationId
    ? draftLocationId === ETC_ID
      ? ETC_NAME
      : locations.find((l) => l.id === draftLocationId)?.name || ETC_NAME
    : null

  async function runAction(fn) {
    try {
      setActionError('')
      await fn()
      return true
    } catch (err) {
      console.error(err)
      setActionError('처리 중 문제가 발생했습니다. 다시 시도해 주세요.')
      return false
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
    setLeaving(true)
    const ok = await runAction(() => softDeletePost(postId, post.caption))
    if (ok) {
      navigate('/')
    } else {
      // 삭제가 실패했으면 "찾을 수 없음" 화면에 갇히지 않도록 되돌린다.
      setLeaving(false)
    }
  }

  async function handleSaveEdit() {
    // 편집 중에는 0장이어도 되지만, 저장은 막는다(사진 0장 게시물은 모든 화면에서 빈 칸으로 깨진다).
    if (draftMedia.length + newFiles.length === 0) {
      setActionError('사진이나 동영상이 최소 한 개는 있어야 해요.')
      return
    }
    if (!draftSpot) {
      setActionError('사진을 찍은 위치를 지도에서 골라 주세요.')
      setEditMapOpen(true)
      return
    }

    setSavingEdit(true)
    const ok = await runAction(() =>
      updatePost({
        postId,
        eventId: post.eventId,
        keptMedia: draftMedia,
        newFiles,
        newSpot: draftSpot,
        newCaption: draftCaption.trim(),
        previousCaption: post.caption,
      })
    )
    setSavingEdit(false)
    if (ok) {
      setEditing(false)
      setNewFiles([])
    }
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

  // 관리자도 남의 글을 고칠 수 있다(문구 한 줄 때문에 글 전체를 지우지 않아도 되게).
  const canEditPost = post.authorUid === uid || isAdmin
  const canDeletePost = post.authorUid === uid || isAdmin

  // 감싸는 라벨이 없는 화면이라(카드와 달리) alt이 스크린리더의 유일한 정보원이다.
  const mediaAltBase = `${post.authorInfo?.grade}-${post.authorInfo?.class} ${post.authorInfo?.name}님이 올린 사진`

  return (
    <div className="page post-detail">
      <Link to="/" className="back">
        ← 지도로
      </Link>

      {isAdmin && <p className="admin-banner">관리자 모드 — 모든 글과 댓글을 고치고 지울 수 있어요</p>}
      {isAdmin && post.deleted && (
        <p className="admin-banner">삭제된 게시물 — 관리자에게만 보여요</p>
      )}

      {/* 여러 장은 세로로 쌓지 않고 옆으로 넘겨 본다.
          터치 기기에서는 스와이프(scroll-snap), 그 외에는 ‹ › 버튼으로 — 두 경로 모두 제공. */}
      <div className="media-viewer">
        <div className="images" ref={trackRef} onScroll={handleTrackScroll}>
          {post.media?.map((m, i) =>
            m.type === 'video' ? (
              <video key={m.url} src={m.url} controls playsInline />
            ) : (
              <img
                key={m.url}
                src={m.url}
                alt={post.caption || `${mediaAltBase}${mediaCount > 1 ? ` ${i + 1}` : ''}`}
              />
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

      {/* 수정 중일 때는 저장 버튼 바로 위에 따로 띄운다(아래 edit-actions 앞) — 화면 위쪽에
          두면 스크롤해서 저장을 누르려는 순간 눈에 안 들어와 놓치기 쉽다. */}
      {actionError && !editing && <p className="error">{actionError}</p>}

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
        {!editing && canEditPost && (
          <button
            className="delete-btn"
            onClick={() => {
              setDraftCaption(post.caption || '')
              setDraftSpot(post.spot || null)
              setDraftMedia(post.media || [])
              setNewFiles([])
              setEditMapOpen(false)
              setEditing(true)
            }}
          >
            수정
          </button>
        )}
        {!editing && canDeletePost && (
          <button className="delete-btn" onClick={handleDeletePost}>
            삭제
          </button>
        )}
      </div>

      {editing ? (
        <div className="edit-panel">
          {/* 1 사진 */}
          <div className="field">
            <label className="step-label" htmlFor="edit-file-input">
              <span className="step-num">1</span>
              사진·동영상
            </label>
            <input
              id="edit-file-input"
              className="visually-hidden"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files)
                e.target.value = ''
                const tooBig = picked.filter(
                  (f) => f.type.startsWith('video/') && f.size > MAX_VIDEO_BYTES
                )
                setActionError(
                  tooBig.length
                    ? `동영상 "${tooBig[0].name}"이 50MB를 넘어요. 더 짧은 영상으로 올려주세요.`
                    : ''
                )
                setNewFiles((prev) => [...prev, ...picked.filter((f) => !tooBig.includes(f))])
              }}
            />
            <label htmlFor="edit-file-input" className="file-pick-btn">
              사진·동영상 더 고르기
            </label>

            <ul className="file-preview-grid">
              {draftMedia.map((m, i) => (
                <li key={m.url} className="file-preview">
                  {m.type === 'video' ? (
                    <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" />
                  ) : (
                    <img src={m.url} alt="" />
                  )}
                  <button
                    type="button"
                    className="file-preview-remove"
                    aria-label={`${i + 1}번째 사진 빼기`}
                    onClick={() => setDraftMedia((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </li>
              ))}
              {newPreviews.map((p, i) => (
                <li key={`new-${p.name}-${i}`} className="file-preview">
                  {p.isVideo ? (
                    <video src={`${p.url}#t=0.1`} muted playsInline preload="metadata" />
                  ) : (
                    <img src={p.url} alt="" />
                  )}
                  <button
                    type="button"
                    className="file-preview-remove"
                    aria-label={`${p.name} 빼기`}
                    onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {draftMedia.length + newFiles.length === 0 && (
              <p className="hint">사진이나 동영상이 최소 한 개는 있어야 저장할 수 있어요.</p>
            )}
          </div>

          {/* 2 위치 */}
          <div className="field">
            <label className="step-label">
              <span className="step-num">2</span>
              사진을 찍은 곳
            </label>
            <button
              type="button"
              className="spot-toggle"
              onClick={() => setEditMapOpen((v) => !v)}
              aria-expanded={editMapOpen}
            >
              {editMapOpen ? '지도 접기' : '위치 바꾸기'}
            </button>
            {editMapOpen && (
              <>
                <p className="hint">지도에서 사진을 찍은 자리를 눌러 주세요.</p>
                <CampusMap
                  categories={locations}
                  activeId={null}
                  onSelect={() => {}}
                  spot={draftSpot}
                  onMapClick={setDraftSpot}
                />
                <p className="hint pick-list-title">정해진 장소에서 고르기</p>
                <div className="event-filter">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      className={draftLocationId === loc.id ? 'chip active' : 'chip'}
                      aria-pressed={draftLocationId === loc.id}
                      onClick={() => setDraftSpot(regionCenter(loc.id))}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {draftSpot ? (
              <p className="picked-where">
                지금 고른 곳: <strong>{draftLocationName}</strong>
              </p>
            ) : (
              <p className="picked-where empty-where">아직 위치를 고르지 않았어요</p>
            )}
          </div>

          {/* 3 설명 */}
          <div className="field">
            <label className="step-label" htmlFor="edit-caption">
              <span className="step-num">3</span>
              설명
            </label>
            <input id="edit-caption" value={draftCaption} onChange={(e) => setDraftCaption(e.target.value)} />
          </div>

          {actionError && <p className="error">{actionError}</p>}

          <div className="edit-actions">
            <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>
              취소
            </button>
            <button type="button" className="primary" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? '저장하는 중...' : '저장'}
            </button>
          </div>
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
                  {(c.authorUid === uid || isAdmin) && (
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
