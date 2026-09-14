import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { loadRoster } from './roster'
import { normalizeIdentity, sameStudent } from './identityMigration'

const STORAGE_KEY = 'anchive_identity'

const IdentityContext = createContext(null)

function loadIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.grade || !parsed.class || !parsed.name) {
      throw new Error('invalid identity shape')
    }
    return parsed
  } catch (err) {
    console.error('저장된 신원 정보가 손상되어 초기화합니다', err)
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function IdentityProvider({ children }) {
  const [uid, setUid] = useState(null)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [identity, setIdentityState] = useState(loadIdentity)
  const [authReady, setAuthReady] = useState(false)
  const switchingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadRoster().then((roster) => {
      if (cancelled || switchingRef.current) return
      setIdentityState((current) => normalizeIdentity(current, roster))
    }).catch((err) => console.error('번호 정정 정보 조회 실패', err))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (identity) localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  }, [identity])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
        setIsAnonymous(user.isAnonymous)
        setAuthReady(true)
      } else if (!switchingRef.current) {
        signInAnonymously(auth).catch((err) => {
          console.error('익명 로그인 실패', err)
        })
      }
    })
    return unsub
  }, [])

  // 다른 학생으로 바뀔 때만 새 익명 uid를 발급한다.
  // 같은 브라우저에서 uid를 그대로 쓰면 좋아요/댓글 소유권이 이전 학생과 섞이므로 그건 막아야 하지만,
  // 같은 학생이 자기 이름을 다시 고른 경우까지 uid를 바꾸면 방금 올린 글도 자기가 못 지우게 된다.
  // 관리자(비익명) 세션에서는 절대 uid를 유지하지 않는다 — 그대로 두면 학생이 관리자 권한을 이어받는다.
  async function switchIdentity(rosterEntry) {
    // 열린 화면의 명단이 오래됐어도 최신 정정 이력으로 양쪽을 비교한다.
    // 조회 실패 시 계정을 교체하지 않고 호출자가 재시도를 안내한다.
    const roster = await loadRoster({ refresh: true })
    const nextIdentity = normalizeIdentity(rosterEntry, roster)
    const keepUid = sameStudent(normalizeIdentity(identity, roster), nextIdentity) && auth.currentUser?.isAnonymous === true
    if (!keepUid) {
      switchingRef.current = true
      try {
        await signOut(auth)
        const cred = await signInAnonymously(auth)
        setUid(cred.user.uid)
        setIsAnonymous(true)
      } finally {
        switchingRef.current = false
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdentity))
    setIdentityState(nextIdentity)
  }

  return (
    <IdentityContext.Provider value={{ uid, isAnonymous, authReady, identity, switchIdentity }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
