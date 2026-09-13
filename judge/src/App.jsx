import { useEffect, useMemo, useState } from 'react'
import { subscribeFeedByLocation } from '../../src/lib/posts'
import { subscribeLocations } from '../../src/lib/locations'
import { ETC_ID, ETC_NAME, locationIdForSpot } from '../../src/lib/campusRegions'
import { classLabel, compareGrade, gradeLabel, whoLabel } from '../../src/lib/identityLabel'
import PostVideo from '../../src/components/PostVideo'
import { normalizeJudgeName, useJudge } from './useJudge'
import { registerJudge, setPick, subscribeAllPicks, subscribeJudges } from './judgeData'
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
  const [viewer, setViewer] = useState(null) // { ids: 열 때의 목록, index }
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

  // postId -> [{ judge, pickedAt }]
  const picksByPost = useMemo(() => {
    const m = new Map()
    for (const pk of allPicks) {
      if (!m.has(pk.postId)) m.set(pk.postId, [])
      m.get(pk.postId).push(pk)
    }
    for (const list of m.values()) list.sort((a, b) => a.pickedAt - b.pickedAt)
    return m
  }, [allPicks])
  const myPicks = useMemo(
    () => new Map(allPicks.filter((pk) => pk.judge === judge).map((pk) => [pk.postId, pk.pickedAt])),
    [allPicks, judge]
  )

  const grades = useMemo(
    () => [...new Set((posts || []).map((p) => p.authorInfo?.grade).filter((g) => g != null && g !== ''))].sort(compareGrade),
    [posts]
  )
  const locationOptions = useMemo(
    () => [...new Set((posts || []).map((p) => locationNames[locationIdForSpot(p.spot)] || ETC_NAME))].sort((a, b) => a.localeCompare(b, 'ko')),
    [posts, locationNames]
  )

  const list = useMemo(() => {
    if (!posts) return []
    const query = q.trim().toLowerCase()
    let out = posts.filter((p) => {
      if (loc && (locationNames[locationIdForSpot(p.spot)] || ETC_NAME) !== loc) return false
      if (grade && String(p.authorInfo?.grade) !== grade) return false
      if (query && !`${whoLabel(p.authorInfo)} ${p.caption || ''}`.toLowerCase().includes(query)) return false
      return true
    })
    if (tab === 'all') {
      if (status === 'picked') out = out.filter((p) => myPicks.has(p.id))
      if (status === 'unpicked') out = out.filter((p) => !myPicks.has(p.id))
    } else if (tab === 'mine') {
      out = out.filter((p) => myPicks.has(p.id)).sort((a, b) => myPicks.get(a.id) - myPicks.get(b.id))
    } else {
      out = out
        .filter((p) => picksByPost.has(p.id))
        .sort((a, b) => picksByPost.get(b.id).length - picksByPost.get(a.id).length)
    }
    return out
  }, [posts, tab, loc, grade, status, q, myPicks, picksByPost, locationNames])

  // --- 뷰어: 열 때 목록을 고정해 둔다(내 후보 탭에서 후보를 빼도 목록이 흔들리지 않게).
  // 휴대폰 뒤로가기로 닫을 수 있게 열 때 history에 한 칸을 넣는다.
  function openViewer(index) {
    setViewer({ ids: list.map((p) => p.id), index })
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
    setViewer((v) => {
      if (!v) return v
      const index = Math.min(v.ids.length - 1, Math.max(0, v.index + delta))
      return { ...v, index }
    })
  }

  const viewerPost = viewer ? postsById.get(viewer.ids[viewer.index]) : null
  useEffect(() => {
    // 다음 게시물 첫 사진을 미리 받아 넘길 때 기다림을 줄인다.
    if (!viewer) return
    const next = postsById.get(viewer.ids[viewer.index + 1])?.media?.[0]
    if (next?.type !== 'video' && next?.url) new Image().src = next.url
  }, [viewer, postsById])

  function togglePick(postId) {
    const picked = myPicks.has(postId)
    setPick(judge, postId, !picked, uid).catch((err) => {
      console.error(err)
      setError(err.code === 'permission-denied' ? '후보를 저장할 권한이 없어요. (Firestore 규칙이 아직 배포되지 않았어요)' : '후보 저장에 실패했어요. 인터넷 연결을 확인해 주세요.')
    })
  }

  function exportCsv() {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [['순위', '후보 수', '고른 선생님', '학년', '반', '이름', '장소', '캡션', '좋아요', '사진 수', '게시물 주소']]
    list.forEach((p, i) => {
      const pickers = (picksByPost.get(p.id) || []).map((pk) => pk.judge)
      const a = p.authorInfo || {}
      rows.push([i + 1, pickers.length, pickers.join(', '), gradeLabel(a.grade), classLabel(a.class), a.name, locationOf(p), p.caption, p.likeCount || 0, (p.media || []).length, `https://anchive.web.app/post/${p.id}`])
    })
    const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `사진심사_합산_${new Date().toLocaleDateString('ko-KR').replace(/\.\s?/g, '-').replace(/-$/, '')}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const newCount = posts && initialIds ? posts.filter((p) => !initialIds.has(p.id)).length : 0
  const judgeCount = new Set(allPicks.map((pk) => pk.judge)).size

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
              {t.id === 'mine' && myPicks.size > 0 && <span className="tab-count">{myPicks.size}</span>}
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
            <option value="unpicked">아직 안 고른 것</option>
            <option value="picked">내가 고른 것</option>
          </select>
        )}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·캡션 검색" aria-label="검색" />
        {tab === 'total' && list.length > 0 && (
          <button className="ghost" onClick={exportCsv}>
            CSV 받기
          </button>
        )}
      </div>

      {tab === 'total' && (
        <p className="tab-note muted">
          선생님 {judgeCount}명이 고른 후보 {list.length}개 · 많이 고른 순
        </p>
      )}
      {tab === 'mine' && list.length > 0 && <p className="tab-note muted">내가 고른 순서대로 보여요</p>}

      {!posts ? (
        <div className="center-page">불러오는 중…</div>
      ) : list.length === 0 ? (
        <div className="empty">
          {tab === 'mine' ? '아직 고른 후보가 없어요. 사진을 열어 ☆ 버튼을 눌러 보세요.' : tab === 'total' ? '아직 아무도 후보를 고르지 않았어요.' : '조건에 맞는 사진이 없어요.'}
        </div>
      ) : (
        <main className="grid">
          {list.map((p, i) => {
            const first = p.media?.[0]
            const pickers = picksByPost.get(p.id) || []
            const isNew = initialIds && !initialIds.has(p.id)
            return (
              <button key={p.id} className={`card ${myPicks.has(p.id) ? 'picked' : ''}`} onClick={() => openViewer(i)}>
                <div className="thumb">
                  {first?.type === 'video' ? <PostVideo media={first} mode="thumb" className="thumb-media" /> : first ? <img className="thumb-media" src={first.url} alt="" loading="lazy" /> : null}
                  {myPicks.has(p.id) && <span className="badge star">⭐</span>}
                  {isNew && <span className="badge new">NEW</span>}
                  {p.media?.length > 1 && <span className="badge count">{p.media.length}</span>}
                  {tab === 'total' && <span className="badge votes">{pickers.length}명</span>}
                </div>
                <div className="card-meta">
                  <span className="card-author">{whoLabel(p.authorInfo)}</span>
                  <span className="card-sub">{tab === 'total' ? pickers.map((pk) => pk.judge).join(', ') : locationOf(p)}</span>
                </div>
              </button>
            )
          })}
        </main>
      )}

      {viewer && viewerPost && (
        <Viewer
          key={viewerPost.id}
          post={viewerPost}
          position={viewer.index + 1}
          total={viewer.ids.length}
          locationName={locationOf(viewerPost)}
          picked={myPicks.has(viewerPost.id)}
          // 서로 영향받지 않게, 다른 선생님이 고른 내역은 합산 탭에서만 보여준다.
          pickers={tab === 'total' ? (picksByPost.get(viewerPost.id) || []).map((pk) => pk.judge) : []}
          onTogglePick={() => togglePick(viewerPost.id)}
          onPrev={() => moveViewer(-1)}
          onNext={() => moveViewer(1)}
          onClose={closeViewer}
        />
      )}
    </div>
  )
}
