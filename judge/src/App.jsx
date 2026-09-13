import { useEffect, useMemo, useState } from 'react'
import { subscribeFeedByLocation } from '../../src/lib/posts'
import { subscribeLocations } from '../../src/lib/locations'
import { ETC_ID, ETC_NAME, locationIdForSpot } from '../../src/lib/campusRegions'
import { classLabel, compareGrade, gradeLabel, whoLabel } from '../../src/lib/identityLabel'
import PostVideo from '../../src/components/PostVideo'
import { normalizeJudgeName, useJudge } from './useJudge'
import { deletePickDoc, mediaKeyOf, registerJudge, setPick, subscribeAllPicks, subscribeJudges } from './judgeData'
import Viewer from './Viewer'

const TABS = [
  { id: 'all', label: '전체 사진', icon: '🖼️' },
  { id: 'mine', label: '내 후보', icon: '⭐' },
  { id: 'total', label: '합산', icon: '📊' },
]

export default function App() {
  const { user, authError, name, setName } = useJudge()
  if (authError) return <div className="center-page">{authError}</div>
  if (!user) return <div className="center-page">준비 중…</div>
  if (!name) return <NameScreen onSubmit={setName} />
  return <JudgeHome judge={name} uid={user.uid} onChangeName={() => setName('')} />
}

function NameScreen({ onSubmit }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [judges, setJudges] = useState([])

  useEffect(() => subscribeJudges(setJudges, (err) => console.error(err)), [])

  function submit(e) {
    e.preventDefault()
    const { value: v, error: err } = normalizeJudgeName(value)
    if (err) return setError(err)
    onSubmit(v)
  }

  return (
    <div className="center-page">
      <form className="name-card" onSubmit={submit}>
        <h1>📸 추억지도 사진 심사</h1>
        <p className="muted">
          이름을 입력하고 들어오세요. 같은 이름으로 들어오면 PC든 휴대폰이든 내가 고른 후보가 그대로 이어져요.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          placeholder="예: 김선생"
          maxLength={20}
          aria-label="이름"
        />
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          들어가기
        </button>
        {judges.length > 0 && (
          <div className="judge-list">
            <p className="muted">이미 들어온 적 있는 이름</p>
            <div className="chips">
              {judges.map((j) => (
                <button type="button" key={j} className="chip" onClick={() => onSubmit(j)}>
                  {j}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

// 사진 한 장을 가리키는 키. 게시물 id + 게시물 안 순서(화면 표시용, 저장에는 mediaKey를 씀).
const photoKey = (postId, index) => `${postId}#${index}`

function JudgeHome({ judge, uid, onChangeName }) {
  const [posts, setPosts] = useState(null)
  const [locations, setLocations] = useState([])
  const [allPicks, setAllPicks] = useState([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [loc, setLoc] = useState('')
  const [grade, setGrade] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [viewer, setViewer] = useState(null) // { items: 열 때의 목록 [{postId, index}], at }
  const [initialIds, setInitialIds] = useState(null)

  useEffect(() => {
    registerJudge(judge).catch((err) => {
      console.error(err)
      if (err.code === 'permission-denied') setError('후보를 저장할 권한이 없어요. (Firestore 규칙이 아직 배포되지 않았어요)')
    })
  }, [judge])

  useEffect(
    () =>
      subscribeFeedByLocation(
        null,
        (list) => {
          // 처음 받은 게시물 목록을 기억해 두고, 그 뒤에 새로 올라온 것에 NEW 표시를 붙인다.
          setInitialIds((prev) => prev || new Set(list.map((p) => p.id)))
          setPosts(list)
        },
        (err) => {
          console.error(err)
          setError('게시물을 불러오지 못했어요. 새로고침해 주세요.')
        }
      ),
    []
  )
  useEffect(() => subscribeLocations(setLocations, (err) => console.error(err)), [])
  useEffect(
    () =>
      subscribeAllPicks(setAllPicks, (err) => {
        console.error(err)
        if (err.code === 'permission-denied') setError('후보 목록을 읽을 권한이 없어요. (Firestore 규칙이 아직 배포되지 않았어요)')
      }),
    []
  )

  const locationNames = useMemo(() => {
    const m = Object.fromEntries(locations.map((l) => [l.id, l.name || l.id]))
    m[ETC_ID] = ETC_NAME
    return m
  }, [locations])
  const locationOf = (p) => locationNames[locationIdForSpot(p.spot)] || ETC_NAME

  const postsById = useMemo(() => new Map((posts || []).map((p) => [p.id, p])), [posts])

  // 저장된 후보를 "지금 게시물의 몇 번째 사진"으로 풀어 사진별로 모은다.
  // photoKey -> { postId, index, judges: Map(judge -> { pickedAt, docIds }) }
  // 학생이 그 사진을 게시물에서 빼면 찾을 수 없으니 목록에서 빠진다.
  const photoPicks = useMemo(() => {
    const m = new Map()
    for (const pk of allPicks) {
      const post = postsById.get(pk.postId)
      if (!post) continue
      const media = post.media || []
      const index = pk.mediaKey ? media.findIndex((md) => mediaKeyOf(md) === pk.mediaKey) : 0
      if (index < 0 || index >= media.length) continue
      const key = photoKey(pk.postId, index)
      if (!m.has(key)) m.set(key, { postId: pk.postId, index, judges: new Map() })
      const judges = m.get(key).judges
      const prev = judges.get(pk.judge)
      judges.set(pk.judge, {
        pickedAt: Math.min(prev?.pickedAt ?? Infinity, pk.pickedAt),
        docIds: [...(prev?.docIds || []), pk.docId],
      })
    }
    return m
  }, [allPicks, postsById])

  const pickersOf = (postId, index) => {
    const entry = photoPicks.get(photoKey(postId, index))
    if (!entry) return []
    return [...entry.judges.entries()].sort((a, b) => a[1].pickedAt - b[1].pickedAt).map(([j]) => j)
  }
  const myPickOf = (postId, index) => photoPicks.get(photoKey(postId, index))?.judges.get(judge)

  // 게시물마다 내가 고른 사진 수(전체 사진 탭 배지·필터용)
  const myCountByPost = useMemo(() => {
    const m = new Map()
    for (const entry of photoPicks.values()) {
      if (entry.judges.has(judge)) m.set(entry.postId, (m.get(entry.postId) || 0) + 1)
    }
    return m
  }, [photoPicks, judge])
  const myTotal = [...myCountByPost.values()].reduce((a, b) => a + b, 0)

  const grades = useMemo(
    () => [...new Set((posts || []).map((p) => p.authorInfo?.grade).filter((g) => g != null && g !== ''))].sort(compareGrade),
    [posts]
  )
  const locationOptions = useMemo(
    () => [...new Set((posts || []).map((p) => locationNames[locationIdForSpot(p.spot)] || ETC_NAME))].sort((a, b) => a.localeCompare(b, 'ko')),
    [posts, locationNames]
  )

  // 화면에 뿌릴 칸 목록. 전체 사진 탭은 게시물 단위, 내 후보·합산 탭은 사진 한 장 단위다.
  // 각 칸: { post, index, key }
  const items = useMemo(() => {
    if (!posts) return []
    const query = q.trim().toLowerCase()
    const matches = (p) => {
      if (loc && (locationNames[locationIdForSpot(p.spot)] || ETC_NAME) !== loc) return false
      if (grade && String(p.authorInfo?.grade) !== grade) return false
      if (query && !`${whoLabel(p.authorInfo)} ${p.caption || ''}`.toLowerCase().includes(query)) return false
      return true
    }
    if (tab === 'all') {
      return posts
        .filter(matches)
        .filter((p) => (status === 'picked' ? myCountByPost.has(p.id) : status === 'unpicked' ? !myCountByPost.has(p.id) : true))
        .map((p) => ({ post: p, index: 0, key: p.id }))
    }
    const photos = [...photoPicks.values()]
      .map((e) => ({ ...e, post: postsById.get(e.postId), key: photoKey(e.postId, e.index) }))
      .filter((e) => matches(e.post))
    if (tab === 'mine') {
      return photos.filter((e) => e.judges.has(judge)).sort((a, b) => a.judges.get(judge).pickedAt - b.judges.get(judge).pickedAt)
    }
    return photos.sort((a, b) => b.judges.size - a.judges.size || a.post.createdAt?.toMillis?.() - b.post.createdAt?.toMillis?.())
  }, [posts, postsById, tab, loc, grade, status, q, photoPicks, myCountByPost, judge, locationNames])

  // --- 뷰어: 열 때 목록을 고정해 둔다(내 후보 탭에서 후보를 빼도 목록이 흔들리지 않게).
  // 휴대폰 뒤로가기로 닫을 수 있게 열 때 history에 한 칸을 넣는다.
  function openViewer(at) {
    setViewer({ items: items.map((it) => ({ postId: it.post.id, index: it.index })), at })
    history.pushState({ judgeViewer: true }, '')
  }
  function closeViewer() {
    if (history.state?.judgeViewer) history.back()
    else setViewer(null)
  }
  useEffect(() => {
    const onPop = () => setViewer(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  function moveViewer(delta) {
    setViewer((v) => (v ? { ...v, at: Math.min(v.items.length - 1, Math.max(0, v.at + delta)) } : v))
  }

  const viewerItem = viewer ? viewer.items[viewer.at] : null
  const viewerPost = viewerItem ? postsById.get(viewerItem.postId) : null
  useEffect(() => {
    // 다음 칸 사진을 미리 받아 넘길 때 기다림을 줄인다.
    if (!viewer) return
    const next = viewer.items[viewer.at + 1]
    const media = next && postsById.get(next.postId)?.media?.[next.index]
    if (media?.type !== 'video' && media?.url) new Image().src = media.url
  }, [viewer, postsById])

  function togglePick(post, index) {
    const mine = myPickOf(post.id, index)
    const media = post.media?.[index]
    if (!media) return
    const fail = (err) => {
      console.error(err)
      setError(err.code === 'permission-denied' ? '후보를 저장할 권한이 없어요. (Firestore 규칙이 아직 배포되지 않았어요)' : '후보 저장에 실패했어요. 인터넷 연결을 확인해 주세요.')
    }
    if (mine) {
      // 예전 형식 문서까지 같은 사진으로 묶여 있을 수 있으니 전부 지운다.
      Promise.all(mine.docIds.map((id) => deletePickDoc(judge, id))).catch(fail)
    } else {
      setPick(judge, post.id, mediaKeyOf(media), true, uid).catch(fail)
    }
  }

  function exportCsv() {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [['순위', '후보 수', '고른 선생님', '학년', '반', '이름', '장소', '사진 번호', '캡션', '좋아요', '게시물 주소', '사진 주소']]
    items.forEach((it, i) => {
      const p = it.post
      const pickers = pickersOf(p.id, it.index)
      const a = p.authorInfo || {}
      const len = (p.media || []).length
      rows.push([i + 1, pickers.length, pickers.join(', '), gradeLabel(a.grade), classLabel(a.class), a.name, locationOf(p), len > 1 ? `${it.index + 1}/${len}` : '', p.caption, p.likeCount || 0, `https://anchive.web.app/post/${p.id}`, p.media?.[it.index]?.url || ''])
    })
    const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `사진심사_합산_${new Date().toLocaleDateString('ko-KR').replace(/\.\s?/g, '-').replace(/-$/, '')}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const newCount = posts && initialIds ? posts.filter((p) => !initialIds.has(p.id)).length : 0
  const judgeCount = new Set([...photoPicks.values()].flatMap((e) => [...e.judges.keys()])).size

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>📸 사진 심사</h1>
          <span className="muted small">
            게시물 {posts ? posts.length : '…'}개{newCount > 0 && <b className="new-count"> · 새로 올라옴 {newCount}</b>}
          </span>
        </div>
        <nav className="tabs" aria-label="탭">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="tab-icon" aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
              {t.id === 'mine' && myTotal > 0 && <span className="tab-count">{myTotal}</span>}
            </button>
          ))}
        </nav>
        <button className="whoami" onClick={onChangeName} title="이름 바꾸기">
          {judge} <span className="muted">· 바꾸기</span>
        </button>
      </header>

      {error && (
        <div className="banner" role="alert">
          {error}
          <button className="icon-btn" onClick={() => setError('')} aria-label="알림 닫기">
            ✕
          </button>
        </div>
      )}

      <div className="filters">
        <select value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="장소">
          <option value="">모든 장소</option>
          {locationOptions.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="학년">
          <option value="">모든 학년</option>
          {grades.map((g) => (
            <option key={g} value={String(g)}>
              {gradeLabel(g)}
            </option>
          ))}
        </select>
        {tab === 'all' && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="후보 여부">
            <option value="">후보 여부 전체</option>
            <option value="unpicked">아직 안 고른 게시물</option>
            <option value="picked">후보가 있는 게시물</option>
          </select>
        )}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·캡션 검색" aria-label="검색" />
        {tab === 'total' && items.length > 0 && (
          <button className="ghost" onClick={exportCsv}>
            CSV 받기
          </button>
        )}
      </div>

      {tab === 'total' && (
        <p className="tab-note muted">
          선생님 {judgeCount}명이 고른 사진 {items.length}장 · 많이 고른 순
        </p>
      )}
      {tab === 'mine' && items.length > 0 && <p className="tab-note muted">내가 고른 사진 {items.length}장 · 고른 순서대로</p>}

      {!posts ? (
        <div className="center-page">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          {tab === 'mine' ? '아직 고른 후보가 없어요. 사진을 열어 ☆ 버튼을 눌러 보세요.' : tab === 'total' ? '아직 아무도 후보를 고르지 않았어요.' : '조건에 맞는 사진이 없어요.'}
        </div>
      ) : (
        <main className="grid">
          {items.map((it, i) => {
            const p = it.post
            const media = p.media?.[it.index]
            const len = p.media?.length || 0
            const isNew = initialIds && !initialIds.has(p.id)
            const myCount = myCountByPost.get(p.id) || 0
            const picked = tab === 'all' ? myCount > 0 : !!myPickOf(p.id, it.index)
            const pickers = tab === 'total' ? pickersOf(p.id, it.index) : []
            return (
              <button key={it.key} className={`card ${picked ? 'picked' : ''}`} onClick={() => openViewer(i)}>
                <div className="thumb">
                  {media?.type === 'video' ? <PostVideo media={media} mode="thumb" className="thumb-media" /> : media ? <img className="thumb-media" src={media.url} alt="" loading="lazy" /> : null}
                  {picked && <span className="badge star">⭐{tab === 'all' && len > 1 ? ` ${myCount}` : ''}</span>}
                  {isNew && <span className="badge new">NEW</span>}
                  {len > 1 && <span className="badge count">{tab === 'all' ? len : `${it.index + 1}/${len}`}</span>}
                  {tab === 'total' && <span className="badge votes">{pickers.length}명</span>}
                </div>
                <div className="card-meta">
                  <span className="card-author">{whoLabel(p.authorInfo)}</span>
                  <span className="card-sub">{tab === 'total' ? pickers.join(', ') : locationOf(p)}</span>
                </div>
              </button>
            )
          })}
        </main>
      )}

      {viewer && viewerPost && (
        <Viewer
          key={`${viewerItem.postId}#${viewerItem.index}#${viewer.at}`}
          post={viewerPost}
          startIndex={viewerItem.index}
          position={viewer.at + 1}
          total={viewer.items.length}
          locationName={locationOf(viewerPost)}
          isPicked={(index) => !!myPickOf(viewerPost.id, index)}
          // 서로 영향받지 않게, 다른 선생님이 고른 내역은 합산 탭에서만 보여준다.
          pickersOf={(index) => (tab === 'total' ? pickersOf(viewerPost.id, index) : [])}
          onTogglePick={(index) => togglePick(viewerPost, index)}
          onPrev={() => moveViewer(-1)}
          onNext={() => moveViewer(1)}
          onClose={closeViewer}
        />
      )}
    </div>
  )
}
