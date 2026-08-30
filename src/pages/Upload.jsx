import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'
import { UNCATEGORIZED_ID } from '../lib/events'
import { subscribeLocations } from '../lib/locations'
import { createPost, MAX_VIDEO_BYTES } from '../lib/posts'
import { ETC_ID, ETC_NAME, locationIdForSpot, regionCenter } from '../lib/campusRegions'
import CampusMap from '../components/CampusMap'
import IdentityPicker from '../components/IdentityPicker'
import Modal from '../components/Modal'

export default function Upload() {
  const navigate = useNavigate()
  const { uid, identity } = useIdentity()
  const [locations, setLocations] = useState([])
  const [spot, setSpot] = useState(null)
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [showMap, setShowMap] = useState(false)
  // 태블릿을 여러 학생이 돌려 쓰므로 매번 보여준다(localStorage로 한 번만 보여주지 않는다).
  const [showConsent, setShowConsent] = useState(true)

  useEffect(() => subscribeLocations(setLocations), [])

  // 찍은 좌표가 어느 장소인지는 좌표에서 바로 계산한다(따로 고르지 않는다).
  const pickedLocationId = useMemo(() => (spot ? locationIdForSpot(spot) : null), [spot])
  const pickedLocationName = useMemo(() => {
    if (!pickedLocationId) return null
    if (pickedLocationId === ETC_ID) return ETC_NAME
    return locations.find((l) => l.id === pickedLocationId)?.name || ETC_NAME
  }, [pickedLocationId, locations])

  async function handleSubmit(e) {
    e.preventDefault()
    // 화면 순서(사진 → 위치)대로 안내해야 어디를 고쳐야 할지 헷갈리지 않는다.
    if (!files.length) {
      setError('올릴 사진이나 동영상을 선택해 주세요.')
      return
    }
    if (!spot) {
      setError('사진을 찍은 위치를 지도에서 골라 주세요.')
      // 접혀 있으면 펼쳐 줘야 무엇을 해야 하는지 바로 보인다.
      setShowMap(true)
      return
    }
    setSubmitting(true)
    setError('')
    setProgress({ done: 0, total: files.length })
    try {
      const postId = await createPost({
        eventId: UNCATEGORIZED_ID,
        spot,
        authorUid: uid,
        authorInfo: identity,
        files,
        caption,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      navigate(`/post/${postId}`)
    } catch (err) {
      console.error(err)
      setError(err.message || '업로드 중 문제가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <div className="page upload">
      <h1>사진·동영상 올리기</h1>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>사진·동영상 (여러 개 선택 가능, 동영상은 50MB까지)</label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files)
              e.target.value = ''
              // 용량 초과 동영상은 선택 단계에서 걸러 목록에 넣지 않는다.
              // 올리기를 눌러야 알게 되면, 앞서 고른 다른 파일이 이미 올라간 뒤에
              // 실패해 고아 파일이 남을 수 있다.
              const tooBig = picked.filter(
                (f) => f.type.startsWith('video/') && f.size > MAX_VIDEO_BYTES
              )
              const ok = picked.filter((f) => !tooBig.includes(f))
              setError(
                tooBig.length
                  ? `동영상 "${tooBig[0].name}"이 50MB를 넘어요. 더 짧은 영상으로 올려주세요.`
                  : ''
              )
              setFiles((prev) => [...prev, ...ok])
            }}
          />
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${f.lastModified}-${i}`}>
                  <span>
                    {f.type.startsWith('video/') ? '[VIDEO] ' : '[IMG] '}
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length > 0 && <p className="hint">{files.length}개 선택됨 — 더 고르려면 다시 눌러주세요</p>}
        </div>

        {/* 사진을 고른 다음 위치를 정하는 순서. 지도는 자리를 많이 차지해서 기본은 접어 둔다. */}
        <div className="field">
          <label>사진을 찍은 곳</label>
          <button
            type="button"
            className="spot-toggle"
            onClick={() => setShowMap((v) => !v)}
            aria-expanded={showMap}
          >
            {showMap ? '지도 접기' : '위치 선택하기'}
          </button>

          {showMap && (
            <>
              <p className="hint">지도에서 사진을 찍은 자리를 눌러 주세요.</p>
              <CampusMap
                categories={locations}
                activeId={null}
                onSelect={() => {}}
                spot={spot}
                onMapClick={setSpot}
              />

              {/* 지도 탭과 완전히 동등한 또 하나의 입력 수단. 고르면 그 구역 한가운데에 찍힌다. */}
              <p className="hint pick-list-title">정해진 장소에서 고르기</p>
              <div className="event-filter">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    className={pickedLocationId === loc.id ? 'chip active' : 'chip'}
                    aria-pressed={pickedLocationId === loc.id}
                    onClick={() => setSpot(regionCenter(loc.id))}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {spot ? (
            <>
              <p className="picked-where">
                지금 고른 곳: <strong>{pickedLocationName}</strong>
              </p>
              <button type="button" className="spot-clear" onClick={() => setSpot(null)}>
                고른 위치 지우기
              </button>
            </>
          ) : (
            <p className="picked-where empty-where">아직 위치를 고르지 않았어요</p>
          )}
        </div>

        <div className="field">
          <label>설명 (선택)</label>
          <p className="hint">사진에 무엇이 담겼는지 적으면 눈이 불편한 친구도 알 수 있어요.</p>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
        </div>

        {error && <p className="error">{error}</p>}

        {/* 누구 이름으로 올리는지 올리기 직전에 보여주고, 여기서 바로 바꿀 수 있게 한다. */}
        {identity && (
          <p className="writing-as">
            <span>
              <strong>
                {identity.grade}-{identity.class} {identity.name}
              </strong>{' '}
              이름으로 올려요
            </span>
            <button type="button" className="change-name-btn" onClick={() => setShowPicker(true)}>
              바꾸기
            </button>
          </p>
        )}

        <button className="primary" type="submit" disabled={submitting}>
          {submitting
            ? progress
              ? `${progress.total}개 중 ${progress.done}개 업로드 중...`
              : '업로드 중...'
            : '올리기'}
        </button>
      </form>

      {showPicker && (
        <IdentityPicker
          reason="다른 사람이 쓸 차례라면 이름을 새로 골라 주세요."
          onCancel={() => setShowPicker(false)}
          onDone={() => setShowPicker(false)}
        />
      )}

      {/* 실수로 넘기지 않도록 배경 클릭·Esc로는 닫히지 않게 한다(다른 모달과 다른 점). */}
      {showConsent && (
        <Modal role="alertdialog" label="사진 올리기 전 확인" dismissible={false}>
          <h2 className="modal-title">올리기 전에 꼭 확인해요</h2>
            <ol className="help-list">
              <li>
                <strong>친구가 나온 사진인가요?</strong>
                <span>올리기 전에 그 친구에게 “이 사진 올려도 돼?” 하고 꼭 물어보세요.</span>
              </li>
              <li>
                <strong>친구가 싫다고 하면</strong>
                <span>
                  그 사진은 올리지 않아요. 꼭 올리고 싶다면 친구 얼굴이 안 보이게 가린(모자이크)
                  다음에 올려주세요.
                </span>
              </li>
              <li>
                <strong>이런 사진은 올리지 않아요</strong>
                <span>
                  친구가 부끄러워하거나 놀림받을 수 있는 사진, 친구 몰래 찍은 사진은 올리지 않아요.
                </span>
              </li>
            </ol>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => navigate('/')}>
                그만두기
              </button>
              <button type="button" className="primary" onClick={() => setShowConsent(false)}>
                확인했어요
              </button>
            </div>
        </Modal>
      )}
    </div>
  )
}
