import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import { auth } from '../firebase'

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

  // 학생을 바꿔 입장할 때마다 새 익명 uid를 발급한다.
  // 같은 브라우저에서 uid를 그대로 쓰면 좋아요/댓글 소유권이 이전 학생과 섞이게 된다.
  async function switchIdentity(rosterEntry) {
    switchingRef.current = true
    try {
      await signOut(auth)
      const cred = await signInAnonymously(auth)
      setUid(cred.user.uid)
      setIsAnonymous(true)
    } finally {
      switchingRef.current = false
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rosterEntry))
    setIdentityState(rosterEntry)
  }

  function clearIdentity() {
    localStorage.removeItem(STORAGE_KEY)
    setIdentityState(null)
  }

  return (
    <IdentityContext.Provider
      value={{ uid, isAnonymous, authReady, identity, switchIdentity, clearIdentity }}
    >
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
